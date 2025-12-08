import { syncQueueQueries, SyncQueueItem } from './database';
import { getApiBaseUrl } from './apiService';

// Dynamic import NetInfo to handle module resolution issues
let NetInfo: any = null;

const getNetInfo = () => {
  if (NetInfo) {
    return NetInfo;
  }
  
  try {
    const NetInfoModule = require('@react-native-community/netinfo');
    NetInfo = NetInfoModule.default || NetInfoModule;
    return NetInfo;
  } catch (error) {
    console.warn('NetInfo not available, using fallback:', error);
    // Fallback для випадку коли NetInfo не доступний
    NetInfo = {
      fetch: async () => ({ isConnected: true }),
      addEventListener: () => () => {},
    };
    return NetInfo;
  }
};

interface DeliveryApiPayload {
  address: string;
}

class SyncService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private syncListeners: Set<(isOnline: boolean) => void> = new Set();
  private unsubscribeNetInfo: (() => void) | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Ініціалізація сервісу синхронізації
   */
  async initialize(): Promise<void> {
    const NetInfoInstance = getNetInfo();
    
    // Перевірити поточний стан інтернету
    const state = await NetInfoInstance.fetch();
    this.isOnline = state.isConnected ?? false;
    console.log(`🌐 Initial network state: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);

    // Підписатися на зміни стану інтернету
    this.unsubscribeNetInfo = NetInfoInstance.addEventListener((state) => {
      this.handleNetworkStateChange(state.isConnected ?? false);
    });

    // Додати періодичну перевірку стану інтернету (кожні 5 секунд)
    // Це допомагає виявити зміни, які могли пропустити addEventListener
    this.checkInterval = setInterval(async () => {
      try {
        const currentState = await NetInfoInstance.fetch();
        const currentIsConnected = currentState.isConnected ?? false;
        if (currentIsConnected !== this.isOnline) {
          console.log(`🔄 Periodic check detected network change: ${currentIsConnected ? 'ONLINE' : 'OFFLINE'}`);
          this.handleNetworkStateChange(currentIsConnected);
        }
      } catch (error) {
        // Ignore errors in periodic check
      }
    }, 5000);

    // Синхронізувати при старті якщо є інтернет
    if (this.isOnline) {
      this.syncPendingItems().catch((error) => {
        console.warn('Error during initial sync:', error);
      });
    }

    // Очистити старі синхронізовані записи
    syncQueueQueries.cleanOldSyncedItems();
  }

  /**
   * Обробка зміни стану інтернету
   */
  private handleNetworkStateChange(newState: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = newState;

    if (wasOnline !== this.isOnline) {
      console.log(`🌐 Network state changed: ${this.isOnline ? 'ONLINE' : 'OFFLINE'} (was: ${wasOnline ? 'ONLINE' : 'OFFLINE'})`);
      
      // Сповістити всіх слухачів
      this.syncListeners.forEach((listener) => listener(this.isOnline));

      // Якщо інтернет з'явився, запустити синхронізацію
      if (this.isOnline && !wasOnline) {
        console.log('🔄 Internet restored, starting sync in 2 seconds...');
        // Невелика затримка щоб переконатися що інтернет стабільний
        setTimeout(() => {
          this.syncPendingItems().catch((error) => {
            console.warn('Error during auto-sync:', error);
          });
        }, 2000);
      }
    }
  }

  /**
   * Зупинити сервіс (для cleanup)
   */
  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Перевірити чи є інтернет
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Підписатися на зміни стану інтернету
   */
  subscribe(listener: (isOnline: boolean) => void): () => void {
    this.syncListeners.add(listener);
    // Повернути функцію для відписки
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  /**
   * Додати адресу в чергу синхронізації
   */
  async addToQueue(address: string, deliveryId?: string): Promise<void> {
    syncQueueQueries.addToQueue(address, deliveryId);
  }

  /**
   * Синхронізувати всі записи з черги
   */
  async syncPendingItems(): Promise<void> {
    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    if (!this.isOnline) {
      console.log('📴 No internet connection, skipping sync');
      return;
    }

    this.syncInProgress = true;

    try {
      const pendingItems = syncQueueQueries.getPendingItems();
      
      if (pendingItems.length === 0) {
        console.log('✅ No pending items to sync');
        this.syncInProgress = false;
        return;
      }

      console.log(`🔄 Syncing ${pendingItems.length} pending items...`);

      const apiUrl = getApiBaseUrl();
      let successCount = 0;
      let failCount = 0;

      for (const item of pendingItems) {
        try {
          // Перевірити інтернет перед кожною спробою
          const NetInfoInstance = getNetInfo();
          const state = await NetInfoInstance.fetch();
          if (!state.isConnected) {
            console.log('📴 Internet lost during sync, stopping...');
            this.isOnline = false;
            break;
          }

          // Перевірити чи є delivery і чи адреса актуальна
          let addressToSend = item.address;
          
          // Якщо є deliveryId, перевірити чи адреса в delivery актуальніша
          if (item.deliveryId) {
            try {
              const { deliveryQueries } = require('./database');
              const delivery = deliveryQueries.getDeliveryById(item.deliveryId);
              
              if (delivery) {
                // Використовуємо адресу з delivery якщо вона є і актуальніша
                const deliveryAddress = delivery.address || delivery.currentLocation || '';
                
                if (deliveryAddress && deliveryAddress.trim() !== '') {
                  // Якщо адреса в delivery відрізняється від sync_queue, оновлюємо
                  if (deliveryAddress.trim() !== item.address.trim()) {
                    console.log(`🔄 Updating address in sync queue from delivery: "${item.address}" → "${deliveryAddress}"`);
                    addressToSend = deliveryAddress.trim();
                    // Оновити адресу в sync_queue
                    const { syncQueueQueries } = require('./database');
                    syncQueueQueries.updateAddress(item.id, addressToSend);
                  }
                }
              }
            } catch (error) {
              console.warn('Error checking delivery for address update:', error);
              // Продовжуємо з адресою з sync_queue
            }
          }

          // Перевірити чи адреса не порожня
          if (!addressToSend || addressToSend.trim() === '') {
            console.warn(`⚠️ Empty address in sync queue item ${item.id}, skipping...`);
            // Позначити як синхронізований щоб не повторювати
            syncQueueQueries.markAsSynced(item.id);
            continue;
          }

          const payload: DeliveryApiPayload = {
            address: addressToSend,
          };

          // Створюємо AbortController для таймауту (fallback для старіших версій)
          let abortController: AbortController | null = null;
          let timeoutId: NodeJS.Timeout | null = null;
          
          try {
            abortController = new AbortController();
            timeoutId = setTimeout(() => {
              abortController?.abort();
            }, 10000); // 10 секунд таймаут
          } catch (e) {
            // Якщо AbortController не підтримується, продовжуємо без таймауту
            console.warn('AbortController not available, continuing without timeout');
          }

          const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          };

          if (abortController) {
            fetchOptions.signal = abortController.signal;
          }

          const response = await fetch(`${apiUrl}/delivery`, fetchOptions);

          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
          }

          // Позначити як синхронізований
          syncQueueQueries.markAsSynced(item.id);
          successCount++;
          console.log(`✅ Synced item ${item.id}: ${item.address}`);
        } catch (error: any) {
          failCount++;
          const errorMessage = error.message || 'Unknown error';
          syncQueueQueries.updateRetry(item.id, errorMessage);
          console.warn(`⚠️ Failed to sync item ${item.id}:`, errorMessage);

          // Якщо помилка мережі, перевірити стан інтернету
          if (error.name === 'AbortError' || error.message?.includes('network') || error.message?.includes('fetch')) {
            console.log('📴 Network error detected, checking connection...');
            try {
              const NetInfoInstance = getNetInfo();
              const checkState = await NetInfoInstance.fetch();
              if (!checkState.isConnected) {
                console.log('📴 Confirmed: No internet connection, stopping sync...');
                this.isOnline = false;
                break;
              } else {
                console.log('🔄 Internet still available, continuing sync...');
              }
            } catch (checkError) {
              console.warn('Error checking network state:', checkError);
            }
          }

          // Якщо занадто багато спроб (більше 5), пропустити цей запис
          if (item.retryCount >= 5) {
            console.warn(`⚠️ Item ${item.id} exceeded max retries, marking as failed`);
            syncQueueQueries.markAsSynced(item.id); // Позначити як синхронізований щоб не повторювати
          }
        }
      }

      console.log(`✅ Sync completed: ${successCount} succeeded, ${failCount} failed`);
    } catch (error: any) {
      console.error('❌ Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Отримати статистику черги
   */
  getQueueStats(): { pending: number; total: number } {
    const pendingItems = syncQueueQueries.getPendingItems();
    return {
      pending: pendingItems.length,
      total: pendingItems.length, // Можна розширити якщо потрібна загальна кількість
    };
  }

  /**
   * Примусово перевірити стан інтернету та синхронізувати
   */
  async forceCheckAndSync(): Promise<void> {
    try {
      const NetInfoInstance = getNetInfo();
      const state = await NetInfoInstance.fetch();
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      console.log(`🔍 Force check: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
      
      if (this.isOnline !== wasOnline) {
        this.handleNetworkStateChange(this.isOnline);
      }
      
      if (this.isOnline) {
        await this.syncPendingItems();
      }
    } catch (error) {
      console.error('Error in forceCheckAndSync:', error);
    }
  }
}

export const syncService = new SyncService();


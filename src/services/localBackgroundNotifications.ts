import { Delivery, DeliveryStatus } from '../types/delivery';
import { storageService } from './storage';
import { deliveryService } from './deliveryService';
import { settingsService } from './settings';

// Локальний сервіс для генерації push-сповіщень у фоновому режимі
// Працює навіть коли програма закрита, без залежності від Firebase сервера
class LocalBackgroundNotificationService {
  private initialized = false;
  private backgroundTaskInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 10000; // Перевіряти кожні 10 секунд

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Перевірити дозволи на сповіщення
      const PushNotification = require('react-native-push-notification').default;
      
      // Створити канал для Android
      if (PushNotification && typeof PushNotification.createChannel === 'function') {
        PushNotification.createChannel(
          {
            channelId: 'delivery-tracker-background-channel',
            channelName: 'Delivery Tracker Background',
            channelDescription: 'Background notifications for delivery updates',
            playSound: true,
            soundName: 'default',
            importance: 4, // High importance - показує навіть коли додаток закритий
            vibrate: true,
            vibration: 300,
          },
          (created: boolean) => {
            console.log(`✅ Background notification channel ${created ? 'created' : 'already exists'}`);
          },
        );
      }

      this.initialized = true;
      console.log('✅ Local background notification service initialized');
    } catch (error) {
      console.warn('Error initializing local background notification service:', error);
      this.initialized = false;
    }
  }

  // Головна функція для обробки background повідомлень
  // Викликається через messaging().setBackgroundMessageHandler
  async handleBackgroundMessage(remoteMessage: any) {
    console.log('📬 Local background message handler called:', remoteMessage);
    
    try {
      // Перевірити налаштування
      const settings = await settingsService.getSettings();
      if (!settings.notificationsEnabled) {
        console.log('Notifications disabled, skipping background processing...');
        return;
      }

      // Обробити оновлення доставок та показати сповіщення
      await this.processDeliveryUpdatesAndNotify();
    } catch (error) {
      console.warn('Error in local background handler:', error);
    }
  }

  // Запланувати сповіщення для доставок (працює навіть коли додаток закритий)
  async scheduleNotificationsForDeliveries() {
    try {
      const deliveries = await storageService.getDeliveries();
      const now = Date.now();

      for (const delivery of deliveries) {
        try {
          // Пропустити завершені доставки
          if (delivery.status === 'delivered' || delivery.status === 'cancelled') {
            continue;
          }

          const timeSinceCreation = now - delivery.createdAt;
          const currentIndex = ['pending', 'confirmed', 'in_transit', 'out_for_delivery', 'delivered'].indexOf(
            delivery.status,
          );

          if (currentIndex === -1 || currentIndex >= 4) {
            continue;
          }

          // Запланувати сповіщення для наступних етапів
          const STAGE_DURATION = 30 * 1000; // 30 секунд на кожен етап
          const locations = [
            'Київ, склад',
            'Київ, сортувальний центр',
            'Київ, відділення №15',
            'Київ, в дорозі до вас',
          ];

          // Запланувати сповіщення для кожного наступного етапу
          for (let i = currentIndex + 1; i < 4; i++) {
            const expectedTime = (i + 1) * STAGE_DURATION;
            const scheduledTime = delivery.createdAt + expectedTime;
            
            if (scheduledTime > now) {
              const nextStatus = ['pending', 'confirmed', 'in_transit', 'out_for_delivery', 'delivered'][i] as DeliveryStatus;
              const location = locations[i - 1];

              await this.scheduleNotificationForDelivery(
                delivery,
                nextStatus,
                location,
                scheduledTime,
              );
            }
          }
        } catch (deliveryError) {
          console.warn('Error scheduling notification for delivery:', deliveryError);
        }
      }
    } catch (error) {
      console.warn('Error in scheduleNotificationsForDeliveries:', error);
    }
  }

  // Запланувати одне сповіщення для доставки
  private async scheduleNotificationForDelivery(
    delivery: Delivery,
    status: DeliveryStatus,
    location: string | undefined,
    scheduledTime: number,
  ) {
    try {
      const settings = await settingsService.getSettings();
      if (!settings.notificationsEnabled) {
        return;
      }

      const PushNotification = require('react-native-push-notification').default;

      const statusMessages: Record<DeliveryStatus, string> = {
        pending: 'Ваше замовлення підтверджено',
        confirmed: 'Замовлення підтверджено',
        in_transit: location?.includes('відділення')
          ? `📦 Замовлення прибуло до відділення: ${location}`
          : 'Замовлення в дорозі',
        out_for_delivery: "Кур'єр везе ваше замовлення",
        delivered: '✅ Замовлення доставлено! Можете забрати у відділенні.',
        cancelled: 'Замовлення скасовано',
      };

      const message = statusMessages[status] || 'Оновлення статусу доставки';
      
      let title: string;
      if (status === 'delivered') {
        title = '🎉 Доставка завершена!';
      } else if (status === 'in_transit' && location?.includes('відділення')) {
        title = '📦 Замовлення прибуло!';
      } else {
        title = `Доставка #${delivery.trackingNumber}`;
      }

      // Створити канал перед плануванням
      if (PushNotification && typeof PushNotification.createChannel === 'function') {
        PushNotification.createChannel(
          {
            channelId: 'delivery-tracker-background-channel',
            channelName: 'Delivery Tracker Background',
            channelDescription: 'Background notifications for delivery updates',
            playSound: settings.soundEnabled,
            soundName: settings.soundEnabled ? 'default' : undefined,
            importance: 4,
            vibrate: settings.soundEnabled,
            vibration: settings.soundEnabled ? 300 : 0,
          },
          () => {
            // Запланувати сповіщення
            const notificationId = parseInt(
              delivery.id.replace(/\D/g, '').slice(-9) || Math.random().toString().slice(2, 9),
              10,
            ) || Math.floor(Math.random() * 1000000);

            PushNotification.localNotificationSchedule({
              id: notificationId + status.length, // Унікальний ID для кожного статусу
              channelId: 'delivery-tracker-background-channel',
              title,
              message,
              date: new Date(scheduledTime),
              playSound: settings.soundEnabled,
              soundName: settings.soundEnabled ? 'default' : undefined,
              vibrate: settings.soundEnabled,
              vibration: settings.soundEnabled ? 300 : undefined,
              priority: 'high',
              importance: 'high',
              userInfo: {
                deliveryId: delivery.id,
                trackingNumber: delivery.trackingNumber,
                status: status,
                location: location,
              },
            });

            console.log(`✅ Scheduled background notification: ${title} at ${new Date(scheduledTime).toLocaleString()}`);
          },
        );
      }
    } catch (error) {
      console.warn('Error scheduling notification for delivery:', error);
    }
  }

  // Перевірити статуси доставок та показати сповіщення
  async processDeliveryUpdatesAndNotify() {
    try {
      const deliveries = await storageService.getDeliveries();
      const now = Date.now();

      for (const delivery of deliveries) {
        try {
          // Пропустити завершені доставки
          if (delivery.status === 'delivered' || delivery.status === 'cancelled') {
            continue;
          }

          const timeSinceCreation = now - delivery.createdAt;
          const currentIndex = ['pending', 'confirmed', 'in_transit', 'out_for_delivery', 'delivered'].indexOf(
            delivery.status,
          );

          if (currentIndex === -1) {
            continue;
          }

          // Перевірити чи потрібно оновити статус
          const STAGE_DURATION = 30 * 1000; // 30 секунд на кожен етап
          const expectedTimeForNextStage = (currentIndex + 1) * STAGE_DURATION;

          if (timeSinceCreation >= expectedTimeForNextStage && currentIndex < 4) {
            const nextStatus = ['pending', 'confirmed', 'in_transit', 'out_for_delivery', 'delivered'][
              currentIndex + 1
            ] as DeliveryStatus;

            const locations = [
              'Київ, склад',
              'Київ, сортувальний центр',
              'Київ, відділення №15',
              'Київ, в дорозі до вас',
            ];

            // Оновити статус доставки
            await deliveryService.updateDeliveryStatus(
              delivery.id,
              nextStatus,
              locations[currentIndex] || undefined,
            );

            // Показати сповіщення про оновлення
            await this.showLocalNotification(delivery.id, nextStatus, locations[currentIndex]);
          }
        } catch (deliveryError) {
          // Продовжити обробку інших доставок навіть якщо одна не вдалася
          console.warn('Error processing delivery update:', deliveryError?.message || deliveryError);
        }
      }
    } catch (error) {
      console.warn('Error in processDeliveryUpdatesAndNotify:', error?.message || error);
    }
  }

  // Показати локальне сповіщення
  private async showLocalNotification(
    deliveryId: string,
    status: DeliveryStatus,
    location?: string,
  ) {
    try {
      const delivery = await storageService.getDelivery(deliveryId);
      if (!delivery) {
        return;
      }

      const settings = await settingsService.getSettings();
      if (!settings.notificationsEnabled) {
        return;
      }

      const PushNotification = require('react-native-push-notification').default;

      const statusMessages: Record<DeliveryStatus, string> = {
        pending: 'Ваше замовлення підтверджено',
        confirmed: 'Замовлення підтверджено',
        in_transit: location?.includes('відділення')
          ? `📦 Замовлення прибуло до відділення: ${location}`
          : 'Замовлення в дорозі',
        out_for_delivery: "Кур'єр везе ваше замовлення",
        delivered: '✅ Замовлення доставлено! Можете забрати у відділенні.',
        cancelled: 'Замовлення скасовано',
      };

      const message = statusMessages[status] || 'Оновлення статусу доставки';
      
      let title: string;
      if (status === 'delivered') {
        title = '🎉 Доставка завершена!';
      } else if (status === 'in_transit' && location?.includes('відділення')) {
        title = '📦 Замовлення прибуло!';
      } else {
        title = `Доставка #${delivery.trackingNumber}`;
      }

      // Створити канал перед показом
      if (PushNotification && typeof PushNotification.createChannel === 'function') {
        PushNotification.createChannel(
          {
            channelId: 'delivery-tracker-background-channel',
            channelName: 'Delivery Tracker Background',
            channelDescription: 'Background notifications for delivery updates',
            playSound: settings.soundEnabled,
            soundName: settings.soundEnabled ? 'default' : undefined,
            importance: 4,
            vibrate: settings.soundEnabled,
            vibration: settings.soundEnabled ? 300 : 0,
          },
          () => {
            // Показати сповіщення
            const notificationId = Math.floor(Math.random() * 1000000);
            PushNotification.localNotification({
              id: notificationId,
              channelId: 'delivery-tracker-background-channel',
              title,
              message,
              playSound: settings.soundEnabled,
              soundName: settings.soundEnabled ? 'default' : undefined,
              vibrate: settings.soundEnabled,
              vibration: settings.soundEnabled ? 300 : undefined,
              priority: 'high',
              importance: 'high',
              ongoing: false,
              autoCancel: true,
              userInfo: {
                deliveryId: delivery.id,
                trackingNumber: delivery.trackingNumber,
                status: status,
              },
            });

            console.log(`✅ Background notification sent: ${title} - ${message}`);
          },
        );
      } else {
        // Якщо createChannel недоступний, спробувати показати без нього
        const notificationId = Math.floor(Math.random() * 1000000);
        PushNotification.localNotification({
          id: notificationId,
          title,
          message,
          playSound: settings.soundEnabled,
          soundName: settings.soundEnabled ? 'default' : undefined,
          vibrate: settings.soundEnabled,
          vibration: settings.soundEnabled ? 300 : undefined,
          priority: 'high',
          importance: 'high',
          userInfo: {
            deliveryId: delivery.id,
            trackingNumber: delivery.trackingNumber,
            status: status,
          },
        });
      }
    } catch (error) {
      console.warn('Error showing local background notification:', error);
    }
  }

  // Запустити періодичну перевірку (для тестування, коли додаток на передньому плані)
  startPeriodicCheck() {
    if (this.backgroundTaskInterval) {
      return;
    }

    // Спочатку запланувати всі сповіщення для існуючих доставок
    this.scheduleNotificationsForDeliveries().catch((error) => {
      console.warn('Error scheduling initial notifications:', error);
    });

    // Потім запустити періодичну перевірку
    this.backgroundTaskInterval = setInterval(() => {
      // Перевірити та оновити статуси
      this.processDeliveryUpdatesAndNotify().catch((error) => {
        console.warn('Error in periodic check:', error);
      });
      
      // Перепланувати сповіщення для нових доставок
      this.scheduleNotificationsForDeliveries().catch((error) => {
        console.warn('Error rescheduling notifications:', error);
      });
    }, this.CHECK_INTERVAL);

    console.log('✅ Started periodic background check');
  }

  // Зупинити періодичну перевірку
  stopPeriodicCheck() {
    if (this.backgroundTaskInterval) {
      clearInterval(this.backgroundTaskInterval);
      this.backgroundTaskInterval = null;
      console.log('✅ Stopped periodic background check');
    }
  }
}

// Lazy initialization
let localBackgroundNotificationServiceInstance: LocalBackgroundNotificationService | null = null;

export const localBackgroundNotificationService = {
  getInstance(): LocalBackgroundNotificationService {
    if (!localBackgroundNotificationServiceInstance) {
      try {
        localBackgroundNotificationServiceInstance = new LocalBackgroundNotificationService();
      } catch (error) {
        console.error('Failed to create LocalBackgroundNotificationService:', error);
        // Return a dummy service
        return {
          initialize: async () => {},
          handleBackgroundMessage: async () => {},
          processDeliveryUpdatesAndNotify: async () => {},
          startPeriodicCheck: () => {},
          stopPeriodicCheck: () => {},
        } as any;
      }
    }
    return localBackgroundNotificationServiceInstance;
  },
  async initialize() {
    return this.getInstance().initialize();
  },
  async handleBackgroundMessage(remoteMessage: any) {
    return this.getInstance().handleBackgroundMessage(remoteMessage);
  },
  async processDeliveryUpdatesAndNotify() {
    return this.getInstance().processDeliveryUpdatesAndNotify();
  },
  async scheduleNotificationsForDeliveries() {
    return this.getInstance().scheduleNotificationsForDeliveries();
  },
  startPeriodicCheck() {
    return this.getInstance().startPeriodicCheck();
  },
  stopPeriodicCheck() {
    return this.getInstance().stopPeriodicCheck();
  },
};


import {
  Delivery,
  DeliveryHistoryItem,
} from '../types/delivery';
import {
  deliveryQueries,
  historyQueries,
  initDatabase,
} from './database';

// Ініціалізувати базу даних при імпорті
initDatabase();

export const storageService = {
  // Save delivery
  async saveDelivery(delivery: Delivery): Promise<void> {
    try {
      deliveryQueries.saveDelivery(delivery);
      
      // Якщо доставка "delivered" і адреса оновлена, оновити sync_queue
      if (delivery.status === 'delivered' && (delivery.address || delivery.currentLocation)) {
        try {
          const { syncQueueQueries } = require('./database');
          const addressToSend = delivery.address || delivery.currentLocation || '';
          
          if (addressToSend && addressToSend.trim() !== '') {
            // Знайти запис в sync_queue для цього deliveryId
            const pendingItems = syncQueueQueries.getPendingItems();
            const existingItem = pendingItems.find(item => item.deliveryId === delivery.id);
            
            if (existingItem) {
              // Оновити адресу в sync_queue якщо вона змінилася
              if (existingItem.address.trim() !== addressToSend.trim()) {
                syncQueueQueries.updateAddress(existingItem.id, addressToSend.trim());
                console.log(`🔄 Updated address in sync_queue for delivery ${delivery.id}: "${addressToSend}"`);
              }
            } else {
              // Якщо запису немає, додати новий (на випадок якщо не було інтернету)
              const { syncService } = require('./syncService');
              if (!syncService.isConnected()) {
                await syncService.addToQueue(addressToSend.trim(), delivery.id);
                console.log(`📥 Added address to sync_queue for delivery ${delivery.id}`);
              }
            }
          }
        } catch (error) {
          // Не критично, просто логуємо
          console.warn('Error updating sync_queue:', error);
        }
      }
    } catch (error) {
      console.error('Error saving delivery:', error);
      throw error;
    }
  },

  // Get all deliveries
  async getDeliveries(): Promise<Delivery[]> {
    try {
      return deliveryQueries.getAllDeliveries();
    } catch (error) {
      console.error('Error getting deliveries:', error);
      return [];
    }
  },

  // Get delivery by ID
  async getDelivery(id: string): Promise<Delivery | null> {
    try {
      return deliveryQueries.getDeliveryById(id);
    } catch (error) {
      console.error('Error getting delivery:', error);
      return null;
    }
  },

  // Get delivery by tracking number
  async getDeliveryByTracking(
    trackingNumber: string,
  ): Promise<Delivery | null> {
    try {
      return deliveryQueries.getDeliveryByTracking(trackingNumber);
    } catch (error) {
      console.error('Error getting delivery by tracking:', error);
      return null;
    }
  },

  // Add history item
  async addHistoryItem(item: DeliveryHistoryItem): Promise<void> {
    try {
      historyQueries.addHistoryItem(item);
    } catch (error) {
      console.error('Error adding history item:', error);
      throw error;
    }
  },

  // Get history for a delivery
  async getHistory(deliveryId?: string): Promise<DeliveryHistoryItem[]> {
    try {
      return historyQueries.getHistory(deliveryId);
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  },

  // Delete delivery
  async deleteDelivery(id: string): Promise<void> {
    try {
      deliveryQueries.deleteDelivery(id);
    } catch (error) {
      console.error('Error deleting delivery:', error);
      throw error;
    }
  },

  // Clear all data
  async clearAll(): Promise<void> {
    try {
      const { clearAll } = require('./database');
      clearAll();
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  },
};

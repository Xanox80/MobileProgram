import {
  Delivery,
  DeliveryStatus,
  DeliveryHistoryItem,
} from '../types/delivery';
import { storageService } from './storage';
import { notificationService } from './notifications';
import { sendDeliveryToApi } from './apiService';

const STATUS_PROGRESSION: DeliveryStatus[] = [
  'pending',
  'confirmed',
  'in_transit',
  'out_for_delivery',
  'delivered',
];

const activeTimers: Map<string, number[]> = new Map();

const STAGE_DURATION = 30 * 1000;

const LOCATIONS = [
  'Київ, склад',
  'Київ, сортувальний центр',
  'Київ, відділення №15',
  'Київ, в дорозі до вас',
];

export const deliveryService = {
  async startAutoProgress(deliveryId: string): Promise<void> {
    this.stopAutoProgress(deliveryId);

    const delivery = await storageService.getDelivery(deliveryId);
    if (
      !delivery ||
      delivery.status === 'delivered' ||
      delivery.status === 'cancelled'
    ) {
      return;
    }

    const timers: number[] = [];
    const currentIndex = STATUS_PROGRESSION.indexOf(delivery.status);
    const timeSinceCreation = Date.now() - delivery.createdAt;

    STATUS_PROGRESSION.slice(currentIndex + 1).forEach(
      (status, relativeIndex) => {
        const absoluteIndex = currentIndex + relativeIndex + 1;
        const expectedTime = absoluteIndex * STAGE_DURATION;
        const delay = Math.max(0, expectedTime - timeSinceCreation);
        const location = LOCATIONS[absoluteIndex - 1];

        if (delay > 0) {
          const scheduledTime = delivery.createdAt + expectedTime;

          if (status === 'in_transit' && location?.includes('відділення')) {
            notificationService.scheduleArrivalNotification(
              {
                ...delivery,
                status: 'in_transit',
                currentLocation: location,
              },
              scheduledTime,
            );
          }

          const timer = setTimeout(async () => {
            const currentDelivery = await storageService.getDelivery(
              deliveryId,
            );
            if (
              !currentDelivery ||
              currentDelivery.status === 'delivered' ||
              currentDelivery.status === 'cancelled'
            ) {
              return;
            }

            await this.updateDeliveryStatus(deliveryId, status, location);
          }, delay);

          timers.push(timer);
        }
      },
    );

    activeTimers.set(deliveryId, timers);
  },

  stopAutoProgress(deliveryId: string): void {
    const timers = activeTimers.get(deliveryId);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
      activeTimers.delete(deliveryId);
    }
  },

  async createDelivery(trackingNumber: string): Promise<Delivery> {
    const existing = await storageService.getDeliveryByTracking(trackingNumber);
    if (existing) {
      return existing;
    }

    const delivery: Delivery = {
      id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trackingNumber,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      estimatedDelivery: Date.now() + 2 * 60 * 1000, // 2 minutes from now
    };

    await storageService.saveDelivery(delivery);
    await this.addHistoryEntry(delivery.id, 'pending', 'Замовлення створено');
    notificationService.showDeliveryUpdate(delivery);

    // Запланувати сповіщення про час перекусити через notifee
    try {
      const { notifeeNotificationService } = require('./notifeeNotificationService');
      await notifeeNotificationService.scheduleSnackTimeReminder(delivery);
    } catch (error) {
      console.warn('Notifee notification scheduling skipped:', error);
    }

    // Запланувати локальні background сповіщення (працюють навіть коли додаток закритий)
    try {
      const { localBackgroundNotificationService } = require('./localBackgroundNotifications');
      await localBackgroundNotificationService
        .scheduleNotificationsForDeliveries()
        .catch(() => {});
    } catch (error) {
      console.warn('Local background notification scheduling skipped:', error);
    }

    await this.startAutoProgress(delivery.id);

    return delivery;
  },

  async updateDeliveryStatus(
    deliveryId: string,
    newStatus: DeliveryStatus,
    location?: string,
  ): Promise<Delivery | null> {
    const delivery = await storageService.getDelivery(deliveryId);
    if (!delivery) return null;

    delivery.status = newStatus;
    delivery.updatedAt = Date.now();
    if (location) {
      delivery.currentLocation = location;
    }

    await storageService.saveDelivery(delivery);

    const statusMessages: Record<DeliveryStatus, string> = {
      pending: 'Замовлення очікує обробки',
      confirmed: 'Замовлення підтверджено',
      in_transit: 'Замовлення прибуло до відділення',
      out_for_delivery: "Кур'єр везе ваше замовлення",
      delivered: 'Замовлення доставлено',
      cancelled: 'Замовлення скасовано',
    };

    const message = statusMessages[newStatus];
    await this.addHistoryEntry(deliveryId, newStatus, message, location);

    notificationService.showDeliveryUpdate(delivery);

    if (newStatus === 'delivered' || newStatus === 'cancelled') {
      this.stopAutoProgress(deliveryId);
    }

    if (newStatus === 'delivered') {
      const addressToSend = delivery.address || delivery.currentLocation || '';
      console.log(
        `📦 Delivery ${deliveryId} marked as delivered. Address: "${addressToSend}"`,
      );

      if (addressToSend && addressToSend.trim() !== '') {
        sendDeliveryToApi(addressToSend.trim(), deliveryId)
          .then(success => {
            if (success) {
              console.log(
                `✅ Successfully processed delivery ${deliveryId} for API`,
              );
            } else {
              console.warn(
                `⚠️ Failed to process delivery ${deliveryId} for API`,
              );
            }
          })
          .catch(error => {
            console.error(
              `❌ Error sending delivery ${deliveryId} to API:`,
              error,
            );
          });
      } else {
        console.warn(
          `⚠️ No address available to send to API for delivery: ${deliveryId}. Address: "${addressToSend}", CurrentLocation: "${delivery.currentLocation}"`,
        );

        try {
          const { syncService } = require('./syncService');
          if (!syncService.isConnected()) {
            await syncService.addToQueue('', deliveryId);
            console.log(
              `📥 Added delivery ${deliveryId} to sync_queue without address (will be updated later)`,
            );
          }
        } catch (error) {
          // Ignore
        }
      }
    }

    return delivery;
  },

  async simulateProgress(deliveryId: string): Promise<void> {
    const delivery = await storageService.getDelivery(deliveryId);
    if (!delivery) return;

    const currentIndex = STATUS_PROGRESSION.indexOf(delivery.status);
    if (currentIndex < STATUS_PROGRESSION.length - 1) {
      const nextStatus = STATUS_PROGRESSION[currentIndex + 1];

      await this.updateDeliveryStatus(
        deliveryId,
        nextStatus,
        LOCATIONS[currentIndex] || undefined,
      );
    }
  },

  async addHistoryEntry(
    deliveryId: string,
    status: DeliveryStatus,
    message: string,
    location?: string,
  ): Promise<void> {
    const item: DeliveryHistoryItem = {
      deliveryId,
      status,
      timestamp: Date.now(),
      message,
      location,
    };
    await storageService.addHistoryItem(item);
  },

  async getAllDeliveries(): Promise<Delivery[]> {
    const deliveries = await storageService.getDeliveries();
    return deliveries.sort((a, b) => b.updatedAt - a.updatedAt);
  },
};

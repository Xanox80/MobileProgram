import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';
import { Delivery } from '../types/delivery';
import { settingsService } from './settings';

class NotifeeNotificationService {
  private channelId = 'delivery-tracker-channel';
  private initialized = false;

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Request permissions
      await notifee.requestPermission();

      // Create a channel for Android
      await notifee.createChannel({
        id: this.channelId,
        name: 'Delivery Tracker',
        description: 'Notifications for delivery updates',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      this.initialized = true;
      console.log('✅ Notifee notification service initialized');
    } catch (error) {
      console.warn('Error initializing notifee notification service:', error);
      this.initialized = false;
    }
  }

  async scheduleSnackTimeReminder(delivery: Delivery) {
    try {
      const settings = await settingsService.getSettings();
      if (!settings.notificationsEnabled) {
        console.log('Notifications are disabled, skipping snack time reminder');
        return;
      }

      // Ensure service is initialized
      if (!this.initialized) {
        await this.initialize();
      }

      // Schedule notification for 1 minute from now
      await notifee.createTriggerNotification(
        {
          title: 'Час перекусити!',
          body: 'Ваше замовлення вже мало приїхати',
          android: {
            channelId: this.channelId,
            importance: AndroidImportance.HIGH,
            sound: settings.soundEnabled ? 'default' : undefined,
            vibrationPattern: settings.soundEnabled ? [300, 500] : undefined,
            pressAction: {
              id: 'default',
            },
          },
          data: {
            deliveryId: delivery.id,
            trackingNumber: delivery.trackingNumber,
            type: 'snack_reminder',
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: Date.now() + 1 * 60 * 1000, // через 1 хв
        },
      );

      console.log('✅ Scheduled snack time reminder notification');
    } catch (error) {
      console.warn('Error scheduling snack time reminder:', error);
    }
  }

  async showDeliveryUpdate(delivery: Delivery) {
    try {
      const settings = await settingsService.getSettings();
      if (!settings.notificationsEnabled) {
        return;
      }

      // Ensure service is initialized
      if (!this.initialized) {
        await this.initialize();
      }

      const statusMessages: Record<string, string> = {
        pending: 'Ваше замовлення підтверджено',
        confirmed: 'Замовлення підтверджено',
        in_transit: delivery.currentLocation?.includes('відділення')
          ? `📦 Замовлення прибуло до відділення: ${delivery.currentLocation}`
          : 'Замовлення в дорозі',
        out_for_delivery: "Кур'єр везе ваше замовлення",
        delivered: '✅ Замовлення доставлено! Можете забрати у відділенні.',
        cancelled: 'Замовлення скасовано',
      };

      const message = statusMessages[delivery.status] || 'Оновлення статусу доставки';

      let title: string;
      if (delivery.status === 'delivered') {
        title = '🎉 Доставка завершена!';
      } else if (delivery.status === 'in_transit' && delivery.currentLocation?.includes('відділення')) {
        title = '📦 Замовлення прибуло!';
      } else {
        title = `Доставка #${delivery.trackingNumber}`;
      }

      await notifee.displayNotification({
        title,
        body: message,
        android: {
          channelId: this.channelId,
          importance: AndroidImportance.HIGH,
          sound: settings.soundEnabled ? 'default' : undefined,
          vibrationPattern: settings.soundEnabled ? [300, 500] : undefined,
          pressAction: {
            id: 'default',
          },
        },
        data: {
          deliveryId: delivery.id,
          trackingNumber: delivery.trackingNumber,
          status: delivery.status,
        },
      });

      console.log(`✅ Notification sent: ${title} - ${message}`);
    } catch (error) {
      console.warn('Error showing delivery update notification:', error);
    }
  }
}

// Lazy initialization
let notifeeNotificationServiceInstance: NotifeeNotificationService | null = null;

export const notifeeNotificationService = {
  getInstance(): NotifeeNotificationService {
    if (!notifeeNotificationServiceInstance) {
      try {
        notifeeNotificationServiceInstance = new NotifeeNotificationService();
      } catch (error) {
        console.error('Failed to create NotifeeNotificationService:', error);
        return {
          initialize: async () => {},
          scheduleSnackTimeReminder: async () => {},
          showDeliveryUpdate: async () => {},
        } as any;
      }
    }
    return notifeeNotificationServiceInstance;
  },
  async initialize() {
    return this.getInstance().initialize();
  },
  async scheduleSnackTimeReminder(delivery: Delivery) {
    return this.getInstance().scheduleSnackTimeReminder(delivery);
  },
  async showDeliveryUpdate(delivery: Delivery) {
    return this.getInstance().showDeliveryUpdate(delivery);
  },
};


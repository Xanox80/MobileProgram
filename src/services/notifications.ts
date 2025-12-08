import PushNotification from 'react-native-push-notification';
import { Delivery, DeliveryStatus } from '../types/delivery';
import { settingsService } from './settings';

class NotificationService {
  private channelId = 'delivery-tracker-channel';
  private initialized = false;

  constructor() {
    try {
      this.configure();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      this.initialized = false;
    }
  }

  private configure() {
    try {
      PushNotification.configure({
        onRegister: function (token) {
          console.log('TOKEN:', token);
        },
        onNotification: function (notification) {
          console.log('NOTIFICATION:', notification);
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        popInitialNotification: true,
        requestPermissions: false, // Will request manually after channel creation
      });

      // Create channel for Android (must be done before showing notifications)
      if (PushNotification && typeof PushNotification.createChannel === 'function') {
        PushNotification.createChannel(
        {
          channelId: this.channelId,
          channelName: 'Delivery Tracker',
          channelDescription: 'Notifications for delivery updates',
          // Channel is created with sound enabled by default, but
          // we will control sound per-notification based on app settings
          playSound: true,
          soundName: 'default',
          importance: 4, // High importance - shows heads-up notification
          vibrate: true,
          vibration: 300,
        },
        (created) => {
          console.log(`Channel created: ${created}`);
          // Request permissions after channel is created
          setTimeout(() => {
            try {
              const permissionsResult = PushNotification.requestPermissions();
              if (permissionsResult && typeof permissionsResult.then === 'function') {
                permissionsResult
                  .then((permissions) => {
                    console.log('Notification permissions:', permissions);
                  })
                  .catch((error) => {
                    console.warn('Error requesting permissions:', error);
                  });
              } else {
                console.log('Notification permissions requested (no Promise returned)');
              }
            } catch (error) {
              console.warn('Error requesting permissions:', error);
            }
          }, 1000);
        },
        );
      } else {
        console.warn('PushNotification.createChannel is not available');
      }
    } catch (error) {
      console.error('Error configuring notifications:', error);
    }
  }

  async showDeliveryUpdate(delivery: Delivery) {
    if (!this.initialized) {
      console.warn('NotificationService not initialized, skipping notification');
      return;
    }

    const settings = await settingsService.getSettings();
    if (!settings.notificationsEnabled) {
      console.log('Notifications are disabled in settings, skipping notification');
      return;
    }

    // Ensure channel is created before showing notification
    try {
      if (!PushNotification || typeof PushNotification.createChannel !== 'function') {
        console.warn('PushNotification.createChannel is not available, sending notification without channel');
        this.sendNotification(delivery, settings.soundEnabled);
        return;
      }
      PushNotification.createChannel(
        {
          channelId: this.channelId,
          channelName: 'Delivery Tracker',
          channelDescription: 'Notifications for delivery updates',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
          vibration: 300,
        },
        () => {
          this.sendNotification(delivery, settings.soundEnabled);
        },
      );
    } catch (error) {
      console.error('Error creating notification channel:', error);
      // Try to send notification anyway
      this.sendNotification(delivery, settings.soundEnabled);
    }
  }

  private sendNotification(delivery: Delivery, soundEnabled: boolean) {
    try {
      const statusMessages: Record<DeliveryStatus, string> = {
        pending: 'Ваше замовлення підтверджено',
        confirmed: 'Замовлення підтверджено',
        in_transit: delivery.currentLocation?.includes('відділення')
          ? `📦 Замовлення прибуло до відділення: ${delivery.currentLocation}`
          : 'Замовлення в дорозі',
        out_for_delivery: 'Кур\'єр везе ваше замовлення',
        delivered: '✅ Замовлення доставлено! Можете забрати у відділенні.',
        cancelled: 'Замовлення скасовано',
      };

      const message = statusMessages[delivery.status] || 'Оновлення статусу доставки';
      
      // Special title for delivered status
      let title: string;
      if (delivery.status === 'delivered') {
        title = '🎉 Доставка завершена!';
      } else if (delivery.status === 'in_transit' && delivery.currentLocation?.includes('відділення')) {
        title = '📦 Замовлення прибуло!';
      } else {
        title = `Доставка #${delivery.trackingNumber}`;
      }

      // Generate unique ID for each notification
      const notificationId = Math.floor(Math.random() * 1000000);

      PushNotification.localNotification({
        id: notificationId,
        channelId: this.channelId,
        title,
        message,
        playSound: soundEnabled,
        soundName: soundEnabled ? 'default' : undefined,
        vibrate: soundEnabled,
        vibration: soundEnabled ? 300 : undefined,
        priority: 'high',
        importance: 'high',
        ongoing: false,
        autoCancel: true,
        userInfo: {
          deliveryId: delivery.id,
          trackingNumber: delivery.trackingNumber,
          status: delivery.status,
        },
      });

      console.log(`✅ Notification sent: ${title} - ${message}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  scheduleDeliveryReminder(delivery: Delivery) {
    if (delivery.estimatedDelivery && delivery.estimatedDelivery > Date.now()) {
      // Use current settings at the time of scheduling
      settingsService.getSettings().then(settings => {
        if (!settings.notificationsEnabled) {
          console.log('Notifications are disabled, skipping scheduled reminder');
          return;
        }

        const soundEnabled = settings.soundEnabled;

        PushNotification.localNotificationSchedule({
          channelId: this.channelId,
          title: 'Нагадування про доставку',
          message: `Ваше замовлення #${delivery.trackingNumber} має бути доставлено сьогодні`,
          date: new Date(delivery.estimatedDelivery),
          playSound: soundEnabled,
          soundName: soundEnabled ? 'default' : undefined,
          userInfo: {
            deliveryId: delivery.id,
            trackingNumber: delivery.trackingNumber,
          },
        });
      });
    }
  }

  // Schedule notification for when delivery arrives at post office
  scheduleArrivalNotification(delivery: Delivery, arrivalTime: number) {
    if (!this.initialized) {
      console.warn('NotificationService not initialized, skipping scheduled notification');
      return;
    }

    if (arrivalTime <= Date.now()) {
      // If time has passed, send immediately (will respect settings inside)
      this.showDeliveryUpdate({
        ...delivery,
        status: 'in_transit',
        currentLocation: 'Київ, відділення №15',
      });
      return;
    }

    try {
      // Ensure channel is created
      if (!PushNotification || typeof PushNotification.createChannel !== 'function') {
        console.warn('PushNotification.createChannel is not available, cannot schedule notification');
        return;
      }
      settingsService.getSettings().then(settings => {
        if (!settings.notificationsEnabled) {
          console.log('Notifications are disabled, skipping scheduled arrival notification');
          return;
        }

        const soundEnabled = settings.soundEnabled;

        PushNotification.createChannel(
          {
            channelId: this.channelId,
            channelName: 'Delivery Tracker',
            channelDescription: 'Notifications for delivery updates',
            playSound: true,
            soundName: 'default',
            importance: 4,
            vibrate: true,
            vibration: 300,
          },
          () => {
            // Schedule the notification
            // Generate numeric ID from delivery ID
            const notificationId = parseInt(
              delivery.id.replace(/\D/g, '').slice(-9) || Math.random().toString().slice(2, 9),
              10,
            ) || Math.floor(Math.random() * 1000000);

            PushNotification.localNotificationSchedule({
              id: notificationId,
              channelId: this.channelId,
              title: '📦 Замовлення прибуло!',
              message: `📦 Замовлення #${delivery.trackingNumber} прибуло до відділення: Київ, відділення №15`,
              date: new Date(arrivalTime),
              playSound: soundEnabled,
              soundName: soundEnabled ? 'default' : undefined,
              vibrate: soundEnabled,
              vibration: soundEnabled ? 300 : undefined,
              priority: 'high',
              importance: 'high',
              userInfo: {
                deliveryId: delivery.id,
                trackingNumber: delivery.trackingNumber,
                status: 'in_transit',
              },
            });

            console.log(`✅ Scheduled arrival notification for ${delivery.trackingNumber} at ${new Date(arrivalTime).toLocaleString()}`);
          },
        );
      });
    } catch (error) {
      console.error('Error scheduling arrival notification:', error);
    }
  }
}

// Lazy initialization to avoid crashes on startup
let notificationServiceInstance: NotificationService | null = null;

export const notificationService = {
  getInstance(): NotificationService {
    if (!notificationServiceInstance) {
      try {
        notificationServiceInstance = new NotificationService();
      } catch (error) {
        console.error('Failed to create NotificationService:', error);
        // Return a dummy service that does nothing
        return {
          showDeliveryUpdate: () => {},
          scheduleDeliveryReminder: () => {},
          scheduleArrivalNotification: () => {},
        } as any;
      }
    }
    return notificationServiceInstance;
  },
  showDeliveryUpdate(delivery: Delivery) {
    this.getInstance().showDeliveryUpdate(delivery);
  },
  scheduleDeliveryReminder(delivery: Delivery) {
    this.getInstance().scheduleDeliveryReminder(delivery);
  },
  scheduleArrivalNotification(delivery: Delivery, arrivalTime: number) {
    this.getInstance().scheduleArrivalNotification(delivery, arrivalTime);
  },
};


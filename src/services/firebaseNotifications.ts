import { Delivery, DeliveryStatus } from '../types/delivery';
import { storageService } from './storage';
import { deliveryService } from './deliveryService';
import { settingsService } from './settings';

// Lazy import Firebase to avoid crashes if not configured
let messaging: any = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (error) {
  console.warn('Firebase messaging not available:', error);
}

class FirebaseNotificationService {
  private initialized = false;
  private fcmToken: string | null = null;

  async initialize() {
    if (!messaging) {
      console.warn('Firebase messaging not available, skipping initialization');
      return;
    }

    try {
      // Check if messaging is actually callable
      let messagingInstance;
      try {
        messagingInstance = messaging();
        if (!messagingInstance || typeof messagingInstance !== 'object') {
          throw new Error('Firebase messaging not properly initialized');
        }
      } catch (initError: any) {
        // If Firebase is not configured (e.g., invalid google-services.json), skip initialization
        if (initError?.message?.includes('FirebaseApp') || 
            initError?.message?.includes('API key') ||
            initError?.code === 'messaging/unknown') {
          console.warn('Firebase not configured properly, skipping initialization (this is OK)');
          return;
        }
        throw initError;
      }

      // Request permission for notifications
      const authStatus = await messagingInstance.requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Firebase messaging permission granted');
        this.initialized = true;

        try {
          // Get FCM token - це потрібно для відправки push-сповіщень
          const token = await messagingInstance.getToken();
          if (token) {
            this.fcmToken = token;
            console.log('📱 FCM TOKEN:', token);
            // Тут можна відправити token на backend для збереження
            // await this.sendTokenToBackend(token);
          }

          // Setup foreground message handler
          messagingInstance.onMessage(async (remoteMessage) => {
            console.log('📨 Foreground message received:', remoteMessage);
            
            // Перевірити налаштування перед показом
            const settings = await settingsService.getSettings();
            if (!settings.notificationsEnabled) {
              console.log('Notifications disabled, skipping...');
              return;
            }

            // Show local notification when app is in foreground
            if (remoteMessage.notification) {
              this.showLocalNotification(
                remoteMessage.notification.title || 'Доставка',
                remoteMessage.notification.body || '',
                remoteMessage.data,
              );
            }
          });

          // Handle notification when app is opened from background/quit state
          messagingInstance.onNotificationOpenedApp((remoteMessage: any) => {
            console.log('📬 Notification opened app:', remoteMessage);
            this.handleNotificationTap(remoteMessage);
          });

          // Check if app was opened from a notification
          messagingInstance.getInitialNotification().then((remoteMessage: any) => {
            if (remoteMessage) {
              console.log('📬 App opened from notification:', remoteMessage);
              this.handleNotificationTap(remoteMessage);
            }
          });

        } catch (tokenError: any) {
          // If Firebase is not properly configured (missing API key), continue without it
          if (tokenError?.message?.includes('API key') || tokenError?.code === 'messaging/unknown') {
            console.warn('Firebase not fully configured (missing API key). Local notifications will still work.');
            this.initialized = false;
          } else {
            // Log but don't crash
            console.warn('Firebase token error (non-critical):', tokenError?.message || tokenError);
            this.initialized = false;
          }
        }
      } else {
        console.warn('⚠️ Firebase messaging permission denied');
      }
    } catch (error: any) {
      // If Firebase is not properly configured, continue without it
      // This is completely normal and expected if google-services.json is demo or missing
      if (error?.message?.includes('API key') || 
          error?.message?.includes('FirebaseApp') ||
          error?.message?.includes('not initialized') ||
          error?.code === 'messaging/unknown' ||
          error?.code === 'app/no-app') {
        console.warn('Firebase not fully configured (this is OK). Local notifications will still work.');
        this.initialized = false;
      } else {
        // Log but don't crash
        console.warn('Firebase initialization error (non-critical):', error?.message || error);
        this.initialized = false;
      }
    }
  }

  // Отримати FCM token (для відправки на backend)
  async getFCMToken(): Promise<string | null> {
    if (!this.initialized || !messaging) {
      return null;
    }

    try {
      const token = await messaging().getToken();
      if (token) {
        this.fcmToken = token;
        return token;
      }
      return null;
    } catch (error) {
      console.warn('Error getting FCM token:', error);
      return null;
    }
  }

  // Обробка background messages (коли додаток закритий)
  async handleBackgroundMessage(remoteMessage: any) {
    console.log('📬 Background message received:', remoteMessage);
    
    // Перевірити налаштування
    const settings = await settingsService.getSettings();
    if (!settings.notificationsEnabled) {
      console.log('Notifications disabled, skipping background message...');
      return;
    }

    // Показати notification через react-native-push-notification
    // Це працює навіть коли додаток закритий
    if (remoteMessage.notification) {
      this.showLocalNotification(
        remoteMessage.notification.title || 'Доставка',
        remoteMessage.notification.body || '',
        remoteMessage.data || {},
      );
    } else if (remoteMessage.data) {
      // Якщо немає notification payload, створити з data
      const title = remoteMessage.data.title || 'Доставка оновлена';
      const body = remoteMessage.data.body || remoteMessage.data.message || 'Оновлення статусу доставки';
      this.showLocalNotification(title, body, remoteMessage.data);
    }

    // Обробити data payload для оновлення статусу доставки
    if (remoteMessage.data) {
      await this.processDeliveryUpdateFromNotification(remoteMessage.data);
    }
  }

  // Обробка натискання на notification
  private handleNotificationTap(remoteMessage: any) {
    // Тут можна навігувати до конкретної доставки
    if (remoteMessage.data?.deliveryId) {
      console.log('Navigate to delivery:', remoteMessage.data.deliveryId);
      // navigation.navigate('Tracking', { deliveryId: remoteMessage.data.deliveryId });
    }
  }

  // Обробка оновлення доставки з notification
  private async processDeliveryUpdateFromNotification(data: any) {
    try {
      if (data.deliveryId && data.status) {
        const delivery = await storageService.getDelivery(data.deliveryId);
        if (delivery && delivery.status !== data.status) {
          await deliveryService.updateDeliveryStatus(
            data.deliveryId,
            data.status as DeliveryStatus,
            data.location,
          );
        }
      }
    } catch (error) {
      console.warn('Error processing delivery update from notification:', error);
    }
  }

  private showLocalNotification(title: string, message: string, data?: any) {
    // Перевірити налаштування звуку
    settingsService.getSettings().then(settings => {
      const PushNotification = require('react-native-push-notification').default;
      
      // Створити канал перед показом notification
      PushNotification.createChannel(
        {
          channelId: 'delivery-tracker-channel',
          channelName: 'Delivery Tracker',
          channelDescription: 'Notifications for delivery updates',
          playSound: settings.soundEnabled,
          soundName: settings.soundEnabled ? 'default' : undefined,
          importance: 4, // High importance - shows even when app is closed
          vibrate: settings.soundEnabled,
          vibration: settings.soundEnabled ? 300 : 0,
        },
        (created: boolean) => {
          console.log(`Channel ${created ? 'created' : 'already exists'}`);
          
          // Показати notification
          PushNotification.localNotification({
            id: Math.floor(Math.random() * 1000000),
            channelId: 'delivery-tracker-channel',
            title,
            message,
            playSound: settings.soundEnabled,
            soundName: settings.soundEnabled ? 'default' : undefined,
            vibrate: settings.soundEnabled,
            vibration: settings.soundEnabled ? 300 : 0,
            priority: 'high',
            importance: 'high',
            ongoing: false,
            autoCancel: true,
            userInfo: data || {},
          });
        },
      );
    });
  }

  // Відправити remote notification через backend
  // Це приклад payload для backend - backend має відправити таке повідомлення:
  /*
  {
    "to": "FCM_TOKEN",
    "notification": {
      "title": "Delivery updated",
      "body": "Courier is arriving"
    },
    "data": {
      "deliveryId": "123",
      "status": "out_for_delivery",
      "location": "Київ, в дорозі до вас"
    }
  }
  */
  async sendRemoteNotification(
    fcmToken: string,
    title: string,
    body: string,
    data: Record<string, string>,
  ) {
    // Це тільки приклад - реальна відправка має бути на backend
    console.log('📤 Send remote notification to:', fcmToken);
    console.log('Payload:', {
      to: fcmToken,
      notification: { title, body },
      data,
    });
    
    // Backend має використати Firebase Admin SDK або HTTP API для відправки
    // Приклад для backend (Node.js):
    /*
    const admin = require('firebase-admin');
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: data,
    });
    */
  }

  async scheduleDeliveryCompletionNotification(delivery: Delivery) {
    // Try to initialize if not already done, but continue even if Firebase is not available
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Якщо Firebase ініціалізовано - можна використати remote notifications
    // Інакше - використовуємо local notifications як fallback
    
    if (this.initialized && this.fcmToken) {
      // ВАЖЛИВО: Для роботи коли додаток закритий, backend має відправити
      // notification payload, а не тільки data!
      // Це має зробити backend через Firebase Admin SDK
      console.log('📤 Schedule remote notification for delivery:', delivery.trackingNumber);
      console.log('FCM Token:', this.fcmToken);
      // Backend має відправити notification в потрібний час
    } else {
      // Fallback на local notifications
      const completionTime = delivery.createdAt + 2 * 60 * 1000;
      const arrivalTime = delivery.createdAt + 60 * 1000;

      if (arrivalTime > Date.now()) {
        this.scheduleLocalNotification(
          arrivalTime,
          '📦 Замовлення прибуло!',
          `📦 Замовлення #${delivery.trackingNumber} прибуло до відділення: Київ, відділення №15`,
          delivery,
        );
      }

      if (completionTime > Date.now()) {
        this.scheduleLocalNotification(
          completionTime,
          '🎉 Доставка завершена!',
          `✅ Замовлення #${delivery.trackingNumber} доставлено! Можете забрати у відділенні.`,
          delivery,
        );
      }
    }
  }

  private scheduleLocalNotification(
    scheduledTime: number,
    title: string,
    message: string,
    delivery: Delivery,
  ) {
    settingsService.getSettings().then(settings => {
      const PushNotification = require('react-native-push-notification').default;

      PushNotification.createChannel(
        {
          channelId: 'delivery-tracker-channel',
          channelName: 'Delivery Tracker',
          channelDescription: 'Notifications for delivery updates',
          playSound: settings.soundEnabled,
          soundName: settings.soundEnabled ? 'default' : undefined,
          importance: 4,
          vibrate: settings.soundEnabled,
          vibration: settings.soundEnabled ? 300 : 0,
        },
        () => {
          const notificationId = Math.floor(Math.random() * 1000000);
          PushNotification.localNotificationSchedule({
            id: notificationId,
            channelId: 'delivery-tracker-channel',
            title,
            message,
            date: new Date(scheduledTime),
            playSound: settings.soundEnabled,
            soundName: settings.soundEnabled ? 'default' : undefined,
            vibrate: settings.soundEnabled,
            vibration: settings.soundEnabled ? 300 : 0,
            priority: 'high',
            importance: 'high',
            userInfo: {
              deliveryId: delivery.id,
              trackingNumber: delivery.trackingNumber,
            },
          });

          console.log(`✅ Scheduled notification: ${title} at ${new Date(scheduledTime).toLocaleString()}`);
        },
      );
    });
  }

  // Background task to update delivery status even when app is closed
  async processDeliveryUpdates() {
    try {
      const deliveries = await storageService.getDeliveries();
      const now = Date.now();

      for (const delivery of deliveries) {
        try {
          if (delivery.status === 'delivered' || delivery.status === 'cancelled') {
            continue;
          }

          const timeSinceCreation = now - delivery.createdAt;
          const currentIndex = ['pending', 'confirmed', 'in_transit', 'out_for_delivery', 'delivered'].indexOf(
            delivery.status,
          );

          // Check if it's time to update status
          const STAGE_DURATION = 30 * 1000; // 30 seconds per stage
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

            await deliveryService.updateDeliveryStatus(
              delivery.id,
              nextStatus,
              locations[currentIndex] || undefined,
            );
          }
        } catch (deliveryError) {
          // Continue processing other deliveries even if one fails
          console.warn('Error processing delivery update:', deliveryError?.message || deliveryError);
        }
      }
    } catch (error) {
      // Silently ignore errors - this is a background task
      console.warn('Error in processDeliveryUpdates (non-critical):', error?.message || error);
    }
  }
}

// Lazy initialization to avoid crashes on startup
let firebaseNotificationServiceInstance: FirebaseNotificationService | null = null;

export const firebaseNotificationService = {
  getInstance(): FirebaseNotificationService {
    if (!firebaseNotificationServiceInstance) {
      try {
        firebaseNotificationServiceInstance = new FirebaseNotificationService();
      } catch (error) {
        console.warn('Failed to create FirebaseNotificationService:', error);
        // Return a dummy service that does nothing
        return {
          initialized: false,
          initialize: async () => {},
          processDeliveryUpdates: async () => {},
          scheduleDeliveryCompletionNotification: async () => {},
          getFCMToken: async () => null,
          handleBackgroundMessage: async () => {},
        } as any;
      }
    }
    return firebaseNotificationServiceInstance;
  },
  async initialize() {
    return this.getInstance().initialize();
  },
  async processDeliveryUpdates() {
    return this.getInstance().processDeliveryUpdates();
  },
  async scheduleDeliveryCompletionNotification(delivery: Delivery) {
    return this.getInstance().scheduleDeliveryCompletionNotification(delivery);
  },
  async getFCMToken() {
    return this.getInstance().getFCMToken();
  },
  async handleBackgroundMessage(remoteMessage: any) {
    return this.getInstance().handleBackgroundMessage(remoteMessage);
  },
};

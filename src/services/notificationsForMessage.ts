import PushNotification from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';

// Ініціалізація
PushNotification.configure({
  onNotification: function (notification) {
    console.log('LOCAL NOTIFICATION ==>', notification);
  },
  requestPermissions: false,
});

// Запит дозволів
export const requestPermissions = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  return enabled;
};

// Відміна всіх локальних сповіщень
export const cancelAllNotifications = () => {
  PushNotification.cancelAllLocalNotifications();
};

// Тестове сповіщення
export const sendTestNotification = () => {
  PushNotification.localNotification({
    channelId: 'default', // має бути в AndroidManifest
    title: 'Сповіщення увімкнено',
    message: 'Тепер ви будете отримувати повідомлення!',
  });
};

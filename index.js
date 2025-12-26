/**
 * @format
 */

import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Це потрібно для PUSH коли додаток закритий
// Register background handler for Firebase messages
try {
  const messaging = require('@react-native-firebase/messaging').default;
  
  if (messaging && typeof messaging().setBackgroundMessageHandler === 'function') {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📬 Message handled in the background!', remoteMessage);
      
      // Обробка delivery updates в background
      try {
        const { firebaseNotificationService } = require('./src/services/firebaseNotifications');
        await firebaseNotificationService.handleBackgroundMessage(remoteMessage);
      } catch (error) {
        // Silently ignore errors in background processing
        console.warn('Error in background handler:', error?.message);
      }
    });
    console.log('✅ Firebase background message handler registered');
  }
} catch (error) {
  // Firebase not available, continue without background handler
  // This is completely normal if Firebase is not configured
  console.warn('Firebase background handler not available (this is OK if Firebase is not configured)');
}

AppRegistry.registerComponent(appName, () => App);

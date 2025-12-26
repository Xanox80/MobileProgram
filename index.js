/**
 * @format
 */

import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Background notification handler using notifee
// This works even when the app is closed
try {
  const { localBackgroundNotificationService } = require('./src/services/localBackgroundNotifications');
  console.log('✅ Local background notification service available');
} catch (error) {
  console.warn('Local background notification service not available:', error?.message);
}

AppRegistry.registerComponent(appName, () => App);

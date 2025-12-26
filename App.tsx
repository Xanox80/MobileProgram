import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  useColorScheme,
  TouchableOpacity,
  Text,
  AppState,
  AppStateStatus,
} from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { HomeScreen } from './src/screens/HomeScreen';
import { QRScannerScreen } from './src/screens/QRScannerScreen';
import { TrackingScreen } from './src/screens/TrackingScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ManualTrackingScreen } from './src/screens/ManualTrackingScreen';
import { UserProfileScreen } from './src/screens/UserProfileScreen';
import { StatisticsScreen } from './src/screens/StatisticsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RootStackParamList = {
  Home: undefined;
  QRScanner: undefined;
  Tracking: { deliveryId: string };
  History: undefined;
  ManualTracking: undefined;
  UserProfile: undefined;
  Statistics: undefined;
  Settings: undefined;
  Calendar: undefined;
  Onboarding: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function AppContent() {
  const { theme, colors } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  useEffect(() => {
    const initDatabase = async () => {
      try {
        const { migrateFromAsyncStorage } = require('./src/services/migration');
        await migrateFromAsyncStorage();
      } catch (error) {
        console.warn('Migration error (this is OK):', error);
      }
    };
    initDatabase();
    
    // Ініціалізація Redux - завантаження даних з SQLite
    const initRedux = async () => {
      try {
        const {
          fetchDeliveries,
        } = require('./src/store/thunks/deliveriesThunks');
        const { fetchSettings } = require('./src/store/thunks/settingsThunks');
        const { fetchTheme } = require('./src/store/slices/themeSlice');
        const { store } = require('./src/store');

        // Використовуємо store напряму для dispatch
        // ВСІ ДАНІ ЗАВАНТАЖУЮТЬСЯ З SQLITE!
        await store.dispatch(fetchDeliveries());
        await store.dispatch(fetchSettings());
        await store.dispatch(fetchTheme());
      } catch (error) {
        console.warn('Redux initialization error:', error);
      }
    };

    initRedux();

    // Ініціалізація сервісу синхронізації
    const initSync = async () => {
      try {
        const { syncService } = require('./src/services/syncService');
        await syncService.initialize();
        console.log('✅ Sync service initialized');
      } catch (error) {
        console.warn('Sync service initialization error:', error);
      }
    };
    initSync();

    // Додати тестові функції в глобальний об'єкт для діагностики
    if (__DEV__) {
      try {
        const { testApiConnection, testSendAddress } = require('./src/services/apiTest');
        (global as any).testApiConnection = testApiConnection;
        (global as any).testSendAddress = testSendAddress;
        console.log('🔧 Test functions available: testApiConnection(), testSendAddress("address")');
      } catch (error) {
        // Ignore
      }
    }

    const requestNotificationPermission = async () => {
      try {
        const messaging = require('@react-native-firebase/messaging').default;
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('✅ Notification permission enabled');
        } else {
          console.warn('⚠️ Notification permission denied');
        }
      } catch (error) {
        console.warn(
          'Firebase permission request skipped (this is OK if Firebase is not configured)',
        );
      }
    };

    requestNotificationPermission();

    AsyncStorage.getItem('@onboarding_shown').then(value => {
      setShowOnboarding(value !== 'true');
    });
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem('@onboarding_shown', 'true');
    setShowOnboarding(false);
  };
  useEffect(() => {
    let updateInterval: number | null = null;

    const initFirebase = async () => {
      try {
        const {
          firebaseNotificationService,
        } = require('./src/services/firebaseNotifications');
        await firebaseNotificationService.initialize().catch((error: any) => {
          console.warn(
            'Firebase initialization skipped (this is OK):',
            error?.message || error,
          );
        });

        updateInterval = setInterval(() => {
          try {
            firebaseNotificationService
              .processDeliveryUpdates()
              .catch(() => {});
          } catch (error) {
            // Ignore any errors
          }
        }, 10000);
      } catch (error) {
        console.warn('Firebase service not available (this is OK)');
      }
    };
    
    setTimeout(() => {
      initFirebase();
    }, 100);

    return () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, []);

  // Перевірка інтернету та синхронізація при поверненні додатку на передній план
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Додаток повернувся на передній план - перевірити інтернет та синхронізувати
        try {
          const { syncService } = require('./src/services/syncService');
          syncService.forceCheckAndSync().catch((error: any) => {
            console.warn('Error during app state sync:', error);
          });
        } catch (error) {
          // Ignore
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  if (showOnboarding === null) {
    return null;
  }

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <StatusBar
          barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding">
              {({ navigation }) => (
                <OnboardingScreen
                  navigation={navigation}
                  onComplete={handleOnboardingComplete}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.surface,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={({ navigation }) => ({
              title: 'Доставки',
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => navigation.navigate('UserProfile')}
                  style={{ marginRight: 16, padding: 8 }}
                >
                  <Text style={{ fontSize: 24 }}>👤</Text>
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen
            name="QRScanner"
            component={QRScannerScreen}
            options={{
              title: 'Сканер QR',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Tracking"
            component={TrackingScreen}
            options={{
              title: 'Відстеження',
            }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{
              title: 'Історія',
            }}
          />
          <Stack.Screen
            name="ManualTracking"
            component={ManualTrackingScreen}
            options={{
              title: 'Введення номера',
            }}
          />
          <Stack.Screen
            name="UserProfile"
            component={UserProfileScreen}
            options={{
              title: 'Профіль користувача',
            }}
          />
          <Stack.Screen
            name="Statistics"
            component={StatisticsScreen}
            options={{
              title: 'Статистика',
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Налаштування',
            }}
          />
          <Stack.Screen
            name="Calendar"
            component={CalendarScreen}
            options={{
              title: 'Календар доставок',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;

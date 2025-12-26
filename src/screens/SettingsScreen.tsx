import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useReduxTheme } from '../hooks/useReduxTheme';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { deliveryService } from '../services/deliveryService';
import { storageService } from '../services/storage';
import { clearAllDeliveries } from '../store/thunks/deliveriesThunks';
import {
  fetchSettings,
  toggleNotifications,
  toggleSound,
  toggleAutoRefresh,
} from '../store/thunks/settingsThunks';
import { toggleTheme } from '../store/slices/themeSlice';
import {
  requestPermissions,
  cancelAllNotifications,
  sendTestNotification,
} from '../services/notificationsForMessage';

interface Props {
  navigation: any;
}

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  
  // Використовуємо Redux для теми та налаштувань
  const { theme, colors, toggleTheme: toggleThemeHandler } = useReduxTheme();
  const settings = useAppSelector((state) => state.settings.settings);
  
  const notificationsEnabled = settings.notificationsEnabled;
  const soundEnabled = settings.soundEnabled;
  const autoRefreshEnabled = settings.autoRefreshEnabled;

  // Стан для офлайн режиму та синхронізації
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Завантажити налаштування з Redux
    dispatch(fetchSettings());

    // Підписатися на зміни стану інтернету
    let unsubscribe: (() => void) | null = null;
    try {
      const { syncService } = require('../services/syncService');
      unsubscribe = syncService.subscribe((online: boolean) => {
        setIsOnline(online);
        if (online) {
          // Оновити кількість очікуючих при появі інтернету
          const stats = syncService.getQueueStats();
          setPendingCount(stats.pending);
        }
      });
      
      // Отримати початковий стан
      setIsOnline(syncService.isConnected());
      const stats = syncService.getQueueStats();
      setPendingCount(stats.pending);
    } catch (error) {
      console.warn('Sync service not available:', error);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [dispatch]);

  const handleExportData = async () => {
    try {
      // Використовуємо доставки з Redux
      const deliveries = useAppSelector((state) => state.deliveries.deliveries);
      if (deliveries.length === 0) {
        Alert.alert('Помилка', 'Немає даних для експорту');
        return;
      }
      const data = JSON.stringify(deliveries, null, 2);

      await Share.share({
        message: `Мої доставки:\n\n${data}`,
        title: 'Експорт доставок',
      });
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося експортувати дані');
    }
  };
  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestPermissions();
      if (!granted) return;

      await dispatch(toggleNotifications(true));
      sendTestNotification();
    } else {
      cancelAllNotifications();
      await dispatch(toggleNotifications(false));
    }
  };

  const handleToggleSound = async (value: boolean) => {
    await dispatch(toggleSound(value));
  };

  const handleToggleAutoRefresh = async (value: boolean) => {
    await dispatch(toggleAutoRefresh(value));
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Очистити історію?',
      'Ця дія видалить всю історію доставок. Продовжити?',
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Очистити',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(clearAllDeliveries());
              Alert.alert('Успіх', 'Історія очищена');
            } catch (error) {
              Alert.alert('Помилка', 'Не вдалося очистити історію');
            }
          },
        },
      ],
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'Про додаток',
      'Версія: 1.0.0\n\nДодаток для відстеження доставок з підтримкою QR-сканування та автоматичних сповіщень.',
    );
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const { syncService } = require('../services/syncService');
      
      // Примусово перевірити стан інтернету та синхронізувати
      // Це допомагає навіть якщо addEventListener не спрацював
      await syncService.forceCheckAndSync();
      
      const stats = syncService.getQueueStats();
      setPendingCount(stats.pending);
      
      // Оновити стан інтернету
      setIsOnline(syncService.isConnected());
      
      if (stats.pending === 0) {
        Alert.alert('Успіх', 'Всі дані успішно синхронізовано!');
      } else {
        Alert.alert('Частково', `Синхронізовано. Залишилось очікуючих: ${stats.pending}`);
      }
    } catch (error: any) {
      console.error('Manual sync error:', error);
      Alert.alert('Помилка', `Не вдалося синхронізувати: ${error.message || 'Невідома помилка'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const SettingItem = ({
    title,
    subtitle,
    value,
    onValueChange,
    type = 'switch',
    onPress,
    icon,
    danger = false,
  }: {
    title: string;
    subtitle?: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    type?: 'switch' | 'button';
    onPress?: () => void;
    icon?: string;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
      onPress={type === 'button' ? onPress : undefined}
      disabled={type === 'switch'}
    >
      <View style={styles.settingLeft}>
        {icon && <Text style={styles.settingIcon}>{icon}</Text>}
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.settingSubtitle, { color: colors.textSecondary }]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {type === 'switch' && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      )}
      {type === 'button' && (
        <Text
          style={[
            styles.settingArrow,
            { color: danger ? '#FF3B30' : colors.textSecondary },
          ]}
        >
          ›
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ЗВІТИ
          </Text>
          <SettingItem
            title="Експортувати дані"
            subtitle="Зберегти всі доставки"
            icon="📤"
            type="button"
            onPress={handleExportData}
          />
          <SettingItem
            title="Статистика"
            subtitle="Детальна аналітика"
            icon="📊"
            type="button"
            onPress={() => navigation.navigate('Statistics')}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            СПОВІЩЕННЯ
          </Text>
          <SettingItem
            title="Сповіщення"
            subtitle="Отримувати повідомлення про зміни"
            icon="🔔"
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
          />
          <SettingItem
            title="Звук"
            subtitle="Звукові сигнали"
            icon="🔊"
            value={soundEnabled}
            onValueChange={handleToggleSound}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ДОДАТКОВО
          </Text>
          <SettingItem
            title="Автооновлення"
            subtitle="Оновлювати автоматично"
            icon="🔄"
            value={autoRefreshEnabled}
            onValueChange={handleToggleAutoRefresh}
          />
          <SettingItem
            title="Тема"
            subtitle={theme === 'dark' ? 'Темна' : 'Світла'}
            icon={theme === 'dark' ? '🌙' : '☀️'}
            type="button"
            onPress={() => dispatch(toggleTheme())}
          />
          <SettingItem
            title="Календар доставок"
            subtitle="Переглянути за датами"
            icon="📅"
            type="button"
            onPress={() => navigation.navigate('Calendar')}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            СИНХРОНІЗАЦІЯ
          </Text>
          <View style={[styles.settingItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>{isOnline ? '🌐' : '📴'}</Text>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Стан підключення
                </Text>
                <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                  {isOnline ? 'Онлайн' : 'Офлайн'}
                  {pendingCount > 0 && ` • ${pendingCount} очікують синхронізації`}
                </Text>
              </View>
            </View>
            {isSyncing && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          <SettingItem
            title="Синхронізувати зараз"
            subtitle={pendingCount > 0 ? `${pendingCount} очікують відправки` : 'Всі дані синхронізовані'}
            icon="📤"
            type="button"
            onPress={handleManualSync}
            danger={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ІНШЕ
          </Text>
          <SettingItem
            title="Очистити історію"
            subtitle="Видалити всі доставки"
            icon="🗑️"
            type="button"
            onPress={handleClearHistory}
            danger
          />
          <SettingItem
            title="Про додаток"
            subtitle="Версія та інформація"
            icon="ℹ️"
            type="button"
            onPress={handleAbout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  settingArrow: {
    fontSize: 24,
    fontWeight: '300',
  },
});


import AsyncStorage from '@react-native-async-storage/async-storage';
import { Delivery, DeliveryHistoryItem } from '../types/delivery';
import { deliveryQueries, historyQueries, settingsQueries, initDatabase } from './database';

const DELIVERIES_KEY = '@deliveries';
const HISTORY_KEY = '@delivery_history';
const SETTINGS_KEY = '@app_settings';

/**
 * Міграція даних з AsyncStorage в SQLite
 * Викликається один раз при першому запуску після оновлення
 */
export const migrateFromAsyncStorage = async (): Promise<void> => {
  try {
    // Перевірити, чи вже була міграція
    const migrationKey = 'migration_to_sqlite_completed';
    const migrationCompleted = settingsQueries.getSetting(migrationKey);
    
    if (migrationCompleted === 'true') {
      console.log('✅ Migration already completed, skipping...');
      return;
    }

    console.log('🔄 Starting migration from AsyncStorage to SQLite...');
    
    // Ініціалізувати базу даних
    initDatabase();

    // Міграція deliveries
    try {
      const deliveriesData = await AsyncStorage.getItem(DELIVERIES_KEY);
      if (deliveriesData) {
        const deliveries: Delivery[] = JSON.parse(deliveriesData);
        console.log(`📦 Migrating ${deliveries.length} deliveries...`);
        
        for (const delivery of deliveries) {
          try {
            deliveryQueries.saveDelivery(delivery);
          } catch (error) {
            console.warn(`Failed to migrate delivery ${delivery.id}:`, error);
          }
        }
        console.log('✅ Deliveries migrated successfully');
      }
    } catch (error) {
      console.warn('Error migrating deliveries:', error);
    }

    // Міграція history
    try {
      const historyData = await AsyncStorage.getItem(HISTORY_KEY);
      if (historyData) {
        const history: DeliveryHistoryItem[] = JSON.parse(historyData);
        console.log(`📜 Migrating ${history.length} history items...`);
        
        for (const item of history) {
          try {
            historyQueries.addHistoryItem(item);
          } catch (error) {
            console.warn(`Failed to migrate history item:`, error);
          }
        }
        console.log('✅ History migrated successfully');
      }
    } catch (error) {
      console.warn('Error migrating history:', error);
    }

    // Міграція settings
    try {
      const settingsData = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settingsData) {
        console.log('⚙️ Migrating settings...');
        settingsQueries.setSetting('app_settings', settingsData);
        console.log('✅ Settings migrated successfully');
      }
    } catch (error) {
      console.warn('Error migrating settings:', error);
    }

    // Позначити міграцію як завершену
    settingsQueries.setSetting(migrationKey, 'true');
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    // Не кидаємо помилку, щоб додаток міг продовжити роботу
  }
};






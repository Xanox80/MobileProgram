import { initDatabase, settingsQueries } from './database';

// Ініціалізувати базу даних при імпорті
initDatabase();

export interface AppSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  autoRefreshEnabled: boolean;
}

const defaultSettings: AppSettings = {
  notificationsEnabled: true,
  soundEnabled: true,
  autoRefreshEnabled: true,
};

const SETTINGS_KEY = 'app_settings';

export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    try {
      const value = settingsQueries.getSetting(SETTINGS_KEY);
      if (!value) {
        // Якщо налаштувань немає, збережемо дефолтні
        await this.saveSettings(defaultSettings);
        return defaultSettings;
      }

      const parsed = JSON.parse(value);
      return {
        ...defaultSettings,
        ...parsed,
      };
    } catch (error) {
      console.warn('Error reading app settings, using defaults:', error);
      return defaultSettings;
    }
  },

  async saveSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const merged: AppSettings = {
      ...current,
      ...partial,
    };

    try {
      settingsQueries.setSetting(SETTINGS_KEY, JSON.stringify(merged));
    } catch (error) {
      console.warn('Error saving app settings:', error);
    }

    return merged;
  },

  async setNotificationsEnabled(enabled: boolean): Promise<AppSettings> {
    return this.saveSettings({ notificationsEnabled: enabled });
  },

  async setSoundEnabled(enabled: boolean): Promise<AppSettings> {
    return this.saveSettings({ soundEnabled: enabled });
  },

  async setAutoRefreshEnabled(enabled: boolean): Promise<AppSettings> {
    return this.saveSettings({ autoRefreshEnabled: enabled });
  },
};

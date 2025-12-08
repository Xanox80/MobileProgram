import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchSettings,
  saveSettings as saveSettingsThunk,
  toggleNotifications as toggleNotificationsThunk,
  toggleSound as toggleSoundThunk,
  toggleAutoRefresh as toggleAutoRefreshThunk,
} from '../thunks/settingsThunks';

export interface AppSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  autoRefreshEnabled: boolean;
}

interface SettingsState {
  settings: AppSettings;
}

const initialState: SettingsState = {
  settings: {
    notificationsEnabled: true,
    soundEnabled: true,
    autoRefreshEnabled: true,
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<AppSettings>) => {
      state.settings = action.payload;
      // Автоматично зберігаємо в SQLite
      try {
        const { settingsQueries } = require('../../services/database');
        settingsQueries.setSetting('app_settings', JSON.stringify(action.payload));
      } catch (error) {
        console.warn('Error saving settings to SQLite:', error);
      }
    },
    setNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.settings.notificationsEnabled = action.payload;
      // Автоматично зберігаємо в SQLite
      try {
        const { settingsService } = require('../../services/settings');
        settingsService.saveSettings({ notificationsEnabled: action.payload }).catch(() => {});
      } catch (error) {
        console.warn('Error saving settings to SQLite:', error);
      }
    },
    setSoundEnabled: (state, action: PayloadAction<boolean>) => {
      state.settings.soundEnabled = action.payload;
      // Автоматично зберігаємо в SQLite
      try {
        const { settingsService } = require('../../services/settings');
        settingsService.saveSettings({ soundEnabled: action.payload }).catch(() => {});
      } catch (error) {
        console.warn('Error saving settings to SQLite:', error);
      }
    },
    setAutoRefreshEnabled: (state, action: PayloadAction<boolean>) => {
      state.settings.autoRefreshEnabled = action.payload;
      // Автоматично зберігаємо в SQLite
      try {
        const { settingsService } = require('../../services/settings');
        settingsService.saveSettings({ autoRefreshEnabled: action.payload }).catch(() => {});
      } catch (error) {
        console.warn('Error saving settings to SQLite:', error);
      }
    },
    resetSettings: (state) => {
      state.settings = initialState.settings;
      // Автоматично зберігаємо в SQLite
      try {
        const { settingsService } = require('../../services/settings');
        settingsService.saveSettings(initialState.settings).catch(() => {});
      } catch (error) {
        console.warn('Error saving settings to SQLite:', error);
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch settings
    builder.addCase(fetchSettings.fulfilled, (state, action) => {
      state.settings = action.payload;
    });

    // Save settings
    builder.addCase(saveSettingsThunk.fulfilled, (state, action) => {
      state.settings = action.payload;
    });

    // Toggle notifications
    builder.addCase(toggleNotificationsThunk.fulfilled, (state, action) => {
      state.settings = action.payload;
    });

    // Toggle sound
    builder.addCase(toggleSoundThunk.fulfilled, (state, action) => {
      state.settings = action.payload;
    });

    // Toggle auto refresh
    builder.addCase(toggleAutoRefreshThunk.fulfilled, (state, action) => {
      state.settings = action.payload;
    });
  },
});

export const {
  setSettings,
  setNotificationsEnabled,
  setSoundEnabled,
  setAutoRefreshEnabled,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;


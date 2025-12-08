import { createAsyncThunk } from '@reduxjs/toolkit';
import { settingsService, AppSettings } from '../../services/settings';

// Завантажити налаштування
export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const settings = await settingsService.getSettings();
      return settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch settings');
    }
  },
);

// Зберегти налаштування
export const saveSettings = createAsyncThunk(
  'settings/save',
  async (partial: Partial<AppSettings>, { rejectWithValue }) => {
    try {
      const settings = await settingsService.saveSettings(partial);
      return settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save settings');
    }
  },
);

// Увімкнути/вимкнути сповіщення
export const toggleNotifications = createAsyncThunk(
  'settings/toggleNotifications',
  async (enabled: boolean, { rejectWithValue }) => {
    try {
      const settings = await settingsService.setNotificationsEnabled(enabled);
      return settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to toggle notifications');
    }
  },
);

// Увімкнути/вимкнути звук
export const toggleSound = createAsyncThunk(
  'settings/toggleSound',
  async (enabled: boolean, { rejectWithValue }) => {
    try {
      const settings = await settingsService.setSoundEnabled(enabled);
      return settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to toggle sound');
    }
  },
);

// Увімкнути/вимкнути автооновлення
export const toggleAutoRefresh = createAsyncThunk(
  'settings/toggleAutoRefresh',
  async (enabled: boolean, { rejectWithValue }) => {
    try {
      const settings = await settingsService.setAutoRefreshEnabled(enabled);
      return settings;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to toggle auto refresh');
    }
  },
);






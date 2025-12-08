import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { settingsQueries, initDatabase } from '../../services/database';

// Ініціалізувати базу даних
initDatabase();

export type Theme = 'light' | 'dark';

const THEME_KEY = 'app_theme';

// Завантажити theme з SQLite
export const fetchTheme = createAsyncThunk(
  'theme/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const themeValue = settingsQueries.getSetting(THEME_KEY);
      return (themeValue as Theme) || 'light';
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch theme');
    }
  },
);

// Зберегти theme в SQLite
export const saveTheme = createAsyncThunk(
  'theme/save',
  async (theme: Theme, { rejectWithValue }) => {
    try {
      settingsQueries.setSetting(THEME_KEY, theme);
      return theme;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save theme');
    }
  },
);

interface ThemeState {
  theme: Theme;
  loading: boolean;
}

const initialState: ThemeState = {
  theme: 'light',
  loading: false,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      // Автоматично зберігаємо в SQLite при зміні
      settingsQueries.setSetting(THEME_KEY, action.payload);
    },
    toggleTheme: (state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = newTheme;
      // Автоматично зберігаємо в SQLite при зміні
      settingsQueries.setSetting(THEME_KEY, newTheme);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTheme.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTheme.fulfilled, (state, action) => {
        state.theme = action.payload;
        state.loading = false;
      })
      .addCase(fetchTheme.rejected, (state) => {
        state.loading = false;
      })
      .addCase(saveTheme.fulfilled, (state, action) => {
        state.theme = action.payload;
      });
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;

export default themeSlice.reducer;

// Helper function to get colors based on theme
export const getThemeColors = (theme: Theme) => {
  const lightColors = {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    primary: '#007AFF',
    border: '#E5E5EA',
    card: '#FFFFFF',
  };

  const darkColors = {
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    primary: '#0A84FF',
    border: '#38383A',
    card: '#2C2C2E',
  };

  return theme === 'light' ? lightColors : darkColors;
};






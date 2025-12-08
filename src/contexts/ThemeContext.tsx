import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { toggleTheme as toggleThemeAction, fetchTheme } from '../store/slices/themeSlice';
import { getThemeColors, Theme } from '../store/slices/themeSlice';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    card: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.theme.theme);

  // Завантажити theme з SQLite при старті
  useEffect(() => {
    dispatch(fetchTheme() as any);
  }, [dispatch]);

  const toggleTheme = () => {
    // Викликаємо action, який автоматично збереже в SQLite
    dispatch(toggleThemeAction());
  };

  const colors = getThemeColors(theme);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};


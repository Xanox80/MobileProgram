import { useAppSelector, useAppDispatch } from '../store/hooks';
import { toggleTheme, getThemeColors } from '../store/slices/themeSlice';
import type { Theme } from '../store/slices/themeSlice';

/**
 * Redux-based theme hook (alternative to ThemeContext)
 * Use this if you want to use Redux for theme management
 */
export const useReduxTheme = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.theme);
  const colors = getThemeColors(theme);

  const toggleThemeHandler = () => {
    dispatch(toggleTheme());
  };

  return {
    theme,
    colors,
    toggleTheme: toggleThemeHandler,
  };
};






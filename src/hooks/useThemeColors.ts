import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { lightTheme, darkTheme, ThemeColors } from '../theme';

export function useThemeColors(): { colors: ThemeColors; isDark: boolean } {
  const systemColorScheme = useColorScheme();
  const themeMode = useAppStore((state) => state.themeMode);

  let isDark = false;
  if (themeMode === 'system') {
    isDark = systemColorScheme === 'dark';
  } else {
    isDark = themeMode === 'dark';
  }

  const colors = isDark ? darkTheme : lightTheme;
  return { colors, isDark };
}


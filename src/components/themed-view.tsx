import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useThemeColors } from '@/lib/theme';

export type ThemedViewProps = ViewProps & {
  type?: ThemeColor;
};

export function ThemedView({ style, type, ...otherProps }: ThemedViewProps) {
  const theme = useThemeColors();

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps} />;
}

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface BarChartProps {
  data: { label: string; value: number; color: string }[];
  maxValue?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, maxValue }) => {
  const { colors } = useTheme();
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.container}>
      {data.map((item, index) => {
        const height = (item.value / max) * 100;
        return (
          <View key={index} style={styles.barContainer}>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${height}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {item.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 200,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  barWrapper: {
    width: '100%',
    height: 150,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
});








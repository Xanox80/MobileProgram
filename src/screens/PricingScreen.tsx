import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  navigation: any;
}

export const PricingScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, colors } = useTheme();

  // Приклад даних розцінки - ви можете замінити на свої
  const pricingData = [
    { distance: '0-5 км', price: '50 грн' },
    { distance: '5-10 км', price: '80 грн' },
    { distance: '10-15 км', price: '120 грн' },
    { distance: '15-20 км', price: '150 грн' },
    { distance: '20+ км', price: '200 грн' },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Розцінка по відстані
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Вартість доставки залежить від відстані
          </Text>
        </View>

        <View style={styles.pricingList}>
          {pricingData.map((item, index) => (
            <View
              key={index}
              style={[
                styles.pricingItem,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.distance, { color: colors.text }]}>
                {item.distance}
              </Text>
              <Text style={[styles.price, { color: colors.primary }]}>
                {item.price}
              </Text>
            </View>
          ))}
        </View>

        {/* Тут ви можете додати додаткову інформацію */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            * Вартість може змінюватися залежно від ваги та обсягу вантажу
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  pricingList: {
    marginBottom: 24,
  },
  pricingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  distance: {
    fontSize: 18,
    fontWeight: '600',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  footerText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});


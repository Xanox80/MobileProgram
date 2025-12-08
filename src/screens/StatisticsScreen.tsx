import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { deliveryService } from '../services/deliveryService';
import { Delivery } from '../types/delivery';
import { BarChart } from '../components/BarChart';

interface Props {
  navigation: any;
}

export const StatisticsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    const data = await deliveryService.getAllDeliveries();
    setDeliveries(data);
  };
  const stats = useMemo(() => {
    const total = deliveries.length;
    const active = deliveries.filter(
      d => d.status !== 'delivered' && d.status !== 'cancelled',
    ).length;
    const delivered = deliveries.filter(d => d.status === 'delivered').length;
    const cancelled = deliveries.filter(d => d.status === 'cancelled').length;
    const inTransit = deliveries.filter(d => d.status === 'in_transit').length;
    const outForDelivery = deliveries.filter(
      d => d.status === 'out_for_delivery',
    ).length;

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    let filtered = deliveries;
    if (timeRange === 'week') {
      filtered = deliveries.filter(d => d.createdAt >= weekAgo);
    } else if (timeRange === 'month') {
      filtered = deliveries.filter(d => d.createdAt >= monthAgo);
    }

    const statusCounts = {
      pending: filtered.filter(d => d.status === 'pending').length,
      confirmed: filtered.filter(d => d.status === 'confirmed').length,
      in_transit: filtered.filter(d => d.status === 'in_transit').length,
      out_for_delivery: filtered.filter(d => d.status === 'out_for_delivery')
        .length,
      delivered: filtered.filter(d => d.status === 'delivered').length,
      cancelled: filtered.filter(d => d.status === 'cancelled').length,
    };

    const chartData = [
      { label: 'Очікує', value: statusCounts.pending, color: '#FF9500' },
      { label: 'Підтв.', value: statusCounts.confirmed, color: '#007AFF' },
      { label: 'В дорозі', value: statusCounts.in_transit, color: '#5856D6' },
      {
        label: 'Везуть',
        value: statusCounts.out_for_delivery,
        color: '#AF52DE',
      },
      { label: 'Достав.', value: statusCounts.delivered, color: '#34C759' },
      { label: 'Скас.', value: statusCounts.cancelled, color: '#FF3B30' },
    ];

    const avgRating =
      delivered > 0
        ? deliveries
            .filter(d => d.rating)
            .reduce((sum, d) => sum + (d.rating || 0), 0) /
          deliveries.filter(d => d.rating).length
        : 0;

    return {
      total,
      active,
      delivered,
      cancelled,
      inTransit,
      outForDelivery,
      chartData,
      avgRating: avgRating.toFixed(1),
      filteredCount: filtered.length,
    };
  }, [deliveries, timeRange]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Статистика</Text>

          <View style={styles.timeRangeContainer}>
            {(['week', 'month', 'all'] as const).map(range => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  {
                    backgroundColor:
                      timeRange === range ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    {
                      color: timeRange === range ? '#fff' : colors.text,
                    },
                  ]}
                >
                  {range === 'week'
                    ? 'Тиждень'
                    : range === 'month'
                    ? 'Місяць'
                    : 'Всі'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {stats.total}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Всього
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#34C759' }]}>
            <Text style={[styles.statNumber, { color: '#fff' }]}>
              {stats.delivered}
            </Text>
            <Text style={[styles.statLabel, { color: '#fff' }]}>
              Доставлено
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statNumber, { color: '#FF9500' }]}>
              {stats.active}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Активних
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Розподіл за статусами ({stats.filteredCount})
          </Text>
          <View
            style={[styles.chartContainer, { backgroundColor: colors.surface }]}
          >
            <BarChart data={stats.chartData} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Детальна статистика
          </Text>

          <View
            style={[styles.detailCard, { backgroundColor: colors.surface }]}
          >
            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                В дорозі
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {stats.inTransit}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Кур'єр везе
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {stats.outForDelivery}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Скасовано
              </Text>
              <Text style={[styles.detailValue, { color: '#FF3B30' }]}>
                {stats.cancelled}
              </Text>
            </View>
            {stats.avgRating !== '0.0' && (
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textSecondary }]}
                >
                  Середня оцінка
                </Text>
                <Text style={[styles.detailValue, { color: '#FF9500' }]}>
                  {stats.avgRating} ⭐
                </Text>
              </View>
            )}
          </View>
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
  header: {
    padding: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  chartContainer: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  detailLabel: {
    fontSize: 16,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

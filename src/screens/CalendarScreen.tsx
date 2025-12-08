import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { deliveryService } from '../services/deliveryService';
import { Delivery } from '../types/delivery';

interface Props {
  navigation: any;
}

export const CalendarScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    const data = await deliveryService.getAllDeliveries();
    setDeliveries(data);
  };

  const deliveriesByDate = useMemo(() => {
    const grouped: Record<string, Delivery[]> = {};
    deliveries.forEach(delivery => {
      const date = new Date(delivery.createdAt).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(delivery);
    });
    return grouped;
  }, [deliveries]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const days = getDaysInMonth(currentMonth);

  const getStatusColor = (status: Delivery['status']): string => {
    const colorMap: Record<Delivery['status'], string> = {
      pending: '#FF9500',
      confirmed: '#007AFF',
      in_transit: '#5856D6',
      out_for_delivery: '#AF52DE',
      delivered: '#34C759',
      cancelled: '#FF3B30',
    };
    return colorMap[status] || '#8E8E93';
  };

  const getStatusText = (status: Delivery['status']): string => {
    const statusMap: Record<Delivery['status'], string> = {
      pending: 'Очікує',
      confirmed: 'Підтверджено',
      in_transit: 'В дорозі',
      out_for_delivery: 'Везуть',
      delivered: 'Доставлено',
      cancelled: 'Скасовано',
    };
    return statusMap[status] || status;
  };

  const selectedDeliveries = deliveriesByDate[selectedDate] || [];

  const monthNames = [
    'Січень',
    'Лютий',
    'Березень',
    'Квітень',
    'Травень',
    'Червень',
    'Липень',
    'Серпень',
    'Вересень',
    'Жовтень',
    'Листопад',
    'Грудень',
  ];

  const weekDays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  const changeMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const hasDeliveries = (date: Date | null): boolean => {
    if (!date) return false;
    const dateStr = formatDate(date);
    return deliveriesByDate[dateStr]?.length > 0;
  };

  const getDeliveryCount = (date: Date | null): number => {
    if (!date) return 0;
    const dateStr = formatDate(date);
    return deliveriesByDate[dateStr]?.length || 0;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.calendarContainer}>
        <View style={[styles.calendarHeader, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => changeMonth('prev')}>
            <Text style={[styles.monthButton, { color: colors.primary }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => changeMonth('next')}>
            <Text style={[styles.monthButton, { color: colors.primary }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.weekDaysContainer, { backgroundColor: colors.surface }]}>
          {weekDays.map(day => (
            <View key={day} style={styles.weekDay}>
              <Text style={[styles.weekDayText, { color: colors.textSecondary }]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.calendarGrid, { backgroundColor: colors.surface }]}>
          {days.map((date, index) => {
            if (!date) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const dateStr = formatDate(date);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const count = getDeliveryCount(date);
            const hasDeliveriesOnDay = hasDeliveries(date);

            return (
              <TouchableOpacity
                key={dateStr}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: colors.primary },
                  isToday && !isSelected && { borderWidth: 2, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedDate(dateStr)}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: isSelected ? '#fff' : colors.text },
                    isToday && !isSelected && { fontWeight: 'bold' },
                  ]}
                >
                  {date.getDate()}
                </Text>
                {hasDeliveriesOnDay && (
                  <View
                    style={[
                      styles.deliveryDot,
                      {
                        backgroundColor: isSelected ? '#fff' : colors.primary,
                      },
                    ]}
                  />
                )}
                {count > 1 && (
                  <Text
                    style={[
                      styles.deliveryCount,
                      { color: isSelected ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {count}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.deliveriesContainer}>
        <Text style={[styles.deliveriesTitle, { color: colors.text }]}>
          Доставки на {new Date(selectedDate).toLocaleDateString('uk-UA')}
        </Text>
        {selectedDeliveries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Немає доставок на цю дату
            </Text>
          </View>
        ) : (
          <FlatList
            data={selectedDeliveries}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.deliveryCard, { backgroundColor: colors.surface }]}
                onPress={() => navigation.navigate('Tracking', { deliveryId: item.id })}
              >
                <View style={styles.deliveryCardHeader}>
                  <Text style={[styles.trackingNumber, { color: colors.text }]}>
                    #{item.trackingNumber}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(item.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusText(item.status)}
                    </Text>
                  </View>
                </View>
                {item.currentLocation && (
                  <Text style={[styles.location, { color: colors.textSecondary }]}>
                    📍 {item.currentLocation}
                  </Text>
                )}
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleTimeString('uk-UA', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  monthButton: {
    fontSize: 32,
    fontWeight: '300',
    paddingHorizontal: 16,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 2,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deliveryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 4,
  },
  deliveryCount: {
    fontSize: 10,
    position: 'absolute',
    bottom: 2,
  },
  deliveriesContainer: {
    flex: 1,
    padding: 16,
  },
  deliveriesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  deliveryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  location: {
    fontSize: 14,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  },
});








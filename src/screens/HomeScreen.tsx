import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Delivery } from '../types/delivery';
import { deliveryService } from '../services/deliveryService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDeliveries, setSelectedDelivery } from '../store/slices/deliveriesSlice';
import { fetchDeliveries as fetchDeliveriesThunk } from '../store/thunks/deliveriesThunks';

interface Props {
  navigation: any;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  
  // Використовуємо Redux замість локального стану
  const deliveries = useAppSelector((state) => state.deliveries.deliveries);
  const loading = useAppSelector((state) => state.deliveries.loading);
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<Delivery['status'] | 'all'>(
    'all',
  );
  const [showFilters, setShowFilters] = useState(false);

  const loadDeliveries = useCallback(async () => {
    await dispatch(fetchDeliveriesThunk());
  }, [dispatch]);

  useEffect(() => {
    loadDeliveries();

    // Restart auto-progress for active deliveries
    const restartAutoProgress = async () => {
      const deliveries = await deliveryService.getAllDeliveries();
      for (const delivery of deliveries) {
        if (
          delivery.status !== 'delivered' &&
          delivery.status !== 'cancelled'
        ) {
          // Check if delivery was created less than 2 minutes ago
          const timeSinceCreation = Date.now() - delivery.createdAt;
          if (timeSinceCreation < 2 * 60 * 1000) {
            await deliveryService.startAutoProgress(delivery.id);
          }
        }
      }
    };

    restartAutoProgress();

    // Refresh every 5 seconds
    const interval = setInterval(loadDeliveries, 5000);
    return () => clearInterval(interval);
  }, [loadDeliveries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDeliveries();
    setRefreshing(false);
  }, [loadDeliveries]);

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

  const getStatusProgress = (status: Delivery['status']): number => {
    const progressMap: Record<Delivery['status'], number> = {
      pending: 0.1,
      confirmed: 0.3,
      in_transit: 0.5,
      out_for_delivery: 0.8,
      delivered: 1.0,
      cancelled: 0,
    };
    return progressMap[status] || 0;
  };

  const getStats = () => {
    const active = deliveries.filter(
      d => d.status !== 'delivered' && d.status !== 'cancelled',
    ).length;
    const delivered = deliveries.filter(d => d.status === 'delivered').length;
    const total = deliveries.length;
    return { active, delivered, total };
  };

  const stats = getStats();

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch =
      delivery.trackingNumber
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      delivery.currentLocation
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' || delivery.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const DeliveryCard = ({ item }: { item: Delivery }) => {
    const progress = getStatusProgress(item.status);
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }, [progress, progressAnim]);

    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <TouchableOpacity
        style={styles.deliveryCard}
        onPress={() => {
          dispatch(setSelectedDelivery(item.id));
          navigation.navigate('Tracking', { deliveryId: item.id });
        }}
      >
        <View style={styles.deliveryHeader}>
          <Text style={styles.trackingNumber}>#{item.trackingNumber}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        {item.currentLocation && (
          <Text style={styles.location}>📍 {item.currentLocation}</Text>
        )}
        {item.rating && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{'⭐'.repeat(item.rating)}</Text>
          </View>
        )}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressWidth,
                  backgroundColor: getStatusColor(item.status),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}% завершено
          </Text>
        </View>
        <Text style={styles.date}>Оновлено: {formatDate(item.updatedAt)}</Text>
      </TouchableOpacity>
    );
  };

  const renderDelivery = ({ item }: { item: Delivery }) => (
    <DeliveryCard item={item} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Мої доставки</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => {
              Alert.alert('Відстеження', 'Як ви хочете додати доставку?', [
                {
                  text: 'Сканувати QR',
                  onPress: () => navigation.navigate('QRScanner'),
                },
                {
                  text: 'Ввести номер',
                  onPress: () => navigation.navigate('ManualTracking'),
                },
                { text: 'Скасувати', style: 'cancel' },
              ]);
            }}
          >
            <Text style={styles.scanButtonText}>➕ Додати</Text>
          </TouchableOpacity>
        </View>
      </View>

      {deliveries.length > 0 && (
        <>
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>Швидкі дії</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('QRScanner')}
              >
                <Text style={styles.quickActionIcon}>📷</Text>
                <Text style={styles.quickActionText}>QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('ManualTracking')}
              >
                <Text style={styles.quickActionIcon}>🔢</Text>
                <Text style={styles.quickActionText}>Номер</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('Statistics')}
              >
                <Text style={styles.quickActionIcon}>📊</Text>
                <Text style={styles.quickActionText}>Статистика</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => navigation.navigate('History')}
              >
                <Text style={styles.quickActionIcon}>📜</Text>
                <Text style={styles.quickActionText}>Історія</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  const activeDeliveries = deliveries.filter(
                    d => d.status !== 'delivered' && d.status !== 'cancelled',
                  );
                  if (activeDeliveries.length > 0) {
                    navigation.navigate('Tracking', {
                      deliveryId: activeDeliveries[0].id,
                    });
                  } else {
                    Alert.alert('Немає активних доставок');
                  }
                }}
              >
                <Text style={styles.quickActionIcon}>🚚</Text>
                <Text style={styles.quickActionText}>Активна</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Пошук за номером або місцем..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={styles.filterButtonText}>
                {showFilters ? '✕' : '⚙️'}
              </Text>
            </TouchableOpacity>
          </View>

          {showFilters && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersContainer}
              contentContainerStyle={styles.filtersContent}
            >
              {[
                'all',
                'pending',
                'confirmed',
                'in_transit',
                'out_for_delivery',
                'delivered',
                'cancelled',
              ].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    filterStatus === status && styles.filterChipActive,
                  ]}
                  onPress={() => {
                    setFilterStatus(status as Delivery['status'] | 'all');
                    setShowFilters(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterStatus === status && styles.filterChipTextActive,
                    ]}
                  >
                    {status === 'all'
                      ? 'Всі'
                      : getStatusText(status as Delivery['status'])}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.active}</Text>
              <Text style={styles.statLabel}>Активних</Text>
            </View>
            <View style={[styles.statCard, styles.statCardDelivered]}>
              <Text style={[styles.statNumber, styles.statNumberDelivered]}>
                {stats.delivered}
              </Text>
              <Text style={styles.statLabel}>Доставлено</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Всього</Text>
            </View>
          </View>
        </>
      )}

      {deliveries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Немає відстежуваних доставок</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <Text style={styles.emptyButtonText}>Сканувати QR код</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          renderItem={renderDelivery}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery || filterStatus !== 'all'
                  ? 'Нічого не знайдено'
                  : 'Немає відстежуваних доставок'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  filtersContainer: {
    maxHeight: 60,
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  profileButton: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyButton: {
    backgroundColor: '#8E8E93',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardDelivered: {
    backgroundColor: '#34C759',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statNumberDelivered: {
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
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
    color: '#8E8E93',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
  },
  progressContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  ratingBadge: {
    marginTop: 8,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

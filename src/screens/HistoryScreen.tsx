import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryHistoryItem, Delivery } from '../types/delivery';
import { storageService } from '../services/storage';

interface Props {
  navigation: any;
}

interface HistoryItemWithDelivery extends DeliveryHistoryItem {
  delivery?: Delivery;
}

export const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [history, setHistory] = useState<HistoryItemWithDelivery[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const allHistory = await storageService.getHistory();
    const deliveries = await storageService.getDeliveries();
    
    const historyWithDelivery = allHistory.map((item) => ({
      ...item,
      delivery: deliveries.find((d) => d.id === item.deliveryId),
    }));
    
    setHistory(historyWithDelivery);
  }, []);

  useEffect(() => {
    loadHistory();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      pending: '#FF9500',
      confirmed: '#007AFF',
      in_transit: '#5856D6',
      out_for_delivery: '#AF52DE',
      delivered: '#34C759',
      cancelled: '#FF3B30',
    };
    return colorMap[status] || '#8E8E93';
  };

  const renderHistoryItem = ({ item }: { item: HistoryItemWithDelivery }) => (
    <TouchableOpacity
      style={styles.historyCard}
      onPress={() => {
        if (item.delivery) {
          navigation.navigate('Tracking', { deliveryId: item.delivery.id });
        }
      }}>
      <View style={styles.historyHeader}>
        <Text style={styles.trackingNumber}>
          #{item.delivery?.trackingNumber || 'Невідомо'}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.message}>{item.message}</Text>
      {item.location && (
        <Text style={styles.location}>📍 {item.location}</Text>
      )}
      <Text style={styles.time}>{formatDateTime(item.timestamp)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Історія доставок</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Історія відсутня</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item, index) => `${item.deliveryId}_${item.timestamp}_${index}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
  list: {
    padding: 16,
  },
  historyCard: {
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#8E8E93',
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
    textAlign: 'center',
  },
});












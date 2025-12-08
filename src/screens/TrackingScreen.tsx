import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Delivery, DeliveryHistoryItem } from '../types/delivery';
import { storageService } from '../services/storage';
import { deliveryService } from '../services/deliveryService';

interface Props {
  navigation: any;
  route: { params: { deliveryId: string } };
}

export const TrackingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { deliveryId } = route.params;
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [history, setHistory] = useState<DeliveryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const loadData = useCallback(async () => {
    const [deliveryData, historyData] = await Promise.all([
      storageService.getDelivery(deliveryId),
      storageService.getHistory(deliveryId),
    ]);
    setDelivery(deliveryData);
    setHistory(historyData);
    setLoading(false);
  }, [deliveryId]);

  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getStatusText = (status: Delivery['status']): string => {
    const statusMap: Record<Delivery['status'], string> = {
      pending: 'Очікує обробки',
      confirmed: 'Підтверджено',
      in_transit: 'В дорозі',
      out_for_delivery: "Кур'єр везе",
      delivered: 'Доставлено',
      cancelled: 'Скасовано',
    };
    return statusMap[status] || status;
  };

  const getStatusProgress = (status: Delivery['status']): number => {
    const progressMap: Record<Delivery['status'], number> = {
      pending: 0,
      confirmed: 25,
      in_transit: 50,
      out_for_delivery: 75,
      delivered: 100,
      cancelled: 0,
    };
    return progressMap[status] || 0;
  };

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

  const handleSimulateProgress = async () => {
    Alert.alert('Симуляція прогресу', 'Оновити статус доставки?', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Так',
        onPress: async () => {
          await deliveryService.simulateProgress(deliveryId);
          await loadData();
        },
      },
    ]);
  };

  const handleRateDelivery = async () => {
    if (rating === 0) {
      Alert.alert('Помилка', 'Будь ласка, оберіть оцінку');
      return;
    }

    if (delivery) {
      const updatedDelivery = {
        ...delivery,
        rating,
        review: review.trim() || undefined,
      };
      await storageService.saveDelivery(updatedDelivery);
      setDelivery(updatedDelivery);
      setShowRatingModal(false);
      setRating(0);
      setReview('');
      Alert.alert('Дякуємо!', 'Ваша оцінка збережена');
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Text style={styles.star}>{star <= rating ? '⭐' : '☆'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading || !delivery) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  const progress = getStatusProgress(delivery.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.trackingNumber}>#{delivery.trackingNumber}</Text>
          <Text style={styles.status}>{getStatusText(delivery.status)}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>

        {delivery.currentLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Поточна локація</Text>
            <Text style={styles.sectionContent}>
              {delivery.currentLocation}
            </Text>
          </View>
        )}

        {delivery.address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Адреса доставки</Text>
            <Text style={styles.sectionContent}>
              {delivery.address}
            </Text>
          </View>
        )}

        {delivery.status === 'delivered' && !delivery.address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Адреса доставки</Text>
            <Text style={styles.sectionContent}>
              {delivery.currentLocation || 'Адреса не вказана'}
            </Text>
            <Text style={styles.sectionNote}>
              💡 Адреса буде відправлена на API автоматично
            </Text>
          </View>
        )}

        {delivery.estimatedDelivery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Орієнтовна доставка</Text>
            <Text style={styles.sectionContent}>
              {formatDateTime(delivery.estimatedDelivery)}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Історія</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyHistory}>Історія відсутня</Text>
          ) : (
            <View style={styles.timelineContainer}>
              {history.map((item, index) => {
                const isLast = index === history.length - 1;
                return (
                  <View key={index} style={styles.timelineItem}>
                    <View style={styles.timelineLineContainer}>
                      <View
                        style={[
                          styles.timelineDot,
                          { backgroundColor: isLast ? '#34C759' : '#007AFF' },
                        ]}
                      />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.historyMessage}>{item.message}</Text>
                      {item.location && (
                        <Text style={styles.historyLocation}>
                          📍 {item.location}
                        </Text>
                      )}
                      <Text style={styles.historyTime}>
                        {formatDateTime(item.timestamp)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {delivery.status === 'delivered' && !delivery.rating && (
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => setShowRatingModal(true)}
          >
            <Text style={styles.rateButtonText}>⭐ Оцінити доставку</Text>
          </TouchableOpacity>
        )}
        {delivery.rating && (
          <View style={styles.ratingSection}>
            <Text style={styles.ratingTitle}>Ваша оцінка</Text>
            <Text style={styles.ratingStars}>
              {'⭐'.repeat(delivery.rating)}
              {'☆'.repeat(5 - delivery.rating)}
            </Text>
            {delivery.review && (
              <Text style={styles.reviewText}>"{delivery.review}"</Text>
            )}
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={() => {
              Alert.alert('Дзвінок', "Зателефонувати кур'єру?", [
                { text: 'Скасувати', style: 'cancel' },
                {
                  text: 'Зателефонувати',
                  onPress: () => Alert.alert('Дзвінок', 'Дзвінок ініційовано'),
                },
              ]);
            }}
          >
            <Text style={styles.actionButtonText}>📞 Зателефонувати</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.simulateButton]}
            onPress={handleSimulateProgress}
          >
            <Text style={styles.simulateButtonText}>🔄 Оновити статус</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showRatingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Оцініть доставку</Text>
            {renderStars()}
            <TextInput
              style={styles.reviewInput}
              placeholder="Залиште відгук (необов'язково)"
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={4}
              value={review}
              onChangeText={setReview}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowRatingModal(false);
                  setRating(0);
                  setReview('');
                }}
              >
                <Text style={styles.modalCancelText}>Скасувати</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleRateDelivery}
              >
                <Text style={styles.modalSubmitText}>Відправити</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  trackingNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  status: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    color: '#000',
  },
  sectionNote: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  timelineContainer: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineLineContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 24,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E5EA',
    marginTop: 4,
    minHeight: 20,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    marginRight: 12,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  historyMessage: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  historyLocation: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyHistory: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  callButton: {
    backgroundColor: '#34C759',
  },
  simulateButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  simulateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rateButton: {
    backgroundColor: '#FF9500',
    margin: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  ratingSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  ratingStars: {
    fontSize: 24,
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 40,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

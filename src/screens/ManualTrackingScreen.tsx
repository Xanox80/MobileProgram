import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deliveryService } from '../services/deliveryService';

interface Props {
  navigation: any;
}

export const ManualTrackingScreen: React.FC<Props> = ({ navigation }) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = async () => {
    if (!trackingNumber.trim()) {
      Alert.alert('Помилка', 'Введіть номер відстеження');
      return;
    }

    setLoading(true);
    try {
      const delivery = await deliveryService.createDelivery(trackingNumber.trim());
      navigation.navigate('Tracking', { deliveryId: delivery.id });
    } catch (error) {
      console.error('Error tracking:', error);
      Alert.alert('Помилка', 'Не вдалося додати доставку');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Введіть номер відстеження</Text>
        <Text style={styles.subtitle}>
          Введіть номер доставки для відстеження
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Номер відстеження"
          value={trackingNumber}
          onChangeText={setTrackingNumber}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleTrack}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Відстежити</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Скасувати</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    padding: 16,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    textAlign: 'center',
  },
});












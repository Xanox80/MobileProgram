import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import { deliveryService } from '../services/deliveryService';

interface Props {
  navigation: any;
  route: any;
}

export const QRScannerScreen: React.FC<Props> = ({ navigation }) => {
  const [processing, setProcessing] = useState(false);
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  React.useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: async codes => {
      if (processing || codes.length === 0) return;

      const code = codes[0];
      if (!code?.value) return;

      setProcessing(true);

      try {
        const trackingNumber = code.value.trim();

        if (!trackingNumber) {
          Alert.alert('Помилка', 'Невірний QR код');
          setProcessing(false);
          return;
        }

        const delivery = await deliveryService.createDelivery(trackingNumber);

        Alert.alert(
          'Успішно!',
          `Доставка #${trackingNumber} додана до відстеження`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Tracking', { deliveryId: delivery.id });
              },
            },
          ],
        );
      } catch (error) {
        console.error('Error processing QR:', error);
        Alert.alert('Помилка', 'Не вдалося обробити QR код');
      } finally {
        setProcessing(false);
      }
    },
  });

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Запит дозволу камери...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Потрібен дозвіл на використання камери
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Камера не знайдена</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!processing}
        codeScanner={codeScanner}
      />
      <View style={styles.overlay}>
        <View style={styles.topContent}>
          <Text style={styles.title}>Скануйте QR код</Text>
          <Text style={styles.subtitle}>
            Наведіть камеру на QR код доставки
          </Text>
        </View>
        <View style={styles.scanArea}>
          <View style={styles.scanFrame} />
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Скасувати</Text>
        </TouchableOpacity>
      </View>
      {processing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.processingText}>Обробка...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topContent: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    margin: 20,
    marginBottom: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  processingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  processingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
});

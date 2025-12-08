import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { deliveryService } from '../services/deliveryService';
import { Delivery } from '../types/delivery';

interface Props {
  navigation: any;
}

export const UserProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, toggleTheme, colors } = useTheme();
  const [fullName, setFullName] = useState('Іван Іванов');
  const [email, setEmail] = useState('ivan@example.com');
  const [phone, setPhone] = useState('+380 99 123 45 67');
  const [city, setCity] = useState('Київ');
  const [isEditing, setIsEditing] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    const fetchDeliveries = async () => {
      const allDeliveries = await deliveryService.getAllDeliveries();
      setDeliveries(allDeliveries);
    };
    fetchDeliveries();
  }, []);

  const handleSave = () => {
    Alert.alert('Успіх', 'Профіль оновлено');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFullName('Іван Іванов');
    setEmail('ivan@example.com');
    setPhone('+380 99 123 45 67');
    setCity('Київ');
    setIsEditing(false);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    inputDisabled: {
      backgroundColor: colors.background,
      color: colors.textSecondary,
    },
    buttonCancel: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
  });

  return (
    <SafeAreaView
      style={[styles.container, dynamicStyles.container]}
      edges={['top']}
    >
      <ScrollView contentContainerStyle={dynamicStyles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {fullName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={[styles.title, dynamicStyles.title]}>
            Профіль користувача
          </Text>
        </View>

        <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
          <Text style={styles.themeToggleText}>
            {theme === 'dark' ? '☀️' : '🌙'}{' '}
            {theme === 'dark' ? 'Світла тема' : 'Темна тема'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.themeToggle,
            { backgroundColor: '#5856D6', marginTop: 12 },
          ]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.themeToggleText}>⚙️ Налаштування</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={dynamicStyles.label}>Повне ім'я</Text>
            <TextInput
              style={[
                dynamicStyles.input,
                !isEditing && dynamicStyles.inputDisabled,
              ]}
              value={fullName}
              onChangeText={setFullName}
              editable={isEditing}
              placeholder="Введіть повне ім'я"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={dynamicStyles.label}>Email</Text>
            <TextInput
              style={[
                dynamicStyles.input,
                !isEditing && dynamicStyles.inputDisabled,
              ]}
              value={email}
              onChangeText={setEmail}
              editable={isEditing}
              keyboardType="email-address"
              placeholder="Введіть email"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={dynamicStyles.label}>Телефон</Text>
            <TextInput
              style={[
                dynamicStyles.input,
                !isEditing && dynamicStyles.inputDisabled,
              ]}
              value={phone}
              onChangeText={setPhone}
              editable={isEditing}
              keyboardType="phone-pad"
              placeholder="Введіть телефон"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={dynamicStyles.label}>Місто</Text>
            <TextInput
              style={[
                dynamicStyles.input,
                !isEditing && dynamicStyles.inputDisabled,
              ]}
              value={city}
              onChangeText={setCity}
              editable={isEditing}
              placeholder="Введіть місто"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {!isEditing ? (
            <TouchableOpacity
              style={[styles.button, styles.buttonEdit]}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.buttonText}>Редагувати</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.button, styles.buttonSave]}
                onPress={handleSave}
              >
                <Text style={[styles.buttonText, styles.buttonTextWhite]}>
                  Зберегти
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonCancel,
                  dynamicStyles.buttonCancel,
                ]}
                onPress={handleCancel}
              >
                <Text style={[styles.buttonText, dynamicStyles.buttonText]}>
                  Скасувати
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        <View style={delivery.container}>
          <Text style={delivery.title}>Ваші доставки:</Text>
          <FlatList
            data={deliveries}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={delivery.card}>
                <Text style={delivery.number}>
                  Номер: {item.trackingNumber}
                </Text>
                <Text style={delivery.status}>Статус: {item.status}</Text>
                <Text style={delivery.date}>
                  Дата: {new Date(item.createdAt).toLocaleString('uk-UA')}
                </Text>
                {item.rating && (
                  <Text style={delivery.ratingText}>
                    {'⭐'.repeat(item.rating)}
                  </Text>
                )}
              </View>
            )}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const delivery = StyleSheet.create({
  container: {
    padding: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  ratingText: {
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 12,
    borderRadius: 10,
    elevation: 3, // Android тінь
    shadowColor: '#000', // iOS тінь
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  number: {
    fontSize: 16,
    color: '#5f86b3ff',
    fontWeight: '600',
    marginBottom: 3,
  },
  status: {
    fontSize: 15,
    color: '#252527ff',
    marginBottom: 3,
  },
  date: {
    fontSize: 14,
    color: '#c9af1bff',
  },
});
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonEdit: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonSave: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderColor: '#ddd',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffffff',
  },
  buttonTextWhite: {
    color: '#fff',
  },
  themeToggle: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  themeToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

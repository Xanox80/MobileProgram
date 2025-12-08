import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addDelivery, deleteDelivery, setSelectedDelivery } from '../store/slices/deliveriesSlice';
import { setSoundEnabled, setNotificationsEnabled } from '../store/slices/settingsSlice';
import { toggleTheme } from '../store/slices/themeSlice';
import { useReduxTheme } from '../hooks/useReduxTheme';
import { Delivery } from '../types/delivery';

/**
 * Приклад компонента, який використовує Redux
 * Це демонстраційний файл - показує як використовувати Redux в проєкті
 */
export const ReduxExample: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Отримати дані з Redux store
  const deliveries = useAppSelector((state) => state.deliveries.deliveries);
  const selectedDeliveryId = useAppSelector((state) => state.deliveries.selectedDeliveryId);
  const settings = useAppSelector((state) => state.settings.settings);
  const { theme, colors, toggleTheme: toggleThemeHandler } = useReduxTheme();

  // Приклад: додати тестову доставку
  const handleAddTestDelivery = () => {
    const testDelivery: Delivery = {
      id: `test_${Date.now()}`,
      trackingNumber: `TEST${Math.floor(Math.random() * 10000)}`,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch(addDelivery(testDelivery));
  };

  // Приклад: видалити доставку
  const handleDeleteDelivery = (id: string) => {
    dispatch(deleteDelivery(id));
  };

  // Приклад: вибрати доставку
  const handleSelectDelivery = (id: string) => {
    dispatch(setSelectedDelivery(id));
  };

  // Приклад: змінити налаштування
  const handleToggleSound = () => {
    dispatch(setSoundEnabled(!settings.soundEnabled));
  };

  const handleToggleNotifications = () => {
    dispatch(setNotificationsEnabled(!settings.notificationsEnabled));
  };

  // Приклад: перемкнути тему (через Redux)
  const handleToggleTheme = () => {
    dispatch(toggleTheme());
    // Або використати хук:
    // toggleThemeHandler();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Redux Example</Text>

      {/* Deliveries */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Deliveries ({deliveries.length})
        </Text>
        <Button title="Add Test Delivery" onPress={handleAddTestDelivery} />
        {deliveries.slice(0, 3).map((delivery) => (
          <View key={delivery.id} style={[styles.item, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.text }}>{delivery.trackingNumber}</Text>
            <Button
              title="Delete"
              onPress={() => handleDeleteDelivery(delivery.id)}
            />
          </View>
        ))}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        <Text style={{ color: colors.text }}>
          Sound: {settings.soundEnabled ? 'ON' : 'OFF'}
        </Text>
        <Button title="Toggle Sound" onPress={handleToggleSound} />
        <Text style={{ color: colors.text }}>
          Notifications: {settings.notificationsEnabled ? 'ON' : 'OFF'}
        </Text>
        <Button title="Toggle Notifications" onPress={handleToggleNotifications} />
      </View>

      {/* Theme */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
        <Text style={{ color: colors.text }}>Current: {theme}</Text>
        <Button title="Toggle Theme" onPress={handleToggleTheme} />
      </View>

      {/* Selected Delivery */}
      {selectedDeliveryId && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Selected: {selectedDeliveryId}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  item: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});






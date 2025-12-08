import { createAsyncThunk } from '@reduxjs/toolkit';
import { Delivery, DeliveryStatus } from '../../types/delivery';
import { deliveryService } from '../../services/deliveryService';
import { storageService } from '../../services/storage';
import { sendDeliveryToApi } from '../../services/apiService';

// Завантажити всі доставки
export const fetchDeliveries = createAsyncThunk(
  'deliveries/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const deliveries = await deliveryService.getAllDeliveries();
      return deliveries;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch deliveries');
    }
  },
);

// Створити нову доставку
export const createDelivery = createAsyncThunk(
  'deliveries/create',
  async (trackingNumber: string, { rejectWithValue }) => {
    try {
      const delivery = await deliveryService.createDelivery(trackingNumber);
      return delivery;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create delivery');
    }
  },
);

// Оновити статус доставки
export const updateDeliveryStatus = createAsyncThunk(
  'deliveries/updateStatus',
  async (
    payload: {
      deliveryId: string;
      status: DeliveryStatus;
      location?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const delivery = await deliveryService.updateDeliveryStatus(
        payload.deliveryId,
        payload.status,
        payload.location,
      );
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      // Відправити адресу на API коли доставка доставлена
      if (payload.status === 'delivered') {
        const addressToSend = delivery.address || delivery.currentLocation || '';
        console.log(`📦 Redux: Delivery ${payload.deliveryId} marked as delivered. Address: "${addressToSend}"`);
        
        if (addressToSend && addressToSend.trim() !== '') {
          // Відправляємо асинхронно, не блокуємо оновлення статусу
          // Якщо немає інтернету, адреса буде збережена в чергу синхронізації
          sendDeliveryToApi(addressToSend.trim(), payload.deliveryId)
            .then((success) => {
              if (success) {
                console.log(`✅ Redux: Successfully processed delivery ${payload.deliveryId} for API`);
              } else {
                console.warn(`⚠️ Redux: Failed to process delivery ${payload.deliveryId} for API`);
              }
            })
            .catch((error) => {
              console.error(`❌ Redux: Error sending delivery ${payload.deliveryId} to API:`, error);
            });
        } else {
          console.warn(`⚠️ Redux: No address available to send to API for delivery: ${payload.deliveryId}`);
        }
      }

      return delivery;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update delivery status');
    }
  },
);

// Видалити доставку
export const deleteDelivery = createAsyncThunk(
  'deliveries/delete',
  async (deliveryId: string, { rejectWithValue }) => {
    try {
      await storageService.deleteDelivery(deliveryId);
      return deliveryId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete delivery');
    }
  },
);

// Оновити доставку
export const updateDelivery = createAsyncThunk(
  'deliveries/update',
  async (delivery: Delivery, { rejectWithValue }) => {
    try {
      await storageService.saveDelivery(delivery);
      
      // Якщо доставка вже "delivered" і адреса оновлена, оновити sync_queue
      if (delivery.status === 'delivered' && (delivery.address || delivery.currentLocation)) {
        try {
          const { syncQueueQueries } = require('../../services/database');
          const addressToSend = delivery.address || delivery.currentLocation || '';
          
          // Знайти запис в sync_queue для цього deliveryId
          const pendingItems = syncQueueQueries.getPendingItems();
          const existingItem = pendingItems.find(item => item.deliveryId === delivery.id);
          
          if (existingItem) {
            // Оновити адресу в sync_queue
            syncQueueQueries.updateAddress(existingItem.id, addressToSend);
            console.log(`🔄 Updated address in sync_queue for delivery ${delivery.id}: "${addressToSend}"`);
          } else {
            // Якщо запису немає, додати новий (на випадок якщо не було інтернету раніше)
            const { syncService } = require('../../services/syncService');
            if (!syncService.isConnected()) {
              await syncService.addToQueue(addressToSend, delivery.id);
              console.log(`📥 Added updated address to sync_queue for delivery ${delivery.id}`);
            }
          }
        } catch (error) {
          // Не критично, просто логуємо
          console.warn('Error updating sync_queue with new address:', error);
        }
      }
      
      return delivery;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update delivery');
    }
  },
);

// Очистити всі доставки
export const clearAllDeliveries = createAsyncThunk(
  'deliveries/clearAll',
  async (_, { rejectWithValue }) => {
    try {
      await storageService.clearAll();
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to clear deliveries');
    }
  },
);




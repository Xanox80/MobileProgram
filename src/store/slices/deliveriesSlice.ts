import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Delivery, DeliveryStatus } from '../../types/delivery';
import {
  fetchDeliveries,
  createDelivery,
  updateDeliveryStatus,
  deleteDelivery as deleteDeliveryThunk,
  updateDelivery,
  clearAllDeliveries,
} from '../thunks/deliveriesThunks';

interface DeliveriesState {
  deliveries: Delivery[];
  loading: boolean;
  error: string | null;
  selectedDeliveryId: string | null;
}

const initialState: DeliveriesState = {
  deliveries: [],
  loading: false,
  error: null,
  selectedDeliveryId: null,
};

const deliveriesSlice = createSlice({
  name: 'deliveries',
  initialState,
  reducers: {
    setDeliveries: (state, action: PayloadAction<Delivery[]>) => {
      state.deliveries = action.payload;
      state.loading = false;
      state.error = null;
      // Зберігаємо всі доставки в SQLite
      try {
        const { deliveryQueries } = require('../../services/database');
        action.payload.forEach((delivery) => {
          deliveryQueries.saveDelivery(delivery);
        });
      } catch (error) {
        console.warn('Error saving deliveries to SQLite:', error);
      }
    },
    addDelivery: (state, action: PayloadAction<Delivery>) => {
      const existingIndex = state.deliveries.findIndex(
        (d) => d.id === action.payload.id,
      );
      if (existingIndex >= 0) {
        state.deliveries[existingIndex] = action.payload;
      } else {
        state.deliveries.push(action.payload);
      }
      // Sort by updatedAt descending
      state.deliveries.sort((a, b) => b.updatedAt - a.updatedAt);
      // Автоматично зберігаємо в SQLite
      try {
        const { deliveryQueries } = require('../../services/database');
        deliveryQueries.saveDelivery(action.payload);
      } catch (error) {
        console.warn('Error saving delivery to SQLite:', error);
      }
    },
    deleteDelivery: (state, action: PayloadAction<string>) => {
      state.deliveries = state.deliveries.filter(
        (d) => d.id !== action.payload,
      );
      // Автоматично видаляємо з SQLite
      try {
        const { deliveryQueries } = require('../../services/database');
        deliveryQueries.deleteDelivery(action.payload);
      } catch (error) {
        console.warn('Error deleting delivery from SQLite:', error);
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setSelectedDelivery: (state, action: PayloadAction<string | null>) => {
      state.selectedDeliveryId = action.payload;
    },
    clearDeliveries: (state) => {
      state.deliveries = [];
      state.selectedDeliveryId = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch deliveries
    builder
      .addCase(fetchDeliveries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeliveries.fulfilled, (state, action) => {
        state.deliveries = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchDeliveries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create delivery
    builder
      .addCase(createDelivery.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDelivery.fulfilled, (state, action) => {
        const existingIndex = state.deliveries.findIndex(
          (d) => d.id === action.payload.id,
        );
        if (existingIndex >= 0) {
          state.deliveries[existingIndex] = action.payload;
        } else {
          state.deliveries.push(action.payload);
        }
        state.deliveries.sort((a, b) => b.updatedAt - a.updatedAt);
        state.loading = false;
      })
      .addCase(createDelivery.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update delivery status
    builder
      .addCase(updateDeliveryStatus.fulfilled, (state, action) => {
        const index = state.deliveries.findIndex(
          (d) => d.id === action.payload.id,
        );
        if (index >= 0) {
          state.deliveries[index] = action.payload;
          state.deliveries.sort((a, b) => b.updatedAt - a.updatedAt);
        }
      });

    // Update delivery
    builder.addCase(updateDelivery.fulfilled, (state, action) => {
      const index = state.deliveries.findIndex(
        (d) => d.id === action.payload.id,
      );
      if (index >= 0) {
        state.deliveries[index] = action.payload;
        state.deliveries.sort((a, b) => b.updatedAt - a.updatedAt);
      }
    });

    // Delete delivery
    builder.addCase(deleteDeliveryThunk.fulfilled, (state, action) => {
      state.deliveries = state.deliveries.filter(
        (d) => d.id !== action.payload,
      );
      if (state.selectedDeliveryId === action.payload) {
        state.selectedDeliveryId = null;
      }
    });

    // Clear all deliveries
    builder.addCase(clearAllDeliveries.fulfilled, (state) => {
      state.deliveries = [];
      state.selectedDeliveryId = null;
    });
  },
});

export const {
  setDeliveries,
  addDelivery,
  deleteDelivery,
  setLoading,
  setError,
  setSelectedDelivery,
  clearDeliveries,
} = deliveriesSlice.actions;

export default deliveriesSlice.reducer;


import { open } from 'react-native-quick-sqlite';
import { Delivery, DeliveryHistoryItem } from '../types/delivery';

const DB_NAME = 'delivery_tracker.db';
let db: ReturnType<typeof open> | null = null;

// Ініціалізація бази даних
export const initDatabase = (): ReturnType<typeof open> => {
  if (db) {
    return db;
  }

  try {
    db = open({ name: DB_NAME, location: 'default' });

    // Створення таблиці deliveries
    db.execute(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id TEXT PRIMARY KEY,
        trackingNumber TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        estimatedDelivery INTEGER,
        currentLocation TEXT,
        recipient TEXT,
        address TEXT,
        rating INTEGER,
        review TEXT
      )
    `);

    // Створення індексу для швидкого пошуку по trackingNumber
    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_tracking_number 
      ON deliveries(trackingNumber)
    `);

    // Створення індексу для сортування по updatedAt
    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_updated_at 
      ON deliveries(updatedAt DESC)
    `);

    // Створення таблиці delivery_history
    db.execute(`
      CREATE TABLE IF NOT EXISTS delivery_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deliveryId TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        message TEXT NOT NULL,
        location TEXT,
        FOREIGN KEY (deliveryId) REFERENCES deliveries(id) ON DELETE CASCADE
      )
    `);

    // Створення індексів для history
    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_history_delivery_id 
      ON delivery_history(deliveryId)
    `);

    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_history_timestamp 
      ON delivery_history(timestamp DESC)
    `);

    // Створення таблиці settings
    db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Створення таблиці sync_queue для офлайн синхронізації
    db.execute(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT NOT NULL,
        deliveryId TEXT,
        createdAt INTEGER NOT NULL,
        retryCount INTEGER DEFAULT 0,
        lastError TEXT,
        synced INTEGER DEFAULT 0
      )
    `);

    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_synced 
      ON sync_queue(synced, createdAt)
    `);

    console.log('✅ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

export const getDatabase = (): ReturnType<typeof open> => {
  if (!db) {
    return initDatabase();
  }
  return db;
};

const rowToDelivery = (row: any): Delivery => {
  return {
    id: row.id,
    trackingNumber: row.trackingNumber,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    estimatedDelivery: row.estimatedDelivery || undefined,
    currentLocation: row.currentLocation || undefined,
    recipient: row.recipient || undefined,
    address: row.address || undefined,
    rating: row.rating || undefined,
    review: row.review || undefined,
  };
};

const rowToHistoryItem = (row: any): DeliveryHistoryItem => {
  return {
    deliveryId: row.deliveryId,
    status: row.status,
    timestamp: row.timestamp,
    message: row.message,
    location: row.location || undefined,
  };
};

export const deliveryQueries = {
  saveDelivery: (delivery: Delivery): void => {
    const database = getDatabase();
    try {
      database.execute(
        `INSERT OR REPLACE INTO deliveries (
          id, trackingNumber, status, createdAt, updatedAt,
          estimatedDelivery, currentLocation, recipient, address, rating, review
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          delivery.id,
          delivery.trackingNumber,
          delivery.status,
          delivery.createdAt,
          delivery.updatedAt,
          delivery.estimatedDelivery || null,
          delivery.currentLocation || null,
          delivery.recipient || null,
          delivery.address || null,
          delivery.rating || null,
          delivery.review || null,
        ],
      );
    } catch (error) {
      console.error('Error saving delivery:', error);
      throw error;
    }
  },

  getAllDeliveries: (): Delivery[] => {
    const database = getDatabase();
    try {
      const result = database.execute(
        'SELECT * FROM deliveries ORDER BY updatedAt DESC',
      );
      const rows = result.rows?._array || result.rows || [];
      return Array.isArray(rows) ? rows.map(rowToDelivery) : [];
    } catch (error) {
      console.error('Error getting deliveries:', error);
      return [];
    }
  },

  getDeliveryById: (id: string): Delivery | null => {
    const database = getDatabase();
    try {
      const result = database.execute('SELECT * FROM deliveries WHERE id = ?', [
        id,
      ]);
      const rows = result.rows?._array || result.rows || [];
      if (Array.isArray(rows) && rows.length > 0) {
        return rowToDelivery(rows[0]);
      }
      return null;
    } catch (error) {
      console.error('Error getting delivery by id:', error);
      return null;
    }
  },

  getDeliveryByTracking: (trackingNumber: string): Delivery | null => {
    const database = getDatabase();
    try {
      const result = database.execute(
        'SELECT * FROM deliveries WHERE trackingNumber = ?',
        [trackingNumber],
      );
      const rows = result.rows?._array || result.rows || [];
      if (Array.isArray(rows) && rows.length > 0) {
        return rowToDelivery(rows[0]);
      }
      return null;
    } catch (error) {
      console.error('Error getting delivery by tracking:', error);
      return null;
    }
  },

  deleteDelivery: (id: string): void => {
    const database = getDatabase();
    try {
      database.execute('DELETE FROM deliveries WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error deleting delivery:', error);
      throw error;
    }
  },
};

export const historyQueries = {
  addHistoryItem: (item: DeliveryHistoryItem): void => {
    const database = getDatabase();
    try {
      const existing = database.execute(
        'SELECT id FROM delivery_history WHERE deliveryId = ? ORDER BY timestamp DESC',
        [item.deliveryId],
      );
      const rows = existing.rows?._array || existing.rows || [];

      if (rows.length >= 100) {
        const idsToKeep = rows.slice(0, 100).map((r: any) => r.id);
        if (idsToKeep.length > 0) {
          const placeholders = idsToKeep.map(() => '?').join(',');
          database.execute(
            `DELETE FROM delivery_history WHERE deliveryId = ? AND id NOT IN (${placeholders})`,
            [item.deliveryId, ...idsToKeep],
          );
        }
      }

      database.execute(
        `INSERT INTO delivery_history (deliveryId, status, timestamp, message, location)
         VALUES (?, ?, ?, ?, ?)`,
        [
          item.deliveryId,
          item.status,
          item.timestamp,
          item.message,
          item.location || null,
        ],
      );
    } catch (error) {
      console.error('Error adding history item:', error);
      throw error;
    }
  },

  getHistory: (deliveryId?: string): DeliveryHistoryItem[] => {
    const database = getDatabase();
    try {
      let result;
      if (deliveryId) {
        result = database.execute(
          'SELECT * FROM delivery_history WHERE deliveryId = ? ORDER BY timestamp DESC',
          [deliveryId],
        );
      } else {
        result = database.execute(
          'SELECT * FROM delivery_history ORDER BY timestamp DESC',
        );
      }
      const rows = result.rows?._array || result.rows || [];
      return Array.isArray(rows) ? rows.map(rowToHistoryItem) : [];
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  },
};

export const settingsQueries = {
  getSetting: (key: string): string | null => {
    const database = getDatabase();
    try {
      const result = database.execute(
        'SELECT value FROM settings WHERE key = ?',
        [key],
      );
      const rows = result.rows?._array || result.rows || [];
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0].value;
      }
      return null;
    } catch (error) {
      console.error('Error getting setting:', error);
      return null;
    }
  },

  setSetting: (key: string, value: string): void => {
    const database = getDatabase();
    try {
      database.execute(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, value],
      );
    } catch (error) {
      console.error('Error setting setting:', error);
      throw error;
    }
  },

  deleteSetting: (key: string): void => {
    const database = getDatabase();
    try {
      database.execute('DELETE FROM settings WHERE key = ?', [key]);
    } catch (error) {
      console.error('Error deleting setting:', error);
      throw error;
    }
  },
};

export interface SyncQueueItem {
  id: number;
  address: string;
  deliveryId: string | null;
  createdAt: number;
  retryCount: number;
  lastError: string | null;
  synced: number;
}

export const syncQueueQueries = {
  addToQueue: (address: string, deliveryId?: string): void => {
    const database = getDatabase();
    try {
      database.execute(
        `INSERT INTO sync_queue (address, deliveryId, createdAt, retryCount, synced)
         VALUES (?, ?, ?, 0, 0)`,
        [address, deliveryId || null, Date.now()],
      );
      console.log('📥 Added to sync queue:', address);
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      throw error;
    }
  },

  getPendingItems: (): SyncQueueItem[] => {
    const database = getDatabase();
    try {
      const result = database.execute(
        'SELECT * FROM sync_queue WHERE synced = 0 ORDER BY createdAt ASC',
      );
      const rows = result.rows?._array || result.rows || [];
      return Array.isArray(rows)
        ? rows.map((row: any) => ({
            id: row.id,
            address: row.address,
            deliveryId: row.deliveryId,
            createdAt: row.createdAt,
            retryCount: row.retryCount,
            lastError: row.lastError,
            synced: row.synced,
          }))
        : [];
    } catch (error) {
      console.error('Error getting pending sync items:', error);
      return [];
    }
  },

  markAsSynced: (id: number): void => {
    const database = getDatabase();
    try {
      database.execute('UPDATE sync_queue SET synced = 1 WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error marking as synced:', error);
      throw error;
    }
  },

  updateRetry: (id: number, error: string): void => {
    const database = getDatabase();
    try {
      database.execute(
        'UPDATE sync_queue SET retryCount = retryCount + 1, lastError = ? WHERE id = ?',
        [error, id],
      );
    } catch (error) {
      console.error('Error updating retry:', error);
      throw error;
    }
  },

  updateAddress: (id: number, address: string): void => {
    const database = getDatabase();
    try {
      database.execute('UPDATE sync_queue SET address = ? WHERE id = ?', [
        address,
        id,
      ]);
      console.log(`✅ Updated address in sync queue item ${id}`);
    } catch (error) {
      console.error('Error updating address in sync queue:', error);
      throw error;
    }
  },

  cleanOldSyncedItems: (): void => {
    const database = getDatabase();
    try {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      database.execute(
        'DELETE FROM sync_queue WHERE synced = 1 AND createdAt < ?',
        [sevenDaysAgo],
      );
    } catch (error) {
      console.error('Error cleaning old synced items:', error);
    }
  },
};

export const clearAll = (): void => {
  const database = getDatabase();
  try {
    database.execute('DELETE FROM delivery_history');
    database.execute('DELETE FROM deliveries');
    database.execute('DELETE FROM settings');
    database.execute('DELETE FROM sync_queue');
    console.log('✅ Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
};

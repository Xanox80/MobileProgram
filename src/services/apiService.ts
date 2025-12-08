// Для Android емулятора використовуємо 10.0.2.2 замість localhost
// Для реального пристрою використовуйте IP адресу вашого комп'ютера
export const getApiBaseUrl = (): string => {
  // Можна змінити на IP адресу вашого комп'ютера для тестування на реальному пристрої
  // Наприклад: 'http://192.168.1.100:3000'
  
  // Перевірка чи це development режим
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;
  
  // Для Android емулятора використовуємо 10.0.2.2
  // Для iOS емулятора або веб - localhost
  // Для реального пристрою - замініть на IP вашого комп'ютера
  return isDev 
    ? 'http://10.0.2.2:3000' // Android емулятор (за замовчуванням)
    : 'http://localhost:3000'; // iOS емулятор / веб
};

interface DeliveryApiPayload {
  address: string;
}

/**
 * Відправити адресу доставки на API
 * Викликається коли доставка стає "delivered"
 * Якщо немає інтернету, зберігає в чергу синхронізації
 */
export const sendDeliveryToApi = async (
  address: string,
  deliveryId?: string,
): Promise<boolean> => {
  if (!address || address.trim() === '') {
    console.warn('⚠️ Empty address, cannot send to API');
    return false;
  }

  console.log(`📤 Attempting to send delivery to API:`, { address, deliveryId });

  // Lazy import syncService щоб уникнути циклічних залежностей
  let syncService: any;
  try {
    syncService = require('./syncService').syncService;
  } catch (error) {
    console.warn('SyncService not available:', error);
  }

  // Перевірити чи є інтернет
  let hasInternet = true;
  try {
    if (syncService) {
      hasInternet = syncService.isConnected();
      console.log(`🌐 Internet status: ${hasInternet ? 'ONLINE' : 'OFFLINE'}`);
    } else {
      // Якщо syncService не доступний, спробуємо відправити одразу
      console.log('⚠️ SyncService not available, attempting direct send');
    }
  } catch (error) {
    console.warn('Error checking internet status:', error);
    // Продовжуємо спробу відправки
  }

  if (!hasInternet && syncService) {
    // Немає інтернету - зберегти в чергу
    console.log('📴 No internet, saving to sync queue:', address);
    try {
      await syncService.addToQueue(address, deliveryId);
      console.log('✅ Saved to sync queue successfully');
      return true; // Повертаємо true, бо дані збережені
    } catch (error: any) {
      console.error('❌ Failed to add to sync queue:', error.message);
      return false;
    }
  }

  // Є інтернет або syncService не доступний - спробувати відправити одразу
  try {
    const payload: DeliveryApiPayload = {
      address: address.trim(),
    };

    const apiUrl = getApiBaseUrl();
    const fullUrl = `${apiUrl}/delivery`;
    
    console.log(`📤 Sending to API: ${fullUrl}`, payload);

    // Створюємо AbortController для таймауту (fallback для старіших версій)
    let abortController: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      abortController = new AbortController();
      timeoutId = setTimeout(() => {
        abortController?.abort();
      }, 10000); // 10 секунд таймаут
    } catch (e) {
      // Якщо AbortController не підтримується, продовжуємо без таймауту
      console.warn('AbortController not available, continuing without timeout');
    }

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    if (abortController) {
      fetchOptions.signal = abortController.signal;
    }

    const response = await fetch(fullUrl, fetchOptions);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`API request failed: ${response.status} ${response.statusText}. Response: ${errorText}`);
    }

    const data = await response.json().catch(() => ({}));
    console.log('✅ Delivery sent to API successfully:', data);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send delivery to API:', error.message);
    console.error('Error details:', error);
    
    // Помилка відправки - зберегти в чергу для повторної спроби
    if (syncService) {
      try {
        console.log('💾 Saving to sync queue for retry...');
        await syncService.addToQueue(address, deliveryId);
        console.log('✅ Saved to sync queue for retry');
        return true; // Повертаємо true, бо дані збережені в чергу
      } catch (queueError: any) {
        console.error('❌ Failed to add to sync queue:', queueError.message);
        return false;
      }
    } else {
      console.warn('⚠️ SyncService not available, cannot save to queue');
      return false;
    }
  }
};

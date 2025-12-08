/**
 * Тестовий файл для перевірки API
 * Можна викликати з консолі для діагностики
 */

import { getApiBaseUrl, sendDeliveryToApi } from './apiService';

/**
 * Тестова функція для перевірки API
 */
export const testApiConnection = async (): Promise<void> => {
  const apiUrl = getApiBaseUrl();
  console.log(`🔍 Testing API connection to: ${apiUrl}/delivery`);

  try {
    // Спробувати зробити простий запит
    const response = await fetch(`${apiUrl}/delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address: 'TEST ADDRESS' }),
    });

    console.log(`✅ API Response Status: ${response.status}`);
    const data = await response.json().catch(() => ({}));
    console.log(`✅ API Response Data:`, data);
  } catch (error: any) {
    console.error(`❌ API Test Failed:`, error.message);
    console.error(`Full error:`, error);
  }
};

/**
 * Тестова функція для відправки адреси
 */
export const testSendAddress = async (address: string = 'Test Address 123'): Promise<void> => {
  console.log(`🧪 Testing sendDeliveryToApi with address: "${address}"`);
  const result = await sendDeliveryToApi(address, 'test-delivery-id');
  console.log(`🧪 Test result:`, result ? 'SUCCESS' : 'FAILED');
};

// Експортуємо для використання в консолі
if (typeof global !== 'undefined') {
  (global as any).testApiConnection = testApiConnection;
  (global as any).testSendAddress = testSendAddress;
}



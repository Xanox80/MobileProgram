# Firebase Remote Notifications - Інструкція

## ✅ Що вже налаштовано

1. ✅ Firebase пакети встановлені (`@react-native-firebase/app`, `@react-native-firebase/messaging`)
2. ✅ Background message handler налаштований в `index.js`
3. ✅ AndroidManifest.xml містить правильний Firebase service
4. ✅ Запит permissions додано в `App.tsx`
5. ✅ Обробка foreground/background/quit станів налаштована

## 📱 Отримання FCM Token

FCM token отримується автоматично при ініціалізації Firebase. Він виводиться в консоль:
```
📱 FCM TOKEN: <your-token-here>
```

**Важливо:** Цей token потрібно відправити на ваш backend для збереження та використання при відправці push-сповіщень.

## 🔥 ВАЖЛИВО: Правильний payload для remote notifications

Щоб push-сповіщення працювали коли додаток **повністю закритий**, повідомлення **ОБОВ'ЯЗКОВО** має містити `notification` payload, а не тільки `data`!

### ✅ Правильний формат (працює коли додаток закритий):

```json
{
  "to": "DEVICE_FCM_TOKEN",
  "notification": {
    "title": "Доставка оновлена",
    "body": "Кур'єр везе ваше замовлення"
  },
  "data": {
    "deliveryId": "delivery_123",
    "status": "out_for_delivery",
    "location": "Київ, в дорозі до вас"
  }
}
```

### ❌ Неправильний формат (НЕ працює коли додаток закритий):

```json
{
  "to": "DEVICE_FCM_TOKEN",
  "data": {
    "deliveryId": "delivery_123",
    "status": "out_for_delivery"
  }
}
```

**Проблема:** Якщо відправити тільки `data` без `notification`, push не прийде коли додаток закритий.

## 🔧 Приклад для Backend (Node.js)

### Встановлення Firebase Admin SDK:

```bash
npm install firebase-admin
```

### Ініціалізація:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

### Відправка notification:

```javascript
async function sendDeliveryNotification(fcmToken, delivery) {
  const message = {
    token: fcmToken,
    notification: {
      title: 'Доставка оновлена',
      body: `Замовлення #${delivery.trackingNumber} ${getStatusMessage(delivery.status)}`,
    },
    data: {
      deliveryId: delivery.id,
      trackingNumber: delivery.trackingNumber,
      status: delivery.status,
      location: delivery.currentLocation || '',
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'delivery-tracker-channel',
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
}
```

### Приклад для різних статусів:

```javascript
function getStatusMessage(status) {
  const messages = {
    pending: 'очікує обробки',
    confirmed: 'підтверджено',
    in_transit: 'прибуло до відділення',
    out_for_delivery: 'кур\'єр везе ваше замовлення',
    delivered: 'доставлено! Можете забрати у відділенні',
    cancelled: 'скасовано',
  };
  return messages[status] || 'оновлено';
}
```

## 📋 HTTP API приклад (альтернатива)

Якщо не використовуєте Admin SDK, можна використати HTTP API:

```bash
curl -X POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "DEVICE_FCM_TOKEN",
      "notification": {
        "title": "Доставка оновлена",
        "body": "Кур\'єр везе ваше замовлення"
      },
      "data": {
        "deliveryId": "delivery_123",
        "status": "out_for_delivery"
      }
    }
  }'
```

## 🎯 Стани додатку та обробка notifications

1. **Foreground** (додаток відкритий):
   - Обробляється через `messaging().onMessage()`
   - Показується local notification

2. **Background** (додаток мінімізований):
   - Обробляється через `setBackgroundMessageHandler()` в `index.js`
   - Android автоматично показує notification з `notification` payload

3. **Quit/Killed** (додаток повністю закритий):
   - Android автоматично показує notification з `notification` payload
   - Коли користувач натискає на notification, додаток відкривається і обробляє `data` payload

## 🔔 Налаштування звуку та сповіщень

Додаток автоматично враховує налаштування користувача:
- Якщо `notificationsEnabled = false` - notifications не показуються
- Якщо `soundEnabled = false` - notifications без звуку

## 📝 Чеклист для тестування

- [ ] FCM token отримується та виводиться в консоль
- [ ] Permissions запитуються при старті додатку
- [ ] Notification приходить коли додаток у foreground
- [ ] Notification приходить коли додаток у background
- [ ] Notification приходить коли додаток повністю закритий (force kill)
- [ ] При натисканні на notification додаток відкривається
- [ ] Data payload обробляється правильно

## 🐛 Troubleshooting

### Notification не приходить коли додаток закритий:
- ✅ Перевірте що payload містить `notification`, а не тільки `data`
- ✅ Перевірте що FCM token правильний
- ✅ Перевірте що Firebase правильно налаштований (google-services.json)

### Permission denied:
- ✅ Перевірте що запит permissions виконується
- ✅ Перевірте налаштування дозволів в Android Settings

### Background handler не працює:
- ✅ Перевірте що `setBackgroundMessageHandler` викликається в `index.js` (не в App.tsx!)
- ✅ Перевірте що AndroidManifest.xml містить правильний service






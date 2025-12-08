# Redux Store Structure

## Overview

Цей проєкт використовує Redux Toolkit для управління станом додатку.

## Структура

```
src/store/
├── index.ts                 # Store configuration та exports
├── hooks.ts                 # Typed hooks (useAppDispatch, useAppSelector)
├── slices/
│   ├── deliveriesSlice.ts   # State для доставок
│   ├── settingsSlice.ts     # State для налаштувань
│   └── themeSlice.ts        # State для теми
└── README.md
```

## Slices

### 1. Deliveries Slice (`deliveriesSlice.ts`)

Управляє станом доставок.

**State:**
```typescript
{
  deliveries: Delivery[];
  loading: boolean;
  error: string | null;
  selectedDeliveryId: string | null;
}
```

**Actions:**
- `setDeliveries(deliveries)` - встановити всі доставки
- `addDelivery(delivery)` - додати/оновити доставку
- `updateDelivery(delivery)` - оновити доставку
- `deleteDelivery(id)` - видалити доставку
- `updateDeliveryStatus({ deliveryId, status, location })` - оновити статус
- `setSelectedDelivery(id)` - вибрати доставку
- `clearDeliveries()` - очистити всі доставки

**Приклад використання:**
```typescript
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addDelivery, setDeliveries } from '../store/slices/deliveriesSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const deliveries = useAppSelector((state) => state.deliveries.deliveries);
  
  const handleAddDelivery = (delivery: Delivery) => {
    dispatch(addDelivery(delivery));
  };
  
  return (...);
}
```

### 2. Settings Slice (`settingsSlice.ts`)

Управляє налаштуваннями додатку.

**State:**
```typescript
{
  settings: {
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    autoRefreshEnabled: boolean;
  }
}
```

**Actions:**
- `setSettings(settings)` - встановити всі налаштування
- `setNotificationsEnabled(enabled)` - увімкнути/вимкнути сповіщення
- `setSoundEnabled(enabled)` - увімкнути/вимкнути звук
- `setAutoRefreshEnabled(enabled)` - увімкнути/вимкнути автооновлення
- `resetSettings()` - скинути до дефолтних налаштувань

**Приклад використання:**
```typescript
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSoundEnabled } from '../store/slices/settingsSlice';

function SettingsComponent() {
  const dispatch = useAppDispatch();
  const soundEnabled = useAppSelector((state) => state.settings.settings.soundEnabled);
  
  const handleToggleSound = (enabled: boolean) => {
    dispatch(setSoundEnabled(enabled));
  };
  
  return (...);
}
```

### 3. Theme Slice (`themeSlice.ts`)

Управляє темою додатку (light/dark).

**State:**
```typescript
{
  theme: 'light' | 'dark';
}
```

**Actions:**
- `setTheme(theme)` - встановити тему
- `toggleTheme()` - перемкнути тему

**Helper:**
- `getThemeColors(theme)` - отримати кольори для теми

**Приклад використання:**
```typescript
import { useReduxTheme } from '../hooks/useReduxTheme';

function MyComponent() {
  const { theme, colors, toggleTheme } = useReduxTheme();
  
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Button onPress={toggleTheme} title="Toggle Theme" />
    </View>
  );
}
```

## Redux Persist

Стани автоматично зберігаються в AsyncStorage через `redux-persist`. При перезапуску додатку стани відновлюються автоматично.

## Типізація

Використовуйте типізовані хуки:
- `useAppDispatch()` - замість `useDispatch()`
- `useAppSelector()` - замість `useSelector()`

Це забезпечує повну типізацію TypeScript.

## Міграція з Context API

Якщо ви хочете мігрувати з Context API на Redux:

1. **Theme:** Використовуйте `useReduxTheme()` замість `useTheme()`
2. **Settings:** Використовуйте Redux hooks замість `settingsService`
3. **Deliveries:** Використовуйте Redux actions замість прямого виклику `storageService`

## Синхронізація з SQLite

Для синхронізації Redux state з SQLite, можна використовувати middleware або підписуватися на зміни:

```typescript
// Приклад middleware для синхронізації
const syncMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  
  // Синхронізувати з SQLite при зміні deliveries
  if (action.type.startsWith('deliveries/')) {
    const deliveries = store.getState().deliveries.deliveries;
    // Зберегти в SQLite
    storageService.saveDeliveries(deliveries);
  }
  
  return result;
};
```






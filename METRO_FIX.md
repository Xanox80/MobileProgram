# Виправлення помилки "Unable to load script"

## Швидке виправлення:

### 1. Зупинити всі процеси Metro:
```bash
# Закрити всі термінали з Metro
# Або натиснути Ctrl+C в терміналі де запущений Metro
```

### 2. Очистити кеш та перезапустити:

**Варіант A: Використовуючи npm скрипти:**
```bash
npm run start:reset
```

**Варіант B: Вручну:**
```bash
# Очистити кеш Metro
npx react-native start --reset-cache

# В іншому терміналі запустити Android
npm run android
```

### 3. Якщо використовуєш USB підключення (фізичний пристрій):

```bash
adb reverse tcp:8081 tcp:8081
```

### 4. Якщо використовуєш Wi-Fi:

Переконайся що пристрій і комп'ютер на одній мережі Wi-Fi.

## Детальні кроки:

### Крок 1: Зупинити Metro
- Закрити всі термінали
- Або натиснути `Ctrl+C` в терміналі з Metro

### Крок 2: Очистити кеш
```bash
# Очистити кеш Metro
npm run start:reset

# Або вручну
npx react-native start --reset-cache
```

### Крок 3: Очистити Android build (якщо потрібно)
```bash
npm run android:clean
```

### Крок 4: Запустити додаток
```bash
# В новому терміналі
npm run android
```

### Крок 5: Якщо використовуєш фізичний пристрій через USB:
```bash
adb reverse tcp:8081 tcp:8081
```

## Альтернативні рішення:

### Якщо проблема залишається:

1. **Перевірити чи Metro запущений:**
   - Має бути відкритий термінал з Metro bundler
   - Має показувати "Metro waiting on..."

2. **Перевірити підключення:**
   - Для емулятора: має працювати автоматично
   - Для фізичного пристрою: виконати `adb reverse tcp:8081 tcp:8081`

3. **Перевірити firewall:**
   - Дозволити Node.js через firewall
   - Дозволити порт 8081

4. **Повна очистка:**
```bash
# Очистити всі кеші
rm -rf node_modules
npm install
npm run start:reset
```

## Для Windows PowerShell:

```powershell
# Очистити кеш Metro
npx react-native start --reset-cache

# В іншому терміналі
npm run android
```

## Перевірка:

Після виконання команд, Metro має показати:
```
Metro waiting on exp://...
```

А додаток має завантажитися без помилки "Unable to load script".



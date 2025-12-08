declare module 'react-native-push-notification' {
  export interface PushNotificationToken {
    token: string;
    os: string;
  }

  export interface PushNotification {
    foreground?: boolean;
    userInteraction?: boolean;
    message?: string;
    data?: any;
    userInfo?: any;
    id?: string;
    title?: string;
    sound?: string;
    badge?: number;
    tag?: string;
    alert?: any;
    finish?: (fetchResult: string) => void;
  }

  export interface PushNotificationPermissions {
    alert?: boolean;
    badge?: boolean;
    sound?: boolean;
  }

  export interface PushNotificationConfig {
    onRegister?: (token: PushNotificationToken) => void;
    onNotification?: (notification: PushNotification) => void;
    onAction?: (notification: PushNotification) => void;
    onRegistrationError?: (err: Error) => void;
    permissions?: PushNotificationPermissions;
    popInitialNotification?: boolean;
    requestPermissions?: boolean;
  }

  export interface LocalNotification {
    title?: string;
    message: string;
    userInfo?: any;
    playSound?: boolean;
    soundName?: string;
    number?: number;
    actions?: string[];
    tag?: string;
    group?: string;
    ongoing?: boolean;
    priority?: 'max' | 'high' | 'low' | 'min' | 'default';
    visibility?: 'private' | 'public' | 'secret';
    importance?: 'default' | 'max' | 'high' | 'low' | 'min' | 'none' | 'unspecified';
    allowWhileIdle?: boolean;
    ignoreInForeground?: boolean;
    channelId?: string;
    smallIcon?: string;
    largeIcon?: string;
    bigText?: string;
    subText?: string;
    bigPictureUrl?: string;
    color?: string;
    vibrate?: boolean;
    vibration?: number;
    when?: number | null;
    usesChronometer?: boolean;
    timeoutAfter?: number | null;
    invokeApp?: boolean;
    userInfo?: any;
    id?: string;
  }

  export interface LocalNotificationSchedule extends LocalNotification {
    date: Date | number;
    repeatType?: 'week' | 'day' | 'hour' | 'minute' | 'time';
    repeatTime?: number;
  }

  class PushNotificationClass {
    configure(config: PushNotificationConfig): void;
    localNotification(notification: LocalNotification): void;
    localNotificationSchedule(notification: LocalNotificationSchedule): void;
    cancelLocalNotifications(details: { id: string }): void;
    cancelAllLocalNotifications(): void;
    removeAllDeliveredNotifications(): void;
    getDeliveredNotifications(callback: (notifications: PushNotification[]) => void): void;
    setApplicationIconBadgeNumber(number: number): void;
    getApplicationIconBadgeNumber(callback: (badgeCount: number) => void): void;
    popInitialNotification(callback: (notification: PushNotification | null) => void): void;
    abandonPermissions(): void;
    checkPermissions(callback: (permissions: PushNotificationPermissions) => void): void;
    requestPermissions(permissions?: PushNotificationPermissions): Promise<PushNotificationPermissions>;
    clearNotifications(): void;
    removeDeliveredNotifications(identifiers: string[]): void;
  }

  const PushNotification: PushNotificationClass;
  export default PushNotification;
}












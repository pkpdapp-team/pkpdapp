export type ValueOf<T> = T[keyof T];

export const notificationTypes = {
  SUCCESS: "Success",
  ERROR: "Error",
  INFORMATION: "Information",
} as const;

export type NotificationTypes = ValueOf<typeof notificationTypes>;

export enum NOTIFICATION_VISIBILITY_TIME {
  DEFAULT = 3500,
  LONG = 5000,
  MINUTE = 60000,
}

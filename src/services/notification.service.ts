import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification presentation handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPresentAlert: true,
  }),
});

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch {
      return false;
    }
  }

  static async scheduleDailyExpenseReminder(timeStr: string = '21:00', language: 'en' | 'bn' = 'bn'): Promise<void> {
    try {
      await this.cancelNotificationGroup('daily_expense_reminder');

      const parts = timeStr.split(':');
      const hour = parseInt(parts[0], 10) || 21;
      const minute = parseInt(parts[1], 10) || 0;

      const title = language === 'bn' ? 'আজকের হিসাবের সময় হয়েছে!' : "Time for Today's Expense Log!";
      const body =
        language === 'bn'
          ? 'আজকের সকল আয়-ব্যয় ও নগদ টাকার হিসাব মিলিয়ে দিনটি শেষ করুন।'
          : 'Record today’s expenses and reconcile your daily cash in PocketFlow.';

      await Notifications.scheduleNotificationAsync({
        identifier: 'daily_expense_reminder',
        content: {
          title,
          body,
          sound: true,
          data: { type: 'daily_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    } catch (e) {
      // Offline fallback: silence errors if notifications are unsupported on some emulators
    }
  }

  static async triggerBudgetAlert(
    budgetName: string,
    percentage: number,
    language: 'en' | 'bn' = 'bn'
  ): Promise<void> {
    try {
      const title =
        language === 'bn'
          ? `বাজেট সতর্কবার্তা: ${budgetName}`
          : `Budget Alert: ${budgetName}`;
      const body =
        language === 'bn'
          ? `আপনি আপনার বাজেটের ${percentage}% খরচ করে ফেলেছেন!`
          : `You have utilized ${percentage}% of your budget!`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: { type: 'budget_alert' },
        },
        trigger: null, // trigger immediately
      });
    } catch {}
  }

  static async cancelNotificationGroup(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {}
  }
}

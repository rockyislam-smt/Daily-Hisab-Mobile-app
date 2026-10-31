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

  static async initAlarmChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('debt_alarms', {
          name: 'দেনা-পাওনা অ্যালার্ম ও তাগাদা (Debt Alarms)',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#EF4444',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      } catch {}
    }
  }

  static async scheduleDebtAlarm(
    debt: { id: string; type: string; person_name: string; remaining_amount: number; due_date?: string | null },
    formattedAmount: string,
    language: 'en' | 'bn' = 'bn'
  ): Promise<boolean> {
    if (!debt.due_date) return false;

    try {
      await this.requestPermissions();
      await this.initAlarmChannel();
      await this.cancelNotificationGroup(`debt_alarm_${debt.id}`);

      // Calculate target date: 09:00 AM on due date
      const [year, month, day] = debt.due_date.split('-').map((v) => parseInt(v, 10));
      const targetDate = new Date(year, month - 1, day, 9, 0, 0);
      const diffMs = targetDate.getTime() - Date.now();

      // If target time is past, trigger reminder within 10 seconds for immediate alert
      const seconds = diffMs > 0 ? Math.max(1, Math.floor(diffMs / 1000)) : 10;

      const isTheyOweMe = debt.type === 'they_owe_me';
      const title =
        language === 'bn'
          ? isTheyOweMe
            ? `🔔 টাকা আদায়ের অ্যালার্ম: ${debt.person_name}`
            : `⏰ ঋণ পরিশোধের অ্যালার্ম: ${debt.person_name}`
          : isTheyOweMe
          ? `🔔 Money Collection Reminder: ${debt.person_name}`
          : `⏰ Debt Repayment Due: ${debt.person_name}`;

      const body =
        language === 'bn'
          ? isTheyOweMe
            ? `${debt.person_name}-এর কাছ থেকে আজ ${formattedAmount} টাকা পাওয়ার তারিখ। সময়মত তাগাদা দিন!`
            : `আজ ${debt.person_name}-কে ${formattedAmount} টাকা ফেরত দেওয়ার কথা। হিসেব ক্লিয়ার করুন!`
          : isTheyOweMe
          ? `${debt.person_name} is scheduled to pay you ${formattedAmount} today. Don't forget to follow up!`
          : `You are due to repay ${formattedAmount} to ${debt.person_name} today.`;

      await Notifications.scheduleNotificationAsync({
        identifier: `debt_alarm_${debt.id}`,
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 250, 500],
          data: { type: 'debt_alarm', debtId: debt.id },
          ...(Platform.OS === 'android' ? { channelId: 'debt_alarms' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
        },
      });

      return true;
    } catch (e) {
      console.warn('Failed to schedule debt alarm:', e);
      return false;
    }
  }

  static async cancelDebtAlarm(debtId: string): Promise<void> {
    await this.cancelNotificationGroup(`debt_alarm_${debtId}`);
  }

  static async cancelNotificationGroup(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {}
  }
}

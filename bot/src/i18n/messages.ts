/**
 * i18n Messages
 * Translations for bot messages in English, Russian, and Chinese.
 */

export type MessageKey =
  | 'welcome'
  | 'help'
  | 'dailySummary'
  | 'achievementUnlock'
  | 'reminder'
  | 'questComplete'
  | 'levelUp';

type Messages = Record<string, Record<MessageKey, string>>;

const messages: Messages = {
  en: {
    welcome: '👋 Welcome! Turn your real-life goals into epic quests!',
    help: '🤖 Telegram RPG Quest Bot\n\nTurn your real-life goals into epic quests!\n\nChoose a category below to learn more:',
    dailySummary: '📊 Here is your daily summary:',
    achievementUnlock: '🏆 Achievement unlocked!',
    reminder: '⏰ Reminder: You have quests waiting for you!',
    questComplete: '✅ Quest complete! Well done!',
    levelUp: '🎉 Level up! You reached a new level!',
  },
  ru: {
    welcome: '👋 Добро пожаловать! Превратите свои цели в эпические квесты!',
    help: '🤖 Телеграм РПГ Квест Бот\n\nПревратите свои реальные цели в эпические квесты!\n\nВыберите категорию ниже:',
    dailySummary: '📊 Вот ваша ежедневная сводка:',
    achievementUnlock: '🏆 Достижение разблокировано!',
    reminder: '⏰ Напоминание: Вас ждут квесты!',
    questComplete: '✅ Квест выполнен! Отличная работа!',
    levelUp: '🎉 Новый уровень! Вы достигли нового уровня!',
  },
  zh: {
    welcome: '👋 欢迎！将你的现实目标变成史诗任务！',
    help: '🤖 Telegram RPG 任务机器人\n\n将你的现实目标变成史诗任务！\n\n请选择以下类别了解更多：',
    dailySummary: '📊 这是你的每日总结：',
    achievementUnlock: '🏆 成就解锁！',
    reminder: '⏰ 提醒：你有任务等待完成！',
    questComplete: '✅ 任务完成！做得好！',
    levelUp: '🎉 升级了！你达到了新等级！',
  },
};

/**
 * Get a translated message by language and key.
 * Falls back to English if the language or key is not found.
 */
export function t(lang: string, key: MessageKey): string {
  const langMessages = messages[lang] || messages['en'];
  return langMessages[key] || messages['en'][key] || key;
}

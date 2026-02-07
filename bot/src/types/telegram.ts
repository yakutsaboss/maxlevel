/**
 * Telegram WebApp types
 */

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramInitData {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat_instance?: string;
  start_param?: string;
  auth_date: number;
  hash: string;
}

export interface AuthenticationResult {
  isValid: boolean;
  user?: TelegramUser;
  error?: string;
}

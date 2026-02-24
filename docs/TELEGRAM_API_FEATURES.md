# Telegram Bot API — Features Reference

> Generated for MaxLevel bot project. Last updated: 2026-02-24.
> Covers Bot API up to v9.4 (Feb 2026).

## Table of Contents

1. [Stars & Payments](#1-stars--payments)
2. [Animated Stickers & Custom Emoji](#2-animated-stickers--custom-emoji)
3. [Mini App (WebApp) API](#3-mini-app-webapp-api)
4. [Gamification Features](#4-gamification-features)
5. [Media & Content](#5-media--content)
6. [Inline Mode](#6-inline-mode)
7. [Bot Management](#7-bot-management)
8. [Community Features](#8-community-features)
9. [Implementation Ideas for MaxLevel](#9-implementation-ideas-for-maxlevel)

---

## 1. Stars & Payments

### Overview

Telegram Stars (XTR) are virtual currency for digital goods/services within Telegram. Physical goods require traditional payment providers.

**Revenue split:**
- Developer receives ~65% of Star purchase price
- Telegram retains ~30% (App Store/Google Play commission)
- Channel paid media: 0% commission (channel owners keep 100%)
- Ad reinvestment rate: $0.02/Star (subsidized)

**Withdrawal:**
- Minimum 1,000 Stars in balance
- 21-day hold period before withdrawal
- Withdrawal to TON wallet via Fragment platform
- Rate: ~$0.013 per Star

### Key Bot API Methods

| Method | Description |
|--------|-------------|
| `sendInvoice` | Sends invoice directly to chat. Set `currency: "XTR"`, `provider_token: ""` |
| `createInvoiceLink` | Creates shareable invoice URL (multiple buyers, inline/web shop) |
| `answerPreCheckoutQuery` | **Must respond within 10s** of `pre_checkout_query`. Set `ok: true` to proceed |
| `refundStarPayment` | Refund by `user_id` + `telegram_payment_charge_id` |
| `getStarTransactions` | List transactions (`offset`, `limit` 1-100) |
| `getMyStarBalance` | Returns total Stars earned (Bot API 9.1+) |
| `editUserStarSubscription` | Manage recurring subscriptions (Bot API 8.0+) |

### Payment Flow

```
1. Bot → sendInvoice / createInvoiceLink (currency: "XTR")
2. User sees invoice → presses Pay
3. Telegram → pre_checkout_query to bot
4. Bot → answerPreCheckoutQuery(ok: true) within 10 seconds
5. Telegram → successful_payment update to bot
6. Bot delivers digital goods
7. (Optional) Bot → refundStarPayment
```

### successful_payment Fields
- `currency`: "XTR"
- `total_amount`: Stars amount
- `invoice_payload`: Bot-defined payload string
- `telegram_payment_charge_id`: Store this for refunds!
- `subscription_expiration_date`: For recurring payments
- `is_first_recurring`: True if first subscription payment

### Paid Broadcast (Bot API 9.2+)
- `allow_paid_broadcast` parameter on most send methods
- Allows 1,000 msg/sec ignoring limits — costs 0.1 Stars/message

---

## 2. Animated Stickers & Custom Emoji

### Sticker Formats

| Format | File | Size Limit | Duration | FPS | Notes |
|--------|------|-----------|----------|-----|-------|
| Animated (.TGS) | Lottie vector | 64 KB | 3s loop | 60 | Adobe AE + Bodymovin-TG |
| Video (.WEBM) | VP9 codec | 256 KB | 3s loop | 30 | No audio stream |
| Static (.PNG/.WEBP) | Image | — | — | — | 512px one side |

### Bot API Sticker Methods

| Method | Description |
|--------|-------------|
| `sendSticker` | Send any format sticker to chat |
| `createNewStickerSet` | Create new set (type: "regular", "mask", "custom_emoji") |
| `addStickerToSet` | Add sticker with emoji_list, keywords |
| `getStickerSet` | Get sticker set by name |
| `getCustomEmojiStickers` | Get stickers by custom emoji IDs (max 200) |
| `uploadStickerFile` | Upload file for later use in sets |

### Custom Emoji in Messages (Bot API 9.4+)
- Bot owner must have Telegram Premium
- HTML format: `<tg-emoji emoji-id="DOCUMENT_ID">BASE_EMOJI</tg-emoji>`
- Button icons: `icon_custom_emoji_id` on KeyboardButton / InlineKeyboardButton

---

## 3. Mini App (WebApp) API

Access via `window.Telegram.WebApp`.

### Core Properties
- `version` — API version string (e.g. "8.0")
- `platform` — "ios", "android", "tdesktop", "weba", "webk"
- `colorScheme` — "light" / "dark"
- `viewportHeight` / `viewportStableHeight`
- `initDataUnsafe.user` — telegram_id, name, language_code, is_premium

### Data Storage Options

| Storage | Capacity | Sync | Introduced |
|---------|----------|------|-----------|
| CloudStorage | 1,024 keys × 4,096 chars | Server-side, cross-device | Bot API 6.9 |
| DeviceStorage | 5 MB | Local only | Bot API 9.0 |
| SecureStorage | 10 items | Encrypted (Keychain/Keystore) | Bot API 9.0 |

### Sensors & Hardware (Bot API 8.0+)

| Feature | Access | Notes |
|---------|--------|-------|
| Accelerometer | `start({refresh_rate})` | 20-1000ms, returns x/y/z m/s² |
| Gyroscope | `start({refresh_rate})` | Rotation rate rad/s |
| DeviceOrientation | `start({refresh_rate, need_absolute})` | alpha/beta/gamma |
| LocationManager | `init()` → `getLocation()` | lat/lon/alt/speed/accuracy |
| BiometricManager | `init()` → `authenticate()` | Fingerprint / Face (Bot API 7.2+) |
| QR Scanner | `showScanQrPopup()` | Returns decoded text (Bot API 6.4+) |

### UI Controls

| Control | Description | Since |
|---------|-------------|-------|
| MainButton | Primary bottom button | 6.0 |
| SecondaryButton | Additional button, 4 positions | 7.10 |
| BackButton | Header back arrow | 6.1 |
| SettingsButton | Header gear icon | 7.0 |
| HapticFeedback | impact/notification/selection | 6.1 |
| Popups | showPopup/showAlert/showConfirm | 6.2 |
| Fullscreen | requestFullscreen + lockOrientation | 8.0 |

### Other Features

| Feature | Method | Since |
|---------|--------|-------|
| Share to Story | `shareToStory(url, {text, widget_link})` | 7.8 |
| Share Message | `shareMessage(msg_id)` | 8.0 |
| Download File | `downloadFile({url, file_name})` | 8.0 |
| Set Emoji Status | `setEmojiStatus(emoji_id, {duration})` | 8.0 |
| Add to Home Screen | `addToHomeScreen()` | 8.0 |
| Open Invoice | `openInvoice(url, callback)` | 6.0 |
| Read Clipboard | `readTextFromClipboard()` | 6.4 |

### Theme CSS Variables
```css
--tg-theme-bg-color
--tg-theme-text-color
--tg-theme-button-color
--tg-theme-button-text-color
--tg-theme-hint-color
--tg-theme-link-color
--tg-theme-secondary-bg-color
--tg-theme-header-bg-color
--tg-theme-accent-text-color
--tg-theme-section-bg-color
--tg-theme-section-header-text-color
--tg-theme-subtitle-text-color
--tg-theme-destructive-text-color
```

---

## 4. Gamification Features

### Setup
1. BotFather → `/newgame` → provide short_name, title, description, photo
2. Host HTML5 game on HTTPS server

### Methods

| Method | Description |
|--------|-------------|
| `sendGame` | Send game message with Play button |
| `setGameScore` | Update score. Use `force: true` to override lower |
| `getGameHighScores` | Get leaderboard around a user |

### Flow
```
1. sendGame → user sees Play button
2. User clicks → callback_query with game_short_name
3. Bot → answerCallbackQuery with game URL
4. Game runs in WebView → reports score to backend → setGameScore
```

> **Note:** Our RPG quests system could potentially use the native game framework for mini-games within quests.

---

## 5. Media & Content

### Relevant Methods

| Method | Description | Notes |
|--------|-------------|-------|
| `sendVideoNote` | Round (circle) video messages | MP4, square, max 1min |
| `sendVoice` | Voice with waveform | OGG/OPUS preferred |
| `sendMediaGroup` | Album of 2-10 items | Photos, videos, docs, audio |
| `sendPaidMedia` | Stars-gated photos/videos | 1-25,000 Stars (Bot API 7.5+) |
| `sendLocation` | Static or live location | `live_period` for tracking |
| `sendGift` | Send Telegram gift from bot balance | Bot API 8.0+ |

### Paid Media Details
- Users see low-res preview until payment
- Up to 10 items per message
- Price: 1-25,000 Stars
- If posted by bot in channel → Stars go to channel balance

---

## 6. Inline Mode

### How It Works
User types `@botusername query` → bot receives `InlineQuery` → responds with `answerInlineQuery` (max 50 results).

### 20 Result Types
Articles, photos, GIFs, videos, audio, voice, documents, locations, venues, contacts, games, and cached variants of each.

### Mini App in Inline Mode
- Set `web_app` in `InlineQueryResultsButton` to show "Open App" above results
- Mini App sends result back via `answerWebAppQuery`
- Result posted as inline message in chat

---

## 7. Bot Management

### Profile & Commands

| Method | Description | Since |
|--------|-------------|-------|
| `setMyCommands` | Set command list per scope/language | — |
| `setChatMenuButton` | Bottom-left button (commands/web_app) | — |
| `setMyName` | Bot display name per language | 6.7 |
| `setMyDescription` | Empty chat description | 6.7 |
| `setMyShortDescription` | Profile page description | 6.7 |
| `setMyProfilePhoto` | Bot avatar | 9.4 |
| `setMyDefaultAdministratorRights` | Default admin permissions | — |

### Command Scopes
Different command lists for: all private chats, all groups, all admins, specific chat, specific chat member.

---

## 8. Community Features

### Forum Topics
- Available in supergroups with `is_forum=true`
- `createForumTopic`, `editForumTopic`, `closeForumTopic`, `deleteForumTopic`
- General topic always `id=1`, cannot be deleted
- Private chat topics also supported (Bot API 9.3+)

### Channel Boosts
- `getChatBoostStatus` — current level + boost count
- `getUserChatBoosts` — check if specific user is boosting
- Levels unlock: stories/day, custom colors, emoji, wallpapers, ad-free

### Giveaways & Gifts
- `sendGiveaway` — Premium subscription giveaways for boosts
- `sendGift` — send gifts from bot's Star balance
- `getAvailableGifts` — list available gifts with prices

---

## 9. Implementation Ideas for MaxLevel

### High Priority (Near-term)

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| **Stars shop** | Medium | High | Sell premium avatars, mode unlocks via `sendInvoice` |
| **Payment notifications** | Done ✅ | High | Agent D implemented owner notifications |
| **Animated stickers in celebrations** | Low | Medium | Send .TGS stickers for quest completion, level-up |
| **Custom emoji in messages** | Low | Medium | Use in bot messages for visual flair (needs Premium) |

### Medium Priority

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| **Paid content** | Medium | Medium | Premium guides/tips behind Star paywall |
| **Biometric auth** | Medium | Medium | Secure actions (purchases, transfers) |
| **Cloud Storage** | Low | Medium | Persist user preferences cross-device |
| **QR code sharing** | Low | Low | Share profile/referral via QR |
| **Home screen shortcut** | Low | Low | `addToHomeScreen()` for engagement |

### Lower Priority (Future)

| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| **Native HTML5 games** | High | High | Mini-games within quests using game framework |
| **Inline mode** | High | Medium | Share stats/progress in any chat |
| **Forum topics** | Medium | Low | Community discussion per mode/quest type |
| **Live location quests** | High | Medium | Location-based challenges (walk X steps) |
| **Accelerometer/gyroscope** | High | Medium | Shake-to-collect, motion-based mini-games |
| **Video notes** | Low | Low | Round video tips/announcements |
| **Channel boosts** | Low | Low | Community channel with boost perks |
| **Star subscriptions** | Medium | High | Monthly premium subscription (30-day auto-renew) |

### Revenue Model via Stars

```
Current:
  Avatar purchases → Stars → 21-day hold → withdraw via Fragment (TON)
  Mode unlocks → Stars → same flow

Future additions:
  Premium subscription (30d recurring) → editUserStarSubscription
  Paid content/guides → sendPaidMedia
  Boost rewards → community channel perks
  Gift system → sendGift between users
```

### Key Technical Notes

1. **Stars provider_token**: Set to empty string `""` for Stars payments (no external provider needed)
2. **Pre-checkout timeout**: Must respond within 10 seconds or payment fails
3. **Store charge IDs**: Always save `telegram_payment_charge_id` for refund capability
4. **Animated stickers**: Can use existing Telegram sticker packs by `file_id` — no need to create custom packs initially
5. **Custom emoji**: Bot owner needs Telegram Premium subscription
6. **Mini App version check**: Always check `WebApp.version` before using newer features
7. **Withdrawal process**: Bot balance → Fragment → TON wallet → exchange

---

## API Version History (Key Releases)

| Version | Date | Highlights |
|---------|------|-----------|
| 9.4 | Feb 2026 | Custom emoji in bot messages, button icons, profile photo API |
| 9.3 | Dec 2025 | Private chat topics, paid media up to 25K Stars |
| 9.2 | Aug 2025 | Checklists, suggested posts, paid broadcast |
| 9.1 | Jul 2025 | `getMyStarBalance`, `sendChecklist` |
| 8.0 | Nov 2024 | Fullscreen, sensors, location, biometrics, gifts, subscriptions |
| 7.5 | Jun 2024 | `sendPaidMedia` |
| 7.2 | Mar 2024 | BiometricManager |
| 7.0 | Jan 2024 | Channel boosts, SettingsButton |
| 6.9 | Sep 2023 | CloudStorage |
| 6.0 | Apr 2022 | Mini Apps launch |

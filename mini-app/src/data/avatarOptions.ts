export interface AvatarOption {
  id: number;       // 1-indexed, matches users.avatar_id
  value: string;    // 'gym_warrior', etc.
  emoji: string;    // '💪', etc.
  labelKey: string; // i18n key
  descKey: string;  // i18n key
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 1, value: 'gym_warrior', emoji: '💪', labelKey: 'onboarding.avatarGymWarrior', descKey: 'onboarding.avatarGymWarriorDesc' },
  { id: 2, value: 'office_boss', emoji: '👑', labelKey: 'onboarding.avatarOfficeBoss', descKey: 'onboarding.avatarOfficeBossDesc' },
  { id: 3, value: 'magic_pet', emoji: '🐱', labelKey: 'onboarding.avatarMagicPet', descKey: 'onboarding.avatarMagicPetDesc' },
  { id: 4, value: 'night_owl', emoji: '🦉', labelKey: 'onboarding.avatarNightOwl', descKey: 'onboarding.avatarNightOwlDesc' },
  { id: 5, value: 'couch_hero', emoji: '🥔', labelKey: 'onboarding.avatarCouchHero', descKey: 'onboarding.avatarCouchHeroDesc' },
];

export const AVATAR_EMOJI_MAP: Record<number, string> = Object.fromEntries(
  AVATAR_OPTIONS.map(a => [a.id, a.emoji])
);

export function getAvatarById(id: number): AvatarOption | undefined {
  return AVATAR_OPTIONS.find(a => a.id === id);
}

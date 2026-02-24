import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { logger } from '@/utils/logger';

export function useDeepLink() {
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const startParam = WebApp.initDataUnsafe?.start_param;
    if (!startParam) return;

    logger.info('Deep link received', { startParam });

    // Parse format: TYPE_ID (e.g., profile_123, challenge_456, quest_789)
    const match = startParam.match(/^(profile|challenge|quest|achievement|referral)_(\d+)$/);
    if (!match) {
      logger.warn('Unknown deep link format', { startParam });
      return;
    }

    const [, type, id] = match;

    switch (type) {
      case 'profile':
        navigate(`/profile?viewUser=${id}`);
        break;
      case 'challenge':
        navigate(`/social?openChallenge=${id}`);
        break;
      case 'quest':
        navigate(`/quests?highlight=${id}`);
        break;
      case 'achievement':
        navigate(`/achievements?highlight=${id}`);
        break;
      case 'referral':
        localStorage.setItem('referrer_id', id);
        navigate('/');
        break;
    }
  }, [navigate]);
}

import { useEffect, useState, useCallback } from 'react';
import {
  getFriends,
  getPendingRequests,
  getChallenges,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  joinChallenge,
  updateChallengeProgress,
  discoverChallenges as discoverChallengesApi,
} from '@/api/social';
import type { Friend, PendingRequest, Challenge, DiscoverChallenge } from '@/api/social';
import { logger } from '@/utils/logger';

interface UseSocialParams {
  userId: number | undefined;
}

export function useSocial({ userId }: UseSocialParams) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [availableChallenges, setAvailableChallenges] = useState<DiscoverChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(false);

      const [friendsData, pendingData, challengesData] = await Promise.all([
        getFriends(userId),
        getPendingRequests(userId),
        getChallenges(userId),
      ]);

      setFriends(friendsData || []);
      setPendingRequests(pendingData || []);
      setChallenges(challengesData || []);
    } catch (err) {
      logger.error('Failed to load social data', { error: err });
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const sendRequest = useCallback(async (toUserId: number) => {
    if (!userId) return;
    await sendFriendRequest(userId, toUserId);
    await loadData();
  }, [userId, loadData]);

  const acceptRequest = useCallback(async (requestId: number) => {
    if (!userId) return;
    await acceptFriendRequest(requestId, userId);
    await loadData();
  }, [userId, loadData]);

  const rejectRequest = useCallback(async (requestId: number) => {
    if (!userId) return;
    await rejectFriendRequest(requestId, userId);
    await loadData();
  }, [userId, loadData]);

  const unfriend = useCallback(async (friendId: number) => {
    if (!userId) return;
    await removeFriend(userId, friendId);
    await loadData();
  }, [userId, loadData]);

  const joinChallengeAction = useCallback(async (challengeId: number) => {
    if (!userId) return;
    await joinChallenge(challengeId, userId);
    await loadData();
  }, [userId, loadData]);

  const updateProgress = useCallback(async (challengeId: number, progress: number) => {
    if (!userId) return;
    await updateChallengeProgress(challengeId, userId, progress);
    await loadData();
  }, [userId, loadData]);

  const loadDiscoverChallenges = useCallback(async (mode?: string) => {
    try {
      const data = await discoverChallengesApi(mode);
      setAvailableChallenges(data || []);
    } catch (err) {
      logger.error('Failed to load discover challenges', { error: err });
    }
  }, []);

  return {
    friends,
    pendingRequests,
    challenges,
    availableChallenges,
    loading,
    error,
    refresh,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend: unfriend,
    joinChallenge: joinChallengeAction,
    updateProgress,
    discoverChallenges: loadDiscoverChallenges,
  };
}

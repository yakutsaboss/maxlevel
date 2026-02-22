import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useFriendsList,
  useFriendRequests,
  useChallenges,
  useDiscoverChallenges,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
  useRemoveFriendMutation,
  useJoinChallengeMutation,
  useUpdateProgressMutation,
  useLeaveChallengeMutation,
  socialKeys,
} from '@/hooks/useSocialQuery';

interface UseSocialParams {
  userId: number | undefined;
}

export function useSocial({ userId }: UseSocialParams) {
  const queryClient = useQueryClient();

  // Local state for discover challenges (imperatively triggered by callers)
  const [discoverMode, setDiscoverMode] = useState<string | undefined>(undefined);
  const [discoverEnabled, setDiscoverEnabled] = useState(false);

  // React Query hooks
  const friendsQuery = useFriendsList(userId);
  const requestsQuery = useFriendRequests(userId);
  const challengesQuery = useChallenges(userId);
  const discoverQuery = useDiscoverChallenges(discoverMode, discoverEnabled);

  // Mutations
  const sendRequestMutation = useSendFriendRequestMutation();
  const acceptRequestMutation = useAcceptFriendRequestMutation();
  const rejectRequestMutation = useRejectFriendRequestMutation();
  const removeFriendMutation = useRemoveFriendMutation();
  const joinChallengeMutation = useJoinChallengeMutation();
  const updateProgressMutation = useUpdateProgressMutation();
  const leaveChallengeMutation = useLeaveChallengeMutation();

  // Extract data with fallbacks
  const friends = friendsQuery.data ?? [];
  const pendingRequests = requestsQuery.data ?? [];
  const challenges = challengesQuery.data ?? [];
  const availableChallenges = discoverQuery.data ?? [];
  const loading = friendsQuery.isLoading || requestsQuery.isLoading || challengesQuery.isLoading;
  const error = friendsQuery.isError && requestsQuery.isError && challengesQuery.isError;

  const refresh = useCallback(async () => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: socialKeys.friends(userId) }),
      queryClient.invalidateQueries({ queryKey: socialKeys.friendRequests(userId) }),
      queryClient.invalidateQueries({ queryKey: socialKeys.challenges(userId) }),
    ]);
  }, [userId, queryClient]);

  const sendRequest = useCallback(async (toUserId: number) => {
    if (!userId) return;
    await sendRequestMutation.mutateAsync({ fromUserId: userId, toUserId });
  }, [userId, sendRequestMutation]);

  const acceptRequest = useCallback(async (requestId: number) => {
    if (!userId) return;
    await acceptRequestMutation.mutateAsync({ requestId, userId });
  }, [userId, acceptRequestMutation]);

  const rejectRequest = useCallback(async (requestId: number) => {
    if (!userId) return;
    await rejectRequestMutation.mutateAsync({ requestId, userId });
  }, [userId, rejectRequestMutation]);

  const unfriend = useCallback(async (friendId: number) => {
    if (!userId) return;
    await removeFriendMutation.mutateAsync({ userId, friendId });
  }, [userId, removeFriendMutation]);

  const joinChallengeAction = useCallback(async (challengeId: number) => {
    if (!userId) return;
    await joinChallengeMutation.mutateAsync({ challengeId, userId });
  }, [userId, joinChallengeMutation]);

  const updateProgress = useCallback(async (challengeId: number, progress: number) => {
    if (!userId) return;
    await updateProgressMutation.mutateAsync({ challengeId, userId, progress });
  }, [userId, updateProgressMutation]);

  const leaveChallengeAction = useCallback(async (challengeId: number) => {
    if (!userId) return;
    await leaveChallengeMutation.mutateAsync({ challengeId, userId });
  }, [userId, leaveChallengeMutation]);

  const loadDiscoverChallenges = useCallback(async (mode?: string) => {
    setDiscoverMode(mode);
    setDiscoverEnabled(true);
    // React Query handles the fetch automatically when mode/enabled change
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
    leaveChallenge: leaveChallengeAction,
    discoverChallenges: loadDiscoverChallenges,
  };
}

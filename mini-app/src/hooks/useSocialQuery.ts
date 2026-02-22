import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  leaveChallenge as leaveChallengeApi,
} from '@/api/social';
import type { Friend, PendingRequest, Challenge } from '@/api/social';

// Query keys
export const socialKeys = {
  all: ['social'] as const,
  friends: (userId: number) => ['social', 'friends', userId] as const,
  friendRequests: (userId: number) => ['social', 'friendRequests', userId] as const,
  challenges: (userId: number) => ['social', 'challenges', userId] as const,
  discoverChallenges: (mode?: string) => ['social', 'discover', mode ?? ''] as const,
};

export function useFriendsList(userId: number | undefined) {
  return useQuery({
    queryKey: socialKeys.friends(userId!),
    queryFn: async () => {
      const data = await getFriends(userId!);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useFriendRequests(userId: number | undefined) {
  return useQuery({
    queryKey: socialKeys.friendRequests(userId!),
    queryFn: async () => {
      const data = await getPendingRequests(userId!);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute — changes frequently
  });
}

export function useChallenges(userId: number | undefined) {
  return useQuery({
    queryKey: socialKeys.challenges(userId!),
    queryFn: async () => {
      const data = await getChallenges(userId!);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useDiscoverChallenges(mode: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: socialKeys.discoverChallenges(mode),
    queryFn: async () => {
      const data = await discoverChallengesApi(mode);
      return data || [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// --- Mutations ---

interface SendFriendRequestVars {
  fromUserId: number;
  toUserId: number;
}

export function useSendFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fromUserId, toUserId }: SendFriendRequestVars) => {
      await sendFriendRequest(fromUserId, toUserId);
    },
    onSettled: (_data, _error, { fromUserId }) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.friends(fromUserId) });
      queryClient.invalidateQueries({ queryKey: socialKeys.friendRequests(fromUserId) });
    },
  });
}

interface AcceptFriendRequestVars {
  requestId: number;
  userId: number;
}

export function useAcceptFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, userId }: AcceptFriendRequestVars) => {
      await acceptFriendRequest(requestId, userId);
    },
    onMutate: async ({ userId }) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.friendRequests(userId) });
      const previousRequests = queryClient.getQueryData<PendingRequest[]>(socialKeys.friendRequests(userId));
      return { previousRequests };
    },
    onError: (_err, { userId }, context) => {
      if (context?.previousRequests !== undefined) {
        queryClient.setQueryData(socialKeys.friendRequests(userId), context.previousRequests);
      }
    },
    onSettled: (_data, _error, { userId }) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.friends(userId) });
      queryClient.invalidateQueries({ queryKey: socialKeys.friendRequests(userId) });
    },
  });
}

interface RejectFriendRequestVars {
  requestId: number;
  userId: number;
}

export function useRejectFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, userId }: RejectFriendRequestVars) => {
      await rejectFriendRequest(requestId, userId);
    },
    onMutate: async ({ requestId, userId }) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.friendRequests(userId) });
      const previousRequests = queryClient.getQueryData<PendingRequest[]>(socialKeys.friendRequests(userId));
      if (previousRequests) {
        queryClient.setQueryData<PendingRequest[]>(
          socialKeys.friendRequests(userId),
          previousRequests.filter((r) => r.id !== requestId),
        );
      }
      return { previousRequests };
    },
    onError: (_err, { userId }, context) => {
      if (context?.previousRequests !== undefined) {
        queryClient.setQueryData(socialKeys.friendRequests(userId), context.previousRequests);
      }
    },
    onSettled: (_data, _error, { userId }) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.friendRequests(userId) });
    },
  });
}

interface RemoveFriendVars {
  userId: number;
  friendId: number;
}

export function useRemoveFriendMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, friendId }: RemoveFriendVars) => {
      await removeFriend(userId, friendId);
    },
    onMutate: async ({ userId, friendId }) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.friends(userId) });
      const previousFriends = queryClient.getQueryData<Friend[]>(socialKeys.friends(userId));
      if (previousFriends) {
        queryClient.setQueryData<Friend[]>(
          socialKeys.friends(userId),
          previousFriends.filter((f) => f.id !== friendId),
        );
      }
      return { previousFriends };
    },
    onError: (_err, { userId }, context) => {
      if (context?.previousFriends !== undefined) {
        queryClient.setQueryData(socialKeys.friends(userId), context.previousFriends);
      }
    },
    onSettled: (_data, _error, { userId }) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.friends(userId) });
    },
  });
}

interface JoinChallengeVars {
  challengeId: number;
  userId: number;
}

export function useJoinChallengeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, userId }: JoinChallengeVars) => {
      await joinChallenge(challengeId, userId);
    },
    onSettled: (_data, _error, { userId }) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.challenges(userId) });
      queryClient.invalidateQueries({ queryKey: socialKeys.discoverChallenges() });
    },
  });
}

interface UpdateProgressVars {
  challengeId: number;
  userId: number;
  progress: number;
}

export function useUpdateProgressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, userId, progress }: UpdateProgressVars) => {
      await updateChallengeProgress(challengeId, userId, progress);
    },
    onMutate: async ({ challengeId, userId, progress }) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.challenges(userId) });
      const previousChallenges = queryClient.getQueryData<Challenge[]>(socialKeys.challenges(userId));
      if (previousChallenges) {
        queryClient.setQueryData<Challenge[]>(
          socialKeys.challenges(userId),
          previousChallenges.map((c) =>
            c.id === challengeId ? { ...c, progress } : c,
          ),
        );
      }
      return { previousChallenges };
    },
    onError: (_err, { userId }, context) => {
      if (context?.previousChallenges !== undefined) {
        queryClient.setQueryData(socialKeys.challenges(userId), context.previousChallenges);
      }
    },
    onSettled: (_data, _error, { userId }) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.challenges(userId) });
    },
  });
}

interface LeaveChallengeVars {
  challengeId: number;
  userId: number;
}

export function useLeaveChallengeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, userId }: LeaveChallengeVars) => {
      await leaveChallengeApi(challengeId, userId);
    },
    onMutate: async ({ challengeId, userId }) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.challenges(userId) });
      const previousChallenges = queryClient.getQueryData<Challenge[]>(socialKeys.challenges(userId));
      if (previousChallenges) {
        queryClient.setQueryData<Challenge[]>(
          socialKeys.challenges(userId),
          previousChallenges.filter((c) => c.id !== challengeId),
        );
      }
      return { previousChallenges };
    },
    onError: (_err, { userId }, context) => {
      if (context?.previousChallenges !== undefined) {
        queryClient.setQueryData(socialKeys.challenges(userId), context.previousChallenges);
      }
    },
    onSettled: (_data, _error, { userId }) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.challenges(userId) });
    },
  });
}

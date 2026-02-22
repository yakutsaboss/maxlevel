import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchShopItems, fetchPurchaseHistory, purchaseItem } from '@/api/shop';
import type { Purchase, PaymentMethod, PurchaseResult } from '@/api/shop';

// Query keys
export const shopKeys = {
  all: ['shop'] as const,
  items: () => ['shop', 'items'] as const,
  inventory: (userId: number) => ['shop', 'inventory', userId] as const,
};

export function useShopItems() {
  return useQuery({
    queryKey: shopKeys.items(),
    queryFn: async () => {
      const data = await fetchShopItems();
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useInventory(userId: number | undefined) {
  return useQuery({
    queryKey: shopKeys.inventory(userId!),
    queryFn: async () => {
      const data = await fetchPurchaseHistory(userId!);
      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// --- Mutations ---

interface PurchaseVars {
  userId: number;
  itemId: number;
  paymentMethod: PaymentMethod;
}

export function usePurchaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, itemId, paymentMethod }: PurchaseVars): Promise<PurchaseResult> => {
      return purchaseItem(userId, itemId, paymentMethod);
    },
    onMutate: async ({ userId, itemId }) => {
      await queryClient.cancelQueries({ queryKey: shopKeys.inventory(userId) });
      const previousInventory = queryClient.getQueryData<Purchase[]>(shopKeys.inventory(userId));

      // Optimistically add a placeholder purchase
      if (previousInventory) {
        queryClient.setQueryData<Purchase[]>(
          shopKeys.inventory(userId),
          [
            ...previousInventory,
            {
              id: -Date.now(), // temporary id
              user_id: userId,
              shop_item_id: itemId,
              payment_method: 'stars',
              amount_paid: 0,
              purchased_at: new Date().toISOString(),
            },
          ],
        );
      }

      return { previousInventory };
    },
    onError: (_err, { userId }, context) => {
      if (context?.previousInventory !== undefined) {
        queryClient.setQueryData(shopKeys.inventory(userId), context.previousInventory);
      }
    },
    onSettled: (_data, _error, { userId }) => {
      queryClient.invalidateQueries({ queryKey: shopKeys.inventory(userId) });
      queryClient.invalidateQueries({ queryKey: shopKeys.items() });
    },
  });
}

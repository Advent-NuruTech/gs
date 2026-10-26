import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getPaystackSubaccountId,
  listSettlementTransactions,
  listSuccessfulSettlements,
} from "@/lib/paystack/api";

type RoutedEarning = {
  id: string;
  creator_id: string;
  payment_reference: string | null;
};

type PayoutProfile = {
  creator_id: string;
  paystack_subaccount_code: string | null;
};

export interface CreatorPayoutSettlementSyncResult {
  checkedCreators: number;
  settledEarnings: number;
  failedCreators: number;
}

/**
 * Reconcile split earnings against Paystack's successful settlement reports.
 * The update is conditional so repeated cron runs and simultaneous dashboard
 * reads remain idempotent.
 */
export async function syncCreatorPayoutSettlements(creatorId?: string): Promise<CreatorPayoutSettlementSyncResult> {
  const db = getSupabaseAdminClient();
  let earningsQuery = db
    .from("creator_earnings")
    .select("id,creator_id,payment_reference")
    .eq("settlement_mode", "paystack_split")
    .eq("payout_status", "routed")
    .not("payment_reference", "is", null)
    .limit(1000);

  if (creatorId) earningsQuery = earningsQuery.eq("creator_id", creatorId);
  const { data, error } = await earningsQuery;
  if (error) throw new Error(`Could not load routed creator earnings: ${error.message}`);

  const earnings = (data ?? []) as RoutedEarning[];
  if (earnings.length === 0) return { checkedCreators: 0, settledEarnings: 0, failedCreators: 0 };

  const creatorIds = [...new Set(earnings.map((earning) => earning.creator_id))];
  const { data: profileData, error: profilesError } = await db
    .from("creator_payout_profiles")
    .select("creator_id,paystack_subaccount_code")
    .in("creator_id", creatorIds);
  if (profilesError) throw new Error(`Could not load creator payout profiles: ${profilesError.message}`);

  const profiles = new Map(
    ((profileData ?? []) as PayoutProfile[])
      .filter((profile) => Boolean(profile.paystack_subaccount_code))
      .map((profile) => [profile.creator_id, profile]),
  );
  const earningsByCreator = new Map<string, RoutedEarning[]>();
  for (const earning of earnings) {
    const rows = earningsByCreator.get(earning.creator_id) ?? [];
    rows.push(earning);
    earningsByCreator.set(earning.creator_id, rows);
  }

  let checkedCreators = 0;
  let settledEarnings = 0;
  let failedCreators = 0;
  for (const [currentCreatorId, creatorEarnings] of earningsByCreator) {
    const profile = profiles.get(currentCreatorId);
    if (!profile?.paystack_subaccount_code) continue;
    checkedCreators += 1;

    try {
      const subaccountId = await getPaystackSubaccountId(profile.paystack_subaccount_code);
      const settlements = await listSuccessfulSettlements(subaccountId);
      const routedByReference = new Map(
        creatorEarnings
          .filter((earning): earning is RoutedEarning & { payment_reference: string } => Boolean(earning.payment_reference))
          .map((earning) => [earning.payment_reference, earning]),
      );

      for (const settlement of settlements) {
        const transactions = await listSettlementTransactions(settlement.id);
        const settledAt = settlement.settlement_date ?? settlement.createdAt ?? new Date().toISOString();
        for (const transaction of transactions) {
          const earning = routedByReference.get(transaction.reference);
          if (!earning) continue;

          const { error: updateError } = await db
            .from("creator_earnings")
            .update({
              payout_status: "paid",
              settlement_status: "split_confirmed",
              paystack_settlement_id: settlement.id,
              settled_at: settledAt,
            })
            .eq("id", earning.id)
            .eq("payout_status", "routed");
          if (updateError) throw new Error(`Could not mark creator earning as paid: ${updateError.message}`);
          settledEarnings += 1;
          routedByReference.delete(transaction.reference);
        }
        if (routedByReference.size === 0) break;
      }
    } catch {
      // One unavailable/invalid subaccount must not stop healthy creators from
      // being reconciled. The next scheduled run will retry this creator.
      failedCreators += 1;
    }
  }

  return { checkedCreators, settledEarnings, failedCreators };
}

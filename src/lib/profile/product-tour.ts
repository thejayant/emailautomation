import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isAnyMissingColumnResult } from "@/lib/utils/supabase-schema";

export const productTourColumnCandidates = [
  { table: "profiles", column: "product_tour_version" },
  { table: "profiles", column: "product_tour_completed_at" },
] as const;

type ProductTourRow = {
  product_tour_version?: number | null;
  product_tour_completed_at?: string | null;
} | null;

export async function getUserProductTourState(userId: string) {
  try {
    const supabase = createAdminSupabaseClient();
    const result = await supabase
      .from("profiles")
      .select("product_tour_version, product_tour_completed_at")
      .eq("id", userId)
      .maybeSingle();

    if (isAnyMissingColumnResult(result, [...productTourColumnCandidates])) {
      return {
        completedAt: null,
        version: null,
      };
    }

    if (result.error) {
      return {
        completedAt: null,
        version: null,
      };
    }

    const row = result.data as ProductTourRow;

    return {
      completedAt:
        typeof row?.product_tour_completed_at === "string" ? row.product_tour_completed_at : null,
      version:
        typeof row?.product_tour_version === "number" ? row.product_tour_version : null,
    };
  } catch {
    return {
      completedAt: null,
      version: null,
    };
  }
}


import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateShell } from "@/lib/cache/namespaces";
import { PRODUCT_TOUR_VERSION } from "@/lib/walkthrough/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { productTourColumnCandidates } from "@/lib/profile/product-tour";
import { isAnyMissingColumnResult } from "@/lib/utils/supabase-schema";

const payloadSchema = z
  .object({
    version: z.number().int().positive().optional(),
  })
  .optional();

type UpsertResult = {
  data?: unknown;
  error?: { message?: string | null } | null;
  status?: number | null;
};

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.safeParse(await request.json().catch(() => undefined));

    if (!payload.success) {
      return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient({ canSetCookies: false });

    if (!supabase) {
      return NextResponse.json({ error: "Supabase auth is not configured." }, { status: 500 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "No authenticated session found." }, { status: 401 });
    }

    const profilesTable = supabase.from("profiles") as unknown as {
      upsert: (values: Record<string, unknown>, options?: Record<string, unknown>) => Promise<UpsertResult>;
    };

    const result = await profilesTable.upsert(
      {
        id: user.id,
        product_tour_completed_at: new Date().toISOString(),
        product_tour_version: payload.data?.version ?? PRODUCT_TOUR_VERSION,
      },
      { onConflict: "id" },
    );

    if (isAnyMissingColumnResult(result, [...productTourColumnCandidates])) {
      return NextResponse.json({ ok: true });
    }

    if (result.error?.message) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    await invalidateShell(user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save product tour completion.",
      },
      { status: 500 },
    );
  }
}


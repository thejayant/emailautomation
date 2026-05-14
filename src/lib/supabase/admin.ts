import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { env, isSupabaseConfigured } from "@/lib/supabase/env";

type SupabaseError = { message: string };

type QueryResult<T = unknown> = Promise<{
  data: T;
  error: SupabaseError | null;
  count?: number | null;
}>;

type UntypedQueryBuilder = {
  select: (columns?: string, options?: Record<string, unknown>) => UntypedQueryBuilder & QueryResult<unknown>;
  insert: (
    values: Record<string, unknown> | Array<Record<string, unknown>>,
    options?: Record<string, unknown>,
  ) => UntypedQueryBuilder & QueryResult<unknown>;
  upsert: (
    values: Record<string, unknown> | Array<Record<string, unknown>>,
    options?: Record<string, unknown>,
  ) => UntypedQueryBuilder & QueryResult<unknown>;
  update: (
    values: Record<string, unknown>,
  ) => UntypedQueryBuilder & QueryResult<unknown>;
  delete: () => UntypedQueryBuilder & QueryResult<unknown>;
  eq: (column: string, value: unknown) => UntypedQueryBuilder & QueryResult<unknown>;
  in: (column: string, values: unknown[]) => UntypedQueryBuilder & QueryResult<unknown>;
  ilike: (column: string, pattern: string) => UntypedQueryBuilder & QueryResult<unknown>;
  is: (column: string, value: unknown) => UntypedQueryBuilder & QueryResult<unknown>;
  lte: (column: string, value: unknown) => UntypedQueryBuilder & QueryResult<unknown>;
  gte: (column: string, value: unknown) => UntypedQueryBuilder & QueryResult<unknown>;
  not: (column: string, operator: string, value: unknown) => UntypedQueryBuilder & QueryResult<unknown>;
  or: (filters: string) => UntypedQueryBuilder & QueryResult<unknown>;
  range: (from: number, to: number) => UntypedQueryBuilder & QueryResult<unknown>;
  limit: (count: number) => UntypedQueryBuilder & QueryResult<unknown>;
  order: (column: string, options?: Record<string, unknown>) => UntypedQueryBuilder & QueryResult<unknown>;
  single: () => QueryResult<unknown>;
  maybeSingle: () => QueryResult<unknown>;
};

type UntypedSupabaseClient = {
  from: (table: string) => UntypedQueryBuilder;
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: Blob | ArrayBuffer | File,
        options?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: SupabaseError | null }>;
    };
  };
};

export function createAdminSupabaseClient() {
  if (!isSupabaseConfigured || !env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role environment is not configured.");
  }

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  ) as unknown as UntypedSupabaseClient;
}

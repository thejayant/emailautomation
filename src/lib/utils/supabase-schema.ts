type QueryErrorLike = {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
} | null | undefined;

type QueryResultLike = {
  error?: QueryErrorLike;
  status?: number | null;
  data?: unknown;
} | null | undefined;

export function isMissingColumnError(
  message: string | null | undefined,
  table: string,
  column: string,
) {
  const normalized = (message ?? "").toLowerCase();
  const tablePattern = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const columnPattern = column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return (
    normalized.includes(`could not find the column '${column}' of '${table}'`) ||
    normalized.includes(`could not find the '${column}' column of '${table}'`) ||
    new RegExp(`column\\s+${tablePattern}(?:_[0-9]+)?\\.${columnPattern}\\s+does not exist`).test(normalized)
  );
}

export function isMissingColumnResult(
  result: QueryResultLike,
  table: string,
  column: string,
) {
  if (isMissingColumnError(result?.error?.message, table, column)) {
    return true;
  }

  return result?.status === 400 && result?.data == null && !(result?.error?.message ?? "").trim();
}

export function isAnyMissingColumnResult(
  result: QueryResultLike,
  candidates: Array<{ table: string; column: string }>,
) {
  return candidates.some((candidate) =>
    isMissingColumnResult(result, candidate.table, candidate.column),
  );
}

export function isMissingTableError(message: string | null | undefined, table: string) {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes(`could not find the table 'public.${table.toLowerCase()}'`) ||
    normalized.includes(`relation "public.${table.toLowerCase()}" does not exist`)
  );
}

export function isMissingTableResult(result: QueryResultLike, table: string) {
  if (isMissingTableError(result?.error?.message, table)) {
    return true;
  }

  return result?.status === 400 && result?.data == null && !(result?.error?.message ?? "").trim();
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  APP_DATA_CLEAR_EVENT,
  APP_DATA_INVALIDATE_EVENT,
} from "@/lib/app-data/client";
import {
  APP_TAB_ROUTES,
  appDataInvalidationKeysForMutation,
  buildAppDataCacheKey,
  getTabRouteByHref,
} from "@/lib/app-data/routes";
import type { AppDataMap, AppTabKey, WorkspaceShellData } from "@/lib/app-data/types";

type CacheStatus = "idle" | "loading" | "refreshing" | "success" | "error";

type CacheEntry<T = unknown> = {
  data?: T;
  error?: string;
  refreshedAt?: string;
  status: CacheStatus;
};

type AppDataContextValue = {
  workspace: WorkspaceShellData;
  getTabData: <K extends AppTabKey>(key: K, search?: string) => CacheEntry<AppDataMap[K]>;
  prefetchTabData: <K extends AppTabKey>(key: K, search?: string) => Promise<void>;
  refreshTabData: <K extends AppTabKey>(key: K, search?: string) => Promise<void>;
  invalidateTabData: (predicate: (input: { cacheKey: string; tabKey: AppTabKey }) => boolean) => void;
  prefetchRoute: (href: string) => void;
  optimisticTabKey: AppTabKey | null;
  showTabRoute: (href: string) => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function normalizeSearch(search?: string) {
  return search?.replace(/^\?/, "") ?? "";
}

function makeEndpoint(key: AppTabKey, search?: string) {
  const route = APP_TAB_ROUTES.find((item) => item.key === key);
  const query = normalizeSearch(search);

  return `${route?.endpoint ?? `/api/app-data/${key}`}${query ? `?${query}` : ""}`;
}

function getEntryTabKey(cacheKey: string): AppTabKey | null {
  const [, , tabKey] = cacheKey.split("::");
  return APP_TAB_ROUTES.some((route) => route.key === tabKey) ? (tabKey as AppTabKey) : null;
}

export function AppDataProvider({
  children,
  workspace,
}: {
  children: ReactNode;
  workspace: WorkspaceShellData;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cache, setCache] = useState<Record<string, CacheEntry>>({});
  const [optimisticTabKey, setOptimisticTabKey] = useState<AppTabKey | null>(null);
  const inFlightRef = useRef(new Map<string, Promise<void>>());
  const prefetchQueueRef = useRef<Array<() => Promise<void>>>([]);
  const activePrefetchesRef = useRef(0);

  const buildKey = useCallback(
    (key: AppTabKey, search?: string) =>
      buildAppDataCacheKey({
        key,
        workspaceId: workspace.workspaceId,
        projectId: workspace.activeProjectId,
        search: normalizeSearch(search),
      }),
    [workspace.activeProjectId, workspace.workspaceId],
  );

  const refreshTabData = useCallback(
    async <K extends AppTabKey>(key: K, search?: string) => {
      const cacheKey = buildKey(key, search);
      const existingRequest = inFlightRef.current.get(cacheKey);

      if (existingRequest) {
        await existingRequest;
        return;
      }

      const request = (async () => {
        setCache((current) => {
          const currentEntry = current[cacheKey];

          return {
            ...current,
            [cacheKey]: {
              ...currentEntry,
              status: currentEntry?.data ? "refreshing" : "loading",
              error: undefined,
            },
          };
        });

        try {
          const response = await fetch(makeEndpoint(key, search), {
            headers: { Accept: "application/json" },
          });
          const payload = await response.json().catch(() => null);

          if (!response.ok || !payload?.data) {
            throw new Error(payload?.error ?? `Failed to load ${key} data.`);
          }

          setCache((current) => ({
            ...current,
            [cacheKey]: {
              data: payload.data,
              refreshedAt: payload.refreshedAt,
              status: "success",
            },
          }));
        } catch (error) {
          setCache((current) => ({
            ...current,
            [cacheKey]: {
              ...current[cacheKey],
              error: error instanceof Error ? error.message : `Failed to load ${key} data.`,
              status: current[cacheKey]?.data ? "success" : "error",
            },
          }));
        } finally {
          inFlightRef.current.delete(cacheKey);
        }
      })();

      inFlightRef.current.set(cacheKey, request);
      await request;
    },
    [buildKey],
  );

  const runPrefetchQueue = useCallback(() => {
    while (activePrefetchesRef.current < 2 && prefetchQueueRef.current.length > 0) {
      const task = prefetchQueueRef.current.shift();

      if (!task) {
        continue;
      }

      activePrefetchesRef.current += 1;
      void task().finally(() => {
        activePrefetchesRef.current -= 1;
        runPrefetchQueue();
      });
    }
  }, []);

  const prefetchTabData = useCallback(
    async <K extends AppTabKey>(key: K, search?: string) => {
      const cacheKey = buildKey(key, search);
      const existing = cache[cacheKey];

      if (existing?.data || existing?.status === "loading" || existing?.status === "refreshing") {
        return;
      }

      await refreshTabData(key, search);
    },
    [buildKey, cache, refreshTabData],
  );

  const queuePrefetch = useCallback(
    (key: AppTabKey, search?: string) => {
      const cacheKey = buildKey(key, search);
      const existing = cache[cacheKey];

      if (existing?.data || existing?.status === "loading" || existing?.status === "refreshing") {
        return;
      }

      prefetchQueueRef.current.push(() => prefetchTabData(key, search));
      runPrefetchQueue();
    },
    [buildKey, cache, prefetchTabData, runPrefetchQueue],
  );

  const invalidateTabData = useCallback(
    (predicate: (input: { cacheKey: string; tabKey: AppTabKey }) => boolean) => {
      setCache((current) => {
        const next = { ...current };

        for (const cacheKey of Object.keys(current)) {
          const tabKey = getEntryTabKey(cacheKey);

          if (tabKey && predicate({ cacheKey, tabKey })) {
            delete next[cacheKey];
          }
        }

        return next;
      });
    },
    [],
  );

  const prefetchRoute = useCallback(
    (href: string) => {
      const route = getTabRouteByHref(href);

      if (!route) {
        return;
      }

      queuePrefetch(route.key, route.key === "analytics" ? searchParams?.toString() : "");
    },
    [queuePrefetch, searchParams],
  );

  const showTabRoute = useCallback(
    (href: string) => {
      const route = getTabRouteByHref(href);

      if (!route) {
        return;
      }

      setOptimisticTabKey(route.key);
      queuePrefetch(route.key, route.key === "analytics" ? searchParams?.toString() : "");
    },
    [queuePrefetch, searchParams],
  );

  const getTabData = useCallback(
    <K extends AppTabKey>(key: K, search?: string) =>
      (cache[buildKey(key, search)] ?? { status: "idle" }) as CacheEntry<AppDataMap[K]>,
    [buildKey, cache],
  );

  useEffect(() => {
    const handleClear = () => {
      inFlightRef.current.clear();
      prefetchQueueRef.current = [];
      setCache({});
    };
    const handleInvalidate = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string | AppTabKey[] }>).detail;
      const kind = detail?.kind;

      if (Array.isArray(kind)) {
        invalidateTabData(({ tabKey }) => kind.includes(tabKey));
        return;
      }

      const invalidatedKeys = appDataInvalidationKeysForMutation(kind ?? "");
      invalidateTabData(({ tabKey }) => invalidatedKeys.has(tabKey));
    };

    window.addEventListener(APP_DATA_CLEAR_EVENT, handleClear);
    window.addEventListener(APP_DATA_INVALIDATE_EVENT, handleInvalidate);

    return () => {
      window.removeEventListener(APP_DATA_CLEAR_EVENT, handleClear);
      window.removeEventListener(APP_DATA_INVALIDATE_EVENT, handleInvalidate);
    };
  }, [invalidateTabData]);

  useEffect(() => {
    const idleCallback = window.requestIdleCallback ?? ((callback: IdleRequestCallback) => window.setTimeout(callback, 100));
    const cancelIdleCallback = window.cancelIdleCallback ?? window.clearTimeout;
    const idleId = idleCallback(() => {
      for (const route of APP_TAB_ROUTES) {
        queuePrefetch(route.key, route.key === "analytics" ? searchParams?.toString() : "");
      }
    });

    return () => cancelIdleCallback(idleId);
  }, [queuePrefetch, searchParams]);

  useEffect(() => {
    const activeRoute = APP_TAB_ROUTES.find((route) => route.href === pathname);

    if (activeRoute) {
      queuePrefetch(activeRoute.key, activeRoute.key === "analytics" ? searchParams?.toString() : "");
      setOptimisticTabKey((current) => (current === activeRoute.key ? null : current));
    }
  }, [pathname, queuePrefetch, searchParams]);

  const value = useMemo(
    () => ({
      workspace,
      getTabData,
      prefetchTabData,
      refreshTabData,
      invalidateTabData,
      prefetchRoute,
      optimisticTabKey,
      showTabRoute,
    }),
    [
      getTabData,
      invalidateTabData,
      optimisticTabKey,
      prefetchRoute,
      prefetchTabData,
      refreshTabData,
      showTabRoute,
      workspace,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider.");
  }

  return context;
}

export function useAppTabData<K extends AppTabKey>(key: K, search?: string) {
  const { getTabData, refreshTabData } = useAppData();
  const entry = getTabData(key, search);
  const normalizedSearch = normalizeSearch(search);

  useEffect(() => {
    if (entry.status === "idle") {
      void refreshTabData(key, normalizedSearch);
    }
  }, [entry.status, key, normalizedSearch, refreshTabData]);

  return entry;
}

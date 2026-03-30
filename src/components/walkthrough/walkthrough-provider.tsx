"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  PRODUCT_TOUR_VERSION,
  getWalkthroughSteps,
  type WalkthroughKey,
  type WalkthroughPlacement,
} from "@/lib/walkthrough/config";

type WalkthroughContextValue = {
  activeKey: WalkthroughKey | null;
  closeTour: () => void;
  startTour: (key: WalkthroughKey) => void;
};

type ActiveWalkthroughState = {
  key: WalkthroughKey;
  stepIndex: number;
};

const DESKTOP_BREAKPOINT = 1280;
const DEFAULT_CONTEXT: WalkthroughContextValue = {
  activeKey: null,
  closeTour: () => undefined,
  startTour: () => undefined,
};

const WalkthroughContext = createContext<WalkthroughContextValue>(DEFAULT_CONTEXT);

function normalizeRoute(route: string) {
  const [pathname, rawSearch = ""] = route.split("?");
  const params = new URLSearchParams(rawSearch);
  const sorted = [...params.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) =>
    leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
  );
  const normalizedSearch = new URLSearchParams(sorted);
  const search = normalizedSearch.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function getCurrentRoute(pathname: string, searchParams: URLSearchParams) {
  const search = searchParams.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function getVisibleTarget(target: string) {
  const selector = `[data-tour="${target}"]`;
  const matches = Array.from(document.querySelectorAll<HTMLElement>(selector));

  return (
    matches.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.width > 0 &&
        rect.height > 0
      );
    }) ?? null
  );
}

function buildCardStyle(
  rect: DOMRect | null,
  placement: WalkthroughPlacement,
  isDesktopViewport: boolean,
) {
  if (!isDesktopViewport) {
    return {
      bottom: 16,
      left: 16,
      right: 16,
    } satisfies CSSProperties;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(340, viewportWidth - 32);
  const estimatedHeight = 210;
  const gap = 20;

  if (!rect || placement === "center") {
    return {
      left: Math.max(16, (viewportWidth - width) / 2),
      top: Math.max(16, (viewportHeight - estimatedHeight) / 2),
      width,
    } satisfies CSSProperties;
  }

  const centerX = rect.left + rect.width / 2 - width / 2;
  const centeredTop = rect.top + rect.height / 2 - estimatedHeight / 2;
  let left = centerX;
  let top = rect.bottom + gap;

  if (placement === "top") {
    top = rect.top - estimatedHeight - gap;
  }

  if (placement === "left") {
    left = rect.left - width - gap;
    top = centeredTop;
  }

  if (placement === "right") {
    left = rect.right + gap;
    top = centeredTop;
  }

  left = Math.min(Math.max(16, left), viewportWidth - width - 16);
  top = Math.min(Math.max(16, top), viewportHeight - estimatedHeight - 16);

  return {
    left,
    top,
    width,
  } satisfies CSSProperties;
}

export function WalkthroughProvider({
  children,
  initialProductTourVersion,
}: {
  children: ReactNode;
  initialProductTourVersion: number | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeWalkthrough, setActiveWalkthrough] = useState<ActiveWalkthroughState | null>(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= DESKTOP_BREAKPOINT,
  );
  const [productTourVersion, setProductTourVersion] = useState(initialProductTourVersion);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const hasAutoStartedRef = useRef(false);
  const lastResolvedStepIdRef = useRef<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const updateViewport = () => setIsDesktopViewport(media.matches);
    updateViewport();
    media.addEventListener("change", updateViewport);

    return () => {
      media.removeEventListener("change", updateViewport);
    };
  }, []);

  const steps = useMemo(() => {
    if (!activeWalkthrough) {
      return [];
    }

    return getWalkthroughSteps(activeWalkthrough.key, isDesktopViewport);
  }, [activeWalkthrough, isDesktopViewport]);

  const currentStepIndex = activeWalkthrough
    ? Math.min(activeWalkthrough.stepIndex, Math.max(steps.length - 1, 0))
    : 0;
  const currentStep = activeWalkthrough ? steps[currentStepIndex] ?? null : null;

  const markWorkspaceTourComplete = useCallback(async () => {
    setProductTourVersion(PRODUCT_TOUR_VERSION);

    try {
      await fetch("/api/profile/product-tour", {
        body: JSON.stringify({ version: PRODUCT_TOUR_VERSION }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    } catch {
      // Keep the local version bumped even if the request fails.
    }
  }, []);

  const closeTour = useCallback(() => {
    if (activeWalkthrough?.key === "workspace") {
      void markWorkspaceTourComplete();
    }

    lastResolvedStepIdRef.current = null;
    setTargetRect(null);
    setActiveWalkthrough(null);

    const nextParams = new URLSearchParams(searchParams.toString());
    const hadTourParams = nextParams.has("tour") || nextParams.has("tourFocus");
    nextParams.delete("tour");
    nextParams.delete("tourFocus");

    if (hadTourParams) {
      const nextSearch = nextParams.toString();
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
    }
  }, [activeWalkthrough?.key, markWorkspaceTourComplete, pathname, router, searchParams]);

  const startTour = useCallback(
    (key: WalkthroughKey) => {
      const nextSteps = getWalkthroughSteps(key, isDesktopViewport);

      if (!nextSteps.length) {
        return;
      }

      lastResolvedStepIdRef.current = null;
      setTargetRect(null);
      setActiveWalkthrough({
        key,
        stepIndex: 0,
      });
    },
    [isDesktopViewport],
  );

  useEffect(() => {
    if (searchParams.get("tour") !== "workspace" || hasAutoStartedRef.current) {
      return;
    }

    hasAutoStartedRef.current = true;

    if (typeof productTourVersion === "number" && productTourVersion >= PRODUCT_TOUR_VERSION) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("tour");
      const nextSearch = nextParams.toString();
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      startTour("workspace");
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname, productTourVersion, router, searchParams, startTour]);

  useEffect(() => {
    if (!currentStep) {
      return;
    }

    const currentRoute = normalizeRoute(getCurrentRoute(pathname, new URLSearchParams(searchParams.toString())));
    const nextRoute = normalizeRoute(currentStep.route);

    if (currentRoute !== nextRoute) {
      router.replace(currentStep.route, { scroll: false });
    }
  }, [currentStep, pathname, router, searchParams]);

  useEffect(() => {
    if (!currentStep) {
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let timeoutId = 0;

    const syncRect = () => {
      if (!currentStep.target) {
        setTargetRect(null);
        return;
      }

      const element = getVisibleTarget(currentStep.target);
      if (!element) {
        return;
      }

      setTargetRect(element.getBoundingClientRect());
    };

    const resolveTarget = (attempt = 0) => {
      if (cancelled) {
        return;
      }

      if (!currentStep.target) {
        setTargetRect(null);
        return;
      }

      const element = getVisibleTarget(currentStep.target);

      if (!element) {
        if (attempt >= 40) {
          setTargetRect(null);
          return;
        }

        timeoutId = window.setTimeout(() => {
          frameId = window.requestAnimationFrame(() => resolveTarget(attempt + 1));
        }, 120);
        return;
      }

      if (lastResolvedStepIdRef.current !== currentStep.id) {
        element.scrollIntoView({
          behavior: "smooth",
          block: isDesktopViewport ? "center" : "nearest",
          inline: "nearest",
        });
        lastResolvedStepIdRef.current = currentStep.id;
      }

      setTargetRect(element.getBoundingClientRect());
    };

    resolveTarget();
    window.addEventListener("resize", syncRect);
    window.addEventListener("scroll", syncRect, true);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", syncRect);
      window.removeEventListener("scroll", syncRect, true);
    };
  }, [currentStep, isDesktopViewport]);

  const cardStyle = useMemo(() => {
    if (typeof document === "undefined" || !currentStep) {
      return undefined;
    }

    return buildCardStyle(targetRect, currentStep.placement, isDesktopViewport);
  }, [currentStep, isDesktopViewport, targetRect]);

  const showOverlay = typeof document !== "undefined" && activeWalkthrough && currentStep;

  return (
    <WalkthroughContext.Provider
      value={{
        activeKey: activeWalkthrough?.key ?? null,
        closeTour,
        startTour,
      }}
    >
      {children}
      {showOverlay
        ? createPortal(
            <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-transparent" />
              {targetRect ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none fixed rounded-[1.8rem] border border-white/85 shadow-[0_0_0_9999px_rgba(12,20,33,0.58),0_24px_48px_rgba(12,20,33,0.26)] transition-[top,left,width,height] duration-200"
                  style={{
                    height: targetRect.height,
                    left: targetRect.left,
                    top: targetRect.top,
                    width: targetRect.width,
                  }}
                />
              ) : (
                <div aria-hidden="true" className="fixed inset-0 bg-[rgba(12,20,33,0.58)]" />
              )}
              <div
                className="glass-control fixed grid gap-5 rounded-[1.8rem] border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,252,0.96))] p-5 shadow-[0_24px_54px_rgba(12,20,33,0.22)]"
                style={cardStyle}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-sidebar-muted">
                      Quick tour
                    </p>
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                      {currentStep.title}
                    </h2>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={closeTour}>
                    Skip
                  </Button>
                </div>

                <p className="text-sm leading-6 text-muted-foreground">{currentStep.body}</p>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {currentStepIndex + 1} / {steps.length}
                  </span>
                  <div className="flex items-center gap-2">
                    {currentStepIndex > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTargetRect(null);
                          lastResolvedStepIdRef.current = null;
                          setActiveWalkthrough((current) =>
                            current
                              ? { ...current, stepIndex: Math.max(currentStepIndex - 1, 0) }
                              : current,
                          );
                        }}
                      >
                        <ArrowLeft className="size-4" />
                        Back
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (currentStepIndex >= steps.length - 1) {
                          closeTour();
                          return;
                        }

                        setTargetRect(null);
                        lastResolvedStepIdRef.current = null;
                        setActiveWalkthrough((current) =>
                          current
                            ? {
                                ...current,
                                stepIndex: Math.min(currentStepIndex + 1, steps.length - 1),
                              }
                            : current,
                        );
                      }}
                    >
                      {currentStepIndex >= steps.length - 1 ? "Done" : "Next"}
                      {currentStepIndex >= steps.length - 1 ? null : (
                        <ArrowRight className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </WalkthroughContext.Provider>
  );
}

export function useWalkthrough() {
  return useContext(WalkthroughContext);
}

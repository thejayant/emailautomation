"use client";

import { Compass, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  walkthroughDefinitions,
  walkthroughOrder,
} from "@/lib/walkthrough/config";
import { useWalkthrough } from "@/components/walkthrough/walkthrough-provider";

export function WalkthroughTrigger() {
  const { startTour } = useWalkthrough();

  return (
    <div data-tour="page-header-tour-trigger">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Compass className="size-4" />
            Take a quick tour
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[19rem]">
          <div className="px-3 pb-2 pt-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-sidebar-muted">
              Walkthroughs
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Short tours with the main actions and setup areas.
            </p>
          </div>
          {walkthroughOrder.map((key) => {
            const walkthrough = walkthroughDefinitions[key];

            return (
              <DropdownMenuItem key={walkthrough.key} onSelect={() => startTour(walkthrough.key)}>
                <Play className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="grid gap-0.5">
                  <span>{walkthrough.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {walkthrough.description}
                  </span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


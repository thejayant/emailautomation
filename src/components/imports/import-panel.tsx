"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ImportPanelProps = {
  initialSheetUrl?: string;
};

type ImportResponse = {
  ok?: boolean;
  status?: string;
  count?: number;
  error?: string;
};

export function ImportPanel({ initialSheetUrl = "" }: ImportPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sheetUrl, setSheetUrl] = useState(initialSheetUrl);
  const [isFilePending, startFileTransition] = useTransition();
  const [isSheetPending, startSheetTransition] = useTransition();

  async function parseResponse(response: Response) {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return (await response.json()) as ImportResponse;
    }

    return null;
  }

  function refreshImports(status: string, count?: number) {
    const params = new URLSearchParams();
    params.set("status", status);
    if (typeof count === "number") {
      params.set("count", String(count));
    }

    router.push(`/imports?${params.toString()}`);
    router.refresh();
  }

  function showApiError(message?: string) {
    toast.error(message ?? "Import failed.");
  }

  function handleFileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startFileTransition(async () => {
      const formData = new FormData(event.currentTarget);
      const file = formData.get("file");

      if (!(file instanceof File) || !file.name) {
        showApiError("Please choose a CSV or XLSX file.");
        return;
      }

      const response = await fetch("/api/imports/upload", {
        method: "POST",
        body: formData,
        headers: {
          "x-import-client": "1",
        },
      });

      const payload = await parseResponse(response);

      if (!response.ok || payload?.error) {
        showApiError(payload?.error);
        return;
      }

      toast.success(`File import completed. ${payload?.count ?? 0} contact(s) processed.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      refreshImports(payload?.status ?? "uploaded", payload?.count);
    });
  }

  function handleSheetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startSheetTransition(async () => {
      const formData = new FormData();
      formData.set("url", sheetUrl);

      const response = await fetch("/api/imports/sheets", {
        method: "POST",
        body: formData,
        headers: {
          "x-import-client": "1",
        },
      });

      const payload = await parseResponse(response);

      if (!response.ok || payload?.error) {
        showApiError(payload?.error);
        return;
      }

      toast.success(`Google Sheet import completed. ${payload?.count ?? 0} contact(s) processed.`);
      refreshImports(payload?.status ?? "sheets-imported", payload?.count);
    });
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleFileSubmit} className="grid gap-4">
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept=".csv,.xlsx,.xls"
          className="rounded-3xl border border-border bg-white/75 p-4 text-sm"
        />
        <Button type="submit" disabled={isFilePending} className="h-11 rounded-full">
          {isFilePending ? "Uploading..." : "Upload file"}
        </Button>
      </form>

      <form onSubmit={handleSheetSubmit} className="grid gap-4">
        <input
          type="url"
          name="url"
          value={sheetUrl}
          onChange={(event) => setSheetUrl(event.target.value)}
          placeholder="https://docs.google.com/spreadsheets/..."
          className="h-11 rounded-2xl border border-border bg-white/75 px-4 text-sm"
        />
        <Button type="submit" variant="outline" disabled={isSheetPending} className="h-11 rounded-full">
          {isSheetPending ? "Importing..." : "Import public Sheet"}
        </Button>
      </form>
    </div>
  );
}

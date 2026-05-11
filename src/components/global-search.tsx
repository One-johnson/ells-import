"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function GlobalSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";
  const [value, setValue] = useState(qParam);
  const [debounced, setDebounced] = useState(qParam);

  useEffect(() => {
    setValue(qParam);
    setDebounced(qParam);
  }, [qParam]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), 350);
    return () => window.clearTimeout(t);
  }, [value]);

  useEffect(() => {
    // Only auto-navigate while user is already on search page.
    if (typeof window === "undefined") {
      return;
    }
    if (!window.location.pathname.startsWith("/search")) {
      return;
    }
    const q = debounced.trim();
    if (q) {
      router.replace(`/search?q=${encodeURIComponent(q)}`);
    } else {
      router.replace("/search");
    }
  }, [debounced, router]);

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const q = value.trim();
      if (q) {
        router.push(`/search?q=${encodeURIComponent(q)}`);
      } else {
        router.push("/search");
      }
    },
    [value, router],
  );

  return (
    <form role="search" className="w-full min-w-0" onSubmit={onSubmit}>
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          type="search"
          name="q"
          placeholder="Search products…"
          className="h-9 w-full pl-8"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
    </form>
  );
}

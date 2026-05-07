import { Suspense } from "react";

import { SearchResultsSkeleton } from "@/components/search/search-results-skeleton";

import { SearchContent } from "./search-content";

export const metadata = {
  title: "Search",
};

export default function SearchPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <h1 className="text-foreground text-lg font-semibold tracking-tight">Search</h1>
      <div className="mt-4">
        <Suspense fallback={<SearchResultsSkeleton />}>
          <SearchContent />
        </Suspense>
      </div>
    </div>
  );
}

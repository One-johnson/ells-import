import Link from "next/link";

import { ProductDetailContent } from "./product-detail-content";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: decodeURIComponent(slug) };
}

export default function ProductBySlugPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <p className="text-muted-foreground text-sm">
        <Link
          className="text-foreground font-medium underline-offset-4 hover:underline"
          href="/shop"
        >
          ← Shop
        </Link>
      </p>
      <div className="mt-4">
        <ProductDetailContent />
      </div>
    </div>
  );
}

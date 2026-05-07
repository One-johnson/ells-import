import { CategoryPageContent } from "./category-page-content";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return { title: decodeURIComponent(slug) };
}

export default function CategoryBySlugPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <CategoryPageContent />
    </div>
  );
}

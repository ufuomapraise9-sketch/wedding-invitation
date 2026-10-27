import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import WeddingInvitation from "@/app/components/WeddingInvitation";
import { formatWeddingDate, getWeddingById, weddings } from "@/data/weddings";

type WeddingPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return weddings.map(({ id }) => ({ id }));
}

export async function generateMetadata(
  { params }: WeddingPageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id } = await params;
  const wedding = getWeddingById(id);

  if (!wedding) {
    return { title: "Wedding invitation not found" };
  }

  const title = `${wedding.brideName} & ${wedding.groomName} | Wedding Invitation`;
  const description = "JPs2026..... please follow the link to process your invitation";
  const parentMetadata = await parent;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      images: parentMetadata.openGraph?.images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: parentMetadata.twitter?.images,
    },
  };
}

export default async function WeddingPage({ params }: WeddingPageProps) {
  const { id } = await params;
  const wedding = getWeddingById(id);

  if (!wedding) {
    notFound();
  }

  return <WeddingInvitation wedding={wedding} />;
}

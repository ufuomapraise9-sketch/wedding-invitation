import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WeddingInvitation from "@/app/components/WeddingInvitation";
import { formatWeddingDate, getWeddingById, weddings } from "@/data/weddings";

type WeddingPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return weddings.map(({ id }) => ({ id }));
}

export async function generateMetadata({ params }: WeddingPageProps): Promise<Metadata> {
  const { id } = await params;
  const wedding = getWeddingById(id);

  if (!wedding) {
    return { title: "Wedding invitation not found" };
  }

  return {
    title: `${wedding.brideName} & ${wedding.groomName} | Wedding Invitation`,
    description: `Celebrate with ${wedding.brideName} and ${wedding.groomName} on ${formatWeddingDate(wedding.date)}. ${wedding.hashtag}`,
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

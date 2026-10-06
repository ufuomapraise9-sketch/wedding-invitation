import type { Metadata } from "next";
import "./globals.css";

const deploymentHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  process.env.VERCEL_URL;
const metadataBase = deploymentHost
  ? new URL(`https://${deploymentHost}`)
  : new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase,
  title: "Beautifully Invited | Wedding Invitations",
  description:
    "Discover thoughtfully designed wedding invitations and celebrate a beautiful beginning.",
  openGraph: {
    type: "website",
    title: "Beautifully Invited | Wedding Invitations",
    description:
      "Discover thoughtfully designed wedding invitations and celebrate a beautiful beginning.",
    images: [
      {
        url: "/cover-photo.jpg",
        alt: "Wedding invitation cover",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beautifully Invited | Wedding Invitations",
    description:
      "Discover thoughtfully designed wedding invitations and celebrate a beautiful beginning.",
    images: [
      {
        url: "/cover-photo.jpg",
        alt: "Wedding invitation cover",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

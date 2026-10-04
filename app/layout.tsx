import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beautifully Invited | Wedding Invitations",
  description:
    "Discover thoughtfully designed wedding invitations and celebrate a beautiful beginning.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

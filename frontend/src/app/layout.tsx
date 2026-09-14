import "./globals.css";
import ClientLayout from "@/components/Layouts/ClientLayout";

export const metadata = {
  title: "Admin Dashboard",
  description: "Admin Dashboard",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <section
          ref={null}
          aria-label="Notifications alt+T"
          tabIndex={-1}
          aria-live="polite"
          aria-relevant="additions text"
          aria-atomic="false"
          suppressHydrationWarning={true}
        />
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
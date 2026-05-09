import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gustami Delivery",
  description: "Piattaforma delivery indipendente Gustami",
  manifest: "/manifest.json",
  applicationName: "Gustami Delivery",
  appleWebApp: {
    capable: true,
    title: "Gustami",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#00c853",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        <Script id="register-service-worker" strategy="afterInteractive">
          {`
            if ("serviceWorker" in navigator) {
              window.addEventListener("load", function () {
                navigator.serviceWorker
                  .register("/sw.js")
                  .then(function () {
                    console.log("Service Worker registrato");
                  })
                  .catch(function (error) {
                    console.log("Errore Service Worker:", error);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
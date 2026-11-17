import type { Metadata, Viewport } from "next";
import "../globals.css";
import PWARegister from "./pwa-register";

export const metadata: Metadata = {
  title: "VisionTV Gestor",
  description: "Gestão de clientes, assinaturas e financeiro",
  manifest: "/manifest.webmanifest",
  applicationName: "VisionTV Gestor",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "VisionTV Gestor" },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: [{ url: "/apple-touch-icon.jpg", type: "image/jpeg", sizes: "180x180" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}<PWARegister /></body></html>;
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIESEC in UNS — Performance Dashboard",
  description:
    "One-page oGX & iCX performance analytics dashboard using AIESEC GIS and Analytics APIs.",
};

const themeInitScript = `try{var v=localStorage.getItem("color-scheme");if(v==="light"||v==="dark"){document.querySelector('meta[name="color-scheme"]').content=v}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

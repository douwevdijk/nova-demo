import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "Nova — AI Consciousness",
  description: "Experience the future of intelligent conversation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          // Polyfill: Safari doesn't support 'detail' in performance.measure() options
          try {
            performance.measure('__test__', { start: 0, end: 0, detail: {} });
          } catch (e) {
            var origMeasure = performance.measure.bind(performance);
            performance.measure = function(name, startOrOptions, end) {
              if (startOrOptions && typeof startOrOptions === 'object' && 'detail' in startOrOptions) {
                var opts = { start: startOrOptions.start, end: startOrOptions.end };
                return origMeasure(name, opts);
              }
              return origMeasure(name, startOrOptions, end);
            };
          }
          try { performance.clearMeasures('__test__'); } catch(e) {}
        `}} />
      </head>
      <body className={`${spaceGrotesk.variable} ${cormorant.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

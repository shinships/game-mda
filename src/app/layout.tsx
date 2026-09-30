import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const serif = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});
const sans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});
const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const gaId = process.env.NEXT_PUBLIC_GA_ID;
const pixel = pixelId && /^\d+$/.test(pixelId) ? pixelId : null;
const ga = gaId && /^G-[A-Z0-9]+$/.test(gaId) ? gaId : null;

export const metadata: Metadata = {
  title: "Xưởng Phối Vật Liệu Nội Thất | MD Architects",
  description:
    "Thử thách 60 giây: phối cốt ván, bề mặt và nẹp cạnh qua 3 không gian. Khám phá vật liệu nội thất và nhận voucher từ MD Architects.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a className="skip-link" href="#noi-dung">
          Đi đến nội dung
        </a>
        {children}
        {pixel && (
          <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${pixel}');fbq('track','PageView');
        `}</Script>
        )}
        {ga && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">{`
            window.dataLayer=window.dataLayer||[];
            function gtag(){dataLayer.push(arguments);}
            gtag('js',new Date());gtag('config','${ga}');
          `}</Script>
          </>
        )}
      </body>
    </html>
  );
}

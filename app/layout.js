import "./globals.css";
import { Suspense } from "react";
import TopBar, { TopBarFallback } from "@/components/TopBar";

export const metadata = {
  // 미리보기 이미지 주소를 배포 주소 기준으로 만든다 (카톡이 이미지를 가져갈 수 있게)
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://moimpick.vercel.app"),
  title: "모임픽",
  description: "링크 하나로 날짜와 장소를 함께 정하는 약속 조율 서비스",
  openGraph: {
    title: "모임픽",
    description: "링크 하나로 날짜와 장소를 함께 정하는 약속 조율 서비스",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <main className="mx-auto w-full max-w-md px-4 pb-8">
          {/* 지금 주소(usePathname)를 읽어서 Suspense가 필요하다. */}
          <Suspense fallback={<TopBarFallback />}>
            <TopBar />
          </Suspense>
          {children}
        </main>
      </body>
    </html>
  );
}

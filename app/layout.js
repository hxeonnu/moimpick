import "./globals.css";

export const metadata = {
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
        <main className="mx-auto w-full max-w-md px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

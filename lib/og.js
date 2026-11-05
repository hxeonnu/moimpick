import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 링크 미리보기 이미지(og:image) 공통. 카톡·메신저에 링크를 올리면 카드 위쪽에 크게 보인다.
// 기본 글꼴은 한글이 없어서 Pretendard(SIL OFL)를 같이 싣는다.
export const OG_SIZE = { width: 1200, height: 630 };
export const C = { brand: "#5b5bd6", brandInk: "#3a3aa8", brandSoft: "#eeeefc", ink: "#1c1c28", sub: "#6b6b80", canvas: "#f4f5fa" };

export async function ogFonts() {
  const dir = join(process.cwd(), "assets/fonts");
  const [bold, regular] = await Promise.all([readFile(join(dir, "Pretendard-Bold.woff")), readFile(join(dir, "Pretendard-Regular.woff"))]);
  return [
    { name: "Pretendard", data: bold, weight: 700, style: "normal" },
    { name: "Pretendard", data: regular, weight: 400, style: "normal" },
  ];
}

// 로고(지도 핀 안에 체크). components/Logo.js와 같은 모양.
export function OgLogo({ size = 72, bg = C.brand, pin = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="9" fill={bg} />
      <path d="M16 26.5s-7.5-7.6-7.5-13a7.5 7.5 0 0 1 15 0c0 5.4-7.5 13-7.5 13Z" fill={pin} />
      <path d="m12.6 13.6 2.4 2.4 4.4-4.6" fill="none" stroke={bg} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 흰 카드 모양 (사이트 기본·모임별 이미지가 같이 쓴다): 로고 / 큰 제목 / 설명 / 아래 뱃지
// 제목은 줄 배열로도 받는다. 한글은 글자 단위로 줄이 바뀌므로 keep-all로 단어째 넘긴다.
export function OgCard({ title, subtitle, badge, titleSize = 96 }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", padding: 48, background: C.brand, fontFamily: "Pretendard" }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 60px",
          borderRadius: 40,
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <OgLogo size={64} />
          <span style={{ fontSize: 40, fontWeight: 700, color: C.brandInk }}>모임픽</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[title].flat().map((line) => (
            <span key={line} style={{ fontSize: titleSize, fontWeight: 700, color: C.ink, lineHeight: 1.15, wordBreak: "keep-all" }}>
              {line}
            </span>
          ))}
          <span style={{ fontSize: 38, color: C.sub }}>{subtitle}</span>
        </div>
        {badge ? (
          <div style={{ display: "flex" }}>
            <span
              style={{ fontSize: 34, fontWeight: 700, color: C.brandInk, background: C.brandSoft, padding: "12px 28px", borderRadius: 999 }}
            >
              {badge}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex" }} />
        )}
      </div>
    </div>
  );
}

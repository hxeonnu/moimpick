import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, ogFonts } from "@/lib/og";

// 사이트 기본 링크 미리보기 이미지 (moimpick.vercel.app). 모임별 이미지와 같은 흰 카드 모양.
export const alt = "모임픽 - 링크 하나로 날짜와 장소를 함께 정하는 약속 조율 서비스";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <OgCard title={["링크 하나로", "날짜와 장소를 함께 정해요"]} subtitle="가입 없이 투표하고, 결과는 카톡으로 바로 공지해요" badge="약속 조율 서비스" titleSize={72} />,
    { ...size, fonts: await ogFonts() },
  );
}

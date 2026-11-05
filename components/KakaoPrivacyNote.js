import { KEEP_DAYS } from "@/lib/format";

// 카카오 연동 아래에 작게 붙이는 개인정보 안내. 실제로 저장하는 것만 적는다.
export default function KakaoPrivacyNote({ className = "" }) {
  return (
    <p className={`text-[11px] leading-relaxed text-sub ${className}`}>
      🔒 카카오 연결 시 <strong className="font-semibold">카카오 회원번호만</strong> 저장해요. 이름·이메일·프로필 사진은 받지 않고, 회원번호는
      내가 만든 모임을 찾는 데만 써요. 연결을 끊으면 이 기기에서 로그아웃돼요. 모임은 마감 {KEEP_DAYS}일 뒤 참여자 이름·투표와 함께 자동으로
      지워져요.
    </p>
  );
}

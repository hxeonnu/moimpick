// 모임픽 로고: 지도 핀 안에 체크 (장소를 "골랐다"는 뜻). 브라우저 탭 아이콘(app/icon.svg)과 같은 모양.
export default function Logo({ size = 32, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="9" fill="#5b5bd6" />
      <path d="M16 26.5s-7.5-7.6-7.5-13a7.5 7.5 0 0 1 15 0c0 5.4-7.5 13-7.5 13Z" fill="#fff" />
      <path d="m12.6 13.6 2.4 2.4 4.4-4.6" fill="none" stroke="#5b5bd6" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

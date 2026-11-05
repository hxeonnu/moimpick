// 화면 아래에 잠깐 떴다 사라지는 알림. 상태 없이 CSS 애니메이션으로만 사라진다 (새로 띄우려면 key를 바꾼다).
export function Toast({ children }) {
  return (
    <div
      role="status"
      className="toast pointer-events-none fixed bottom-6 left-1/2 z-20 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
    >
      {children}
    </div>
  );
}

// 불러오는 동안 보여 주는 회색 뼈대. 글자만 있을 때보다 화면이 덜 끊겨 보인다.
export function Skeleton({ blocks = [96, 160, 120] }) {
  return (
    <div className="animate-pulse space-y-4" aria-label="불러오는 중">
      {blocks.map((h, i) => (
        <div key={i} className="rounded-2xl bg-white" style={{ height: h }} />
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";

// 모든 화면 맨 위: 뒤로 가기 + 모임픽 로고(누르면 첫 화면). 첫 화면에서는 뒤로 가기를 숨긴다.
// 카톡에서 링크로 바로 들어오면 돌아갈 기록이 없으므로, 그때 뒤로 가기는 첫 화면으로 보낸다.
const bar = "sticky top-0 z-10 -mx-4 mb-4 flex h-14 items-center gap-1 bg-canvas/90 px-4 backdrop-blur";

function HomeLink() {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-bold">
      <Logo size={28} />
      모임픽
    </Link>
  );
}

// 주소를 읽기 전(첫 로딩) 잠깐 보이는 모양: 로고만
export function TopBarFallback() {
  return (
    <header className={bar}>
      <HomeLink />
    </header>
  );
}

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  function back() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <header className={bar}>
      {pathname !== "/" && (
        <button onClick={back} aria-label="뒤로 가기" className="-ml-2 grid size-9 place-items-center rounded-full text-xl hover:bg-white">
          ←
        </button>
      )}
      <HomeLink />
    </header>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 몇 초마다 화면을 새로 받아서, 다른 사람의 투표가 순위에 바로 반영되게 한다.
export default function AutoRefresh({ seconds = 5 }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}

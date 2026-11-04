"use client";

import { useRef, useState } from "react";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand";

// 한 칸에 하나씩 적고 "+ 추가"로 칸을 늘리는 입력. 칸마다 같은 name으로 보내서 서버에서 getAll로 받는다.
// 값은 state로 들고 있어서, 서버가 오류를 돌려줘도 적은 내용이 지워지지 않는다.
export default function ListInput({ name, placeholders, initial = 1, min = 0, addLabel, required = false }) {
  const nextId = useRef(initial);
  const [rows, setRows] = useState(() => Array.from({ length: initial }, (_, i) => ({ id: i, value: "" })));
  const refs = useRef({});

  const placeholder = (i) => placeholders[Math.min(i, placeholders.length - 1)];

  function add(focus = true) {
    const id = nextId.current++;
    setRows((r) => [...r, { id, value: "" }]);
    if (focus) setTimeout(() => refs.current[id]?.focus(), 0);
  }

  function remove(id) {
    setRows((r) => r.filter((row) => row.id !== id));
  }

  function change(id, value) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, value } : row)));
  }

  // 엔터를 누르면 모임이 만들어지지 않고 다음 칸으로 넘어간다. (한글 입력 중 엔터는 글자 확정이라 무시)
  function onKeyDown(e, index) {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const next = rows[index + 1];
    if (next) refs.current[next.id]?.focus();
    else if (e.currentTarget.value.trim()) add();
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={row.id} className="flex gap-2">
          <input
            ref={(el) => {
              refs.current[row.id] = el;
            }}
            name={name}
            value={row.value}
            onChange={(e) => change(row.id, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={input}
            placeholder={placeholder(i)}
            required={required && i < min}
          />
          {rows.length > Math.max(min, 1) && (
            <button
              type="button"
              onClick={() => remove(row.id)}
              aria-label="이 칸 지우기"
              className="shrink-0 rounded-xl border border-line px-3 text-sub"
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => add()} className="w-full rounded-xl border border-dashed border-line py-2 text-sm font-semibold text-sub">
        + {addLabel}
      </button>
    </div>
  );
}

"use client";

import { useRef, useState, useSyncExternalStore } from "react";

const input = "min-w-0 rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand";
const WEEK = "일월화수목금토";

// 날짜 후보는 달력에서 날짜를, 필요하면 시간까지 고른다. 저장은 "11/8 (토) 18:00" 같은 글자로 한다.
export function dateLabel(date, time) {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  const week = WEEK[new Date(y, m - 1, d).getDay()];
  return `${m}/${d} (${week})${time ? ` ${time}` : ""}`;
}

// 지난 날짜는 못 고르게 오늘(한국 시간)부터. 서버에서는 오늘을 모르므로 빈 값.
const noop = () => () => {};
const useToday = () =>
  useSyncExternalStore(noop, () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }), () => "");

function DateTime({ value, onChange, required }) {
  const today = useToday();
  return (
    <>
      <input
        type="date"
        value={value.date}
        min={today || undefined}
        onChange={(e) => onChange({ ...value, date: e.target.value })}
        className={`${input} flex-[3]`}
        aria-label="날짜"
        required={required}
      />
      <input
        type="time"
        step={1800}
        value={value.time}
        onChange={(e) => onChange({ ...value, time: e.target.value })}
        className={`${input} flex-[2]`}
        aria-label="시간 (선택)"
      />
    </>
  );
}

// 후보 하나 (후보 추가 화면). 고른 값은 name 칸에 "11/8 (토) 18:00"으로 들어간다.
export function DateField({ name }) {
  const [value, setValue] = useState({ date: "", time: "" });
  return (
    <div>
      <div className="flex gap-2">
        <DateTime value={value} onChange={setValue} required />
      </div>
      <input type="hidden" name={name} value={dateLabel(value.date, value.time)} />
      <p className="mt-1 text-xs text-sub">시간은 비워 두면 날짜만 올라가요.</p>
    </div>
  );
}

// 여러 개 (모임 만들기). 칸 하나에 날짜 하나, "+ 날짜 추가"로 늘린다.
export function DateList({ name, initial = 2 }) {
  const nextId = useRef(initial);
  const [rows, setRows] = useState(() => Array.from({ length: initial }, (_, i) => ({ id: i, date: "", time: "" })));

  const change = (id, value) => setRows((r) => r.map((row) => (row.id === id ? { ...row, ...value } : row)));
  const add = () => setRows((r) => [...r, { id: nextId.current++, date: "", time: "" }]);
  const remove = (id) => setRows((r) => r.filter((row) => row.id !== id));

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex gap-2">
          <DateTime value={row} onChange={(value) => change(row.id, value)} />
          <input type="hidden" name={name} value={dateLabel(row.date, row.time)} />
          {rows.length > 1 && (
            <button type="button" onClick={() => remove(row.id)} aria-label="이 칸 지우기" className="shrink-0 rounded-xl border border-line px-3 text-sub">
              ×
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={add} className="w-full rounded-xl border border-dashed border-line py-2 text-sm font-semibold text-sub">
        + 날짜 추가
      </button>
      <p className="text-xs text-sub">시간은 비워 두면 날짜만 올라가요.</p>
    </div>
  );
}

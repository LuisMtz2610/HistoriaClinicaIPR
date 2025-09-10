"use client";
import React from "react";

type Day = { date: Date, inMonth: boolean };

function startOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function addDays(d: Date, n: number){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function sameDay(a: Date, b: Date){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }

export default function CalendarMonth({
  value,
  onChange,
  events = [], // array of ISO starts_at for markers
}: {
  value: Date;
  onChange: (d: Date) => void;
  events?: string[];
}) {
  const first = startOfMonth(value);
  const last = endOfMonth(value);
  const start = addDays(first, -((first.getDay()+6)%7)); // Monday-first grid
  const days: Day[] = [];
  for (let i=0;i<42;i++){ // 6 weeks grid
    const date = addDays(start, i);
    days.push({ date, inMonth: date.getMonth()===value.getMonth() });
  }
  const hasEvent = (d: Date) => events?.some(e => sameDay(new Date(e), d));

  return (
    <div className="border rounded">
      <div className="grid grid-cols-7 text-xs bg-neutral-50">
        {["L","M","M","J","V","S","D"].map((d,i)=>(
          <div key={i} className="px-2 py-1 text-center text-neutral-600">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d,i)=>{
          const isToday = sameDay(d.date, new Date());
          const selected = sameDay(d.date, value);
          return (
            <button
              key={i}
              onClick={()=>onChange(d.date)}
              className={[
                "h-16 p-2 border-t border-l text-left relative",
                !d.inMonth ? "text-neutral-400" : "",
                selected ? "ring-2 ring-emerald-600" : "",
              ].join(" ")}
            >
              <div className={"text-xs "+(isToday?"font-semibold text-emerald-700":"")}>
                {d.date.getDate()}
              </div>
              {hasEvent(d.date) && <span className="absolute bottom-1 left-1 h-2 w-2 rounded-full bg-emerald-600" />}
            </button>
          )
        })}
      </div>
    </div>
  );
}

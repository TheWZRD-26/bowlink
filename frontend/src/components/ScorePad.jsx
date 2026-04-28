import React from "react";

// Official archery target face colors. Values 1..10 and M (miss).
const ZONES = [
  { value: 10, label: "X", isX: true, cls: "bg-[#FDE047] text-black border-black/30" },
  { value: 10, label: "10", isX: false, cls: "bg-[#FDE047] text-black border-black/30" },
  { value: 9, label: "9", isX: false, cls: "bg-[#FDE047] text-black border-black/30" },
  { value: 8, label: "8", isX: false, cls: "bg-[#EF4444] text-white" },
  { value: 7, label: "7", isX: false, cls: "bg-[#EF4444] text-white" },
  { value: 6, label: "6", isX: false, cls: "bg-[#3B82F6] text-white" },
  { value: 5, label: "5", isX: false, cls: "bg-[#3B82F6] text-white" },
  { value: 4, label: "4", isX: false, cls: "bg-[#18181B] text-white border border-zinc-700" },
  { value: 3, label: "3", isX: false, cls: "bg-[#18181B] text-white border border-zinc-700" },
  { value: 2, label: "2", isX: false, cls: "bg-white text-black border border-zinc-400" },
  { value: 1, label: "1", isX: false, cls: "bg-white text-black border border-zinc-400" },
  { value: 0, label: "M", isX: false, cls: "bg-[#71717A] text-white" },
];

export default function ScorePad({ onScore, disabled }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 md:gap-3">
      {ZONES.map((z, i) => (
        <button
          key={`${z.label}-${i}`}
          data-testid={`score-${z.label}`}
          disabled={disabled}
          onClick={() => onScore(z.value, z.isX)}
          className={`${z.cls} h-16 md:h-20 rounded-md font-heading font-black text-3xl md:text-4xl flex items-center justify-center transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:pointer-events-none`}
        >
          {z.label}
        </button>
      ))}
    </div>
  );
}

export function formatArrow(value, isX) {
  if (value === null || value === undefined) return "·";
  if (value === 0) return "M";
  if (isX) return "X";
  return String(value);
}

export function arrowColor(value, isX) {
  if (value === null || value === undefined) return "bg-zinc-900 text-zinc-600 border border-zinc-800";
  if (value === 0) return "bg-[#71717A] text-white";
  if (value >= 9 || isX) return "bg-[#FDE047] text-black";
  if (value >= 7) return "bg-[#EF4444] text-white";
  if (value >= 5) return "bg-[#3B82F6] text-white";
  if (value >= 3) return "bg-[#18181B] text-white border border-zinc-700";
  return "bg-white text-black";
}

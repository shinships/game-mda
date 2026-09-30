"use client";

import { ClipboardList } from "lucide-react";
import { selectCurrentScenario, useGameStore } from "@/store/useGameStore";
const budgets = {
  BUDGET: "Ngân sách vừa phải",
  STANDARD: "Ngân sách tiêu chuẩn",
  PREMIUM: "Ngân sách cao cấp",
};
export function OrderTicket() {
  const scenario = useGameStore(selectCurrentScenario);
  const level = useGameStore((s) => s.levelIndex);
  const total = useGameStore((s) => s.totalLevels);
  return (
    <section className="order-ticket" aria-labelledby="order-title">
      <div className="ticket-meta">
        <span className="eyebrow">
          <ClipboardList size={16} aria-hidden="true" /> ĐỀ BÀI TỪ KHÁCH HÀNG
        </span>
        <span className="budget-badge">{budgets[scenario.budgetTier]}</span>
      </div>
      <div className="ticket-heading">
        <h1 id="order-title" data-phase-heading tabIndex={-1}>
          {scenario.title}
        </h1>
        <span className="level-label">
          Màn {level + 1}/{total}
        </span>
      </div>
      <p className="customer-demand">“{scenario.customerDemand}”</p>
      <div
        className="level-progress"
        aria-label={`Tiến độ: màn ${level + 1} trên ${total}`}
      >
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i <= level ? "filled" : ""} />
        ))}
      </div>
    </section>
  );
}

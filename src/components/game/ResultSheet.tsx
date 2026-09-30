"use client";

import { ArrowRight, Lightbulb, Star } from "lucide-react";
import { getMaterial, SLOT_LABELS } from "@/data/materials";
import { selectCurrentResult, useGameStore } from "@/store/useGameStore";
import { Dialog } from "./Dialog";
const verdicts = {
  IDEAL: "Phù hợp nhất",
  ACCEPTABLE: "Có thể sử dụng",
  NEUTRAL: "Chưa tối ưu",
  FORBIDDEN: "Không phù hợp",
};
export function ResultSheet({ onClose }: { onClose: () => void }) {
  const result = useGameStore(selectCurrentResult);
  const next = useGameStore((s) => s.next);
  if (!result) return null;
  return (
    <Dialog titleId="result-title" onClose={onClose}>
      <div className="result-content" aria-live="polite">
        <p className="eyebrow">PHIẾU KIỂM ĐỊNH VẬT LIỆU</p>
        <div className={`result-score status-${result.status.toLowerCase()}`}>
          <strong>{result.score}</strong>
          <span>/ 100 điểm</span>
          <div
            className="result-stars"
            aria-label={`${result.stars} trên 5 sao`}
          >
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                size={17}
                fill={i < result.stars ? "currentColor" : "none"}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        <h2 id="result-title">{result.feedback.headline}</h2>
        <p className="result-explanation">{result.feedback.explanation}</p>
        <div className="breakdown">
          {result.breakdown.map((item) => (
            <div className="breakdown-row" key={item.slot}>
              <span>
                <small>{SLOT_LABELS[item.slot]}</small>
                <strong>{getMaterial(item.material).shortLabel}</strong>
                <span
                  className={`verdict verdict-${item.verdict.toLowerCase()}`}
                >
                  {verdicts[item.verdict]}
                </span>
              </span>
              <div className="breakdown-value">
                <strong>
                  {item.points}/{item.maxPoints}
                </strong>
                <meter
                  min={0}
                  max={item.maxPoints}
                  value={item.points}
                  aria-label={`Điểm ${SLOT_LABELS[item.slot]}`}
                />
              </div>
            </div>
          ))}
        </div>
        {result.penalties.length > 0 && (
          <div className="penalty-box">
            <h3>Chi tiết cần lưu ý</h3>
            {result.penalties.map((penalty) => (
              <p key={penalty.id}>
                <strong>−{penalty.points} điểm</strong> {penalty.message}
              </p>
            ))}
          </div>
        )}
        {result.budgetNote && (
          <p className="budget-note">
            <strong>Về ngân sách: </strong>
            {result.budgetNote}
          </p>
        )}
        <div className="expert-tip">
          <Lightbulb size={21} aria-hidden="true" />
          <p>{result.feedback.expertTip}</p>
        </div>
      </div>
      <div className="result-actions">
        <button className="button button-primary" onClick={next}>
          Tiếp tục <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </Dialog>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw, Award } from "lucide-react";
import { SCENARIOS } from "@/data/scenarios";
import {
  selectAverageScore,
  selectRank,
  selectTotalScore,
  useGameHydrated,
  useGameStore,
} from "@/store/useGameStore";
import { HeroBanner } from "@/components/landing/HeroBanner";
import { LeadCaptureForm } from "@/components/lead/LeadCaptureForm";
import { VoucherSuccess } from "@/components/lead/VoucherSuccess";
import { OrderTicket } from "./OrderTicket";
import { MaterialWorkbench } from "./MaterialWorkbench";
import { VisualPreview } from "./VisualPreview";
import { ResultSheet } from "./ResultSheet";

function Summary() {
  const rank = useGameStore(selectRank);
  const total = useGameStore(selectTotalScore);
  const average = useGameStore(selectAverageScore);
  const results = useGameStore((s) => s.results);
  const openLeadForm = useGameStore((s) => s.openLeadForm);
  const reset = useGameStore((s) => s.reset);
  return (
    <section className="completion-card" aria-labelledby="summary-title">
      <span className="award-emblem">
        <Award size={40} strokeWidth={1.2} aria-hidden="true" />
      </span>
      <p className="eyebrow">HOÀN THÀNH XƯỞNG VẬT LIỆU</p>
      <h1 id="summary-title" data-phase-heading tabIndex={-1}>
        {rank.title}
      </h1>
      <p className="completion-description">{rank.description}</p>
      <div className="summary-stats">
        <span>
          <strong>
            {average}
            <small>/100</small>
          </strong>
          Điểm trung bình
        </span>
        <span>
          <strong>
            {total}
            <small>/{SCENARIOS.length * 100}</small>
          </strong>
          Tổng điểm
        </span>
      </div>
      <div className="summary-levels">
        {SCENARIOS.map((scenario, i) => (
          <div key={scenario.id}>
            <span className="legend-number">0{i + 1}</span>
            <span>{scenario.title}</span>
            <strong>
              {results[scenario.id]?.score ?? "—"}
              <small>/100</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="summary-gift">
        <span>Voucher dành cho bạn</span>
        <strong>{rank.voucherLabel}</strong>
        {rank.bonus && <p>{rank.bonus}</p>}
      </div>
      <button className="button button-primary" onClick={openLeadForm}>
        Nhận voucher của bạn <ArrowRight size={18} aria-hidden="true" />
      </button>
      <button className="button button-text" onClick={reset}>
        <RotateCcw size={16} aria-hidden="true" /> Chơi lại thử thách
      </button>
    </section>
  );
}

function ResultPanel() {
  const [open, setOpen] = useState(true);
  const reopen = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) reopen.current?.focus();
  }, [open]);
  return (
    <>
      <div className="result-reopen">
        <button
          ref={reopen}
          className="button button-primary"
          onClick={() => setOpen(true)}
        >
          Xem kết quả kiểm định <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
      {open && <ResultSheet onClose={close} />}
    </>
  );
}

export function GameContainer() {
  const hydrated = useGameHydrated();
  const phase = useGameStore((s) => s.phase);
  const level = useGameStore((s) => s.levelIndex);
  const reset = useGameStore((s) => s.reset);
  const region = useRef<HTMLDivElement>(null);
  const previous = useRef<string>("");
  const focusStep =
    !hydrated || phase === "INTRO"
      ? "INTRO"
      : ["BRIEF", "SELECTING", "TESTING", "RESULT"].includes(phase)
        ? `LEVEL-${level}`
        : ["LEAD_FORM", "SUBMITTING", "SUBMIT_ERROR"].includes(phase)
          ? "LEAD"
          : phase;
  useEffect(() => {
    if (
      previous.current !== focusStep &&
      (focusStep !== "INTRO" || previous.current !== "")
    ) {
      region.current
        ?.querySelector<HTMLElement>("[data-phase-heading]")
        ?.focus({ preventScroll: true });
      region.current?.scrollIntoView({ behavior: "instant", block: "start" });
    }
    previous.current = focusStep;
  }, [focusStep]);
  if (!hydrated || phase === "INTRO")
    return (
      <div ref={region}>
        <HeroBanner ready={hydrated} />
      </div>
    );
  const workspace = ["BRIEF", "SELECTING", "TESTING", "RESULT"].includes(phase);
  const lead = ["LEAD_FORM", "SUBMITTING", "SUBMIT_ERROR"].includes(phase);
  return (
    <div className="game-container page-width" ref={region} id="atelier">
      <div className="game-topline">
        <span className="eyebrow">MD / XƯỞNG VẬT LIỆU</span>
        <button
          className="button button-text"
          onClick={reset}
          disabled={phase === "SUBMITTING" || phase === "TESTING"}
        >
          <RotateCcw size={15} aria-hidden="true" /> Chơi lại
        </button>
      </div>
      {workspace && (
        <>
          <OrderTicket />
          <div className="workspace-grid">
            <MaterialWorkbench key={level} />
            <VisualPreview />
          </div>
          {phase === "RESULT" && <ResultPanel />}
        </>
      )}
      {phase === "SUMMARY" && <Summary />}
      {lead && <LeadCaptureForm />}
      {phase === "SUCCESS" && <VoucherSuccess />}
    </div>
  );
}

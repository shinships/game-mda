"use client";

import { useEffect, useId, useRef } from "react";
import { Layers3, LoaderCircle } from "lucide-react";
import { getMaterial, SLOT_LABELS, SLOT_ORDER } from "@/data/materials";
import {
  selectCurrentResult,
  selectCurrentSelection,
  useGameStore,
} from "@/store/useGameStore";
import { materialStyle, materialTexture } from "./MaterialSwatch";

export function VisualPreview() {
  const selection = useGameStore(selectCurrentSelection);
  const result = useGameStore(selectCurrentResult);
  const phase = useGameStore((s) => s.phase);
  const finishTest = useGameStore((s) => s.finishTest);
  const grainId = useId().replaceAll(":", "");
  const previewRef = useRef<HTMLElement>(null);
  const testing = phase === "TESTING";
  const effect =
    testing || phase === "RESULT" ? result?.visualEffect : undefined;
  useEffect(() => {
    if (!testing) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const bounds = previewRef.current?.getBoundingClientRect();
    if (bounds && (bounds.top < 0 || bounds.bottom > window.innerHeight)) {
      previewRef.current?.scrollIntoView({
        behavior: reduced.matches ? "instant" : "smooth",
        block: "center",
      });
    }
    let timer = window.setTimeout(finishTest, reduced.matches ? 250 : 2200);
    const onMotionChange = () => {
      if (reduced.matches) {
        window.clearTimeout(timer);
        timer = window.setTimeout(finishTest, 250);
      }
    };
    reduced.addEventListener("change", onMotionChange);
    return () => {
      window.clearTimeout(timer);
      reduced.removeEventListener("change", onMotionChange);
    };
  }, [testing, finishTest]);
  return (
    <aside
      ref={previewRef}
      className="visual-preview"
      aria-labelledby="preview-title"
      aria-busy={testing}
    >
      <div className="preview-heading">
        <span className="eyebrow" id="preview-title">
          MẶT CẮT VẬT LIỆU
        </span>
        <Layers3 size={18} aria-hidden="true" />
      </div>
      <div
        className={`preview-stage ${effect ? `effect-${effect.toLowerCase()}` : ""}`}
      >
        <span className="preview-axis axis-y" aria-hidden="true" />
        <span className="preview-axis axis-x" aria-hidden="true" />
        <div className="sample-board" aria-hidden="true">
          <div
            className={`board-surface texture-${materialTexture(selection.surface)}`}
            style={materialStyle(selection.surface)}
          >
            <svg className="wood-pattern" width="100%" height="100%">
              <defs>
                <pattern
                  id={grainId}
                  width="58"
                  height="160"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M8 0Q35 60 9 160M24 0Q2 80 29 160M42 0Q63 90 45 160M54 0Q26 40 56 160"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${grainId})`} />
            </svg>
            <span className="gloss-sweep" />
            <svg className="scratch-overlay" viewBox="0 0 300 160">
              <path
                d="M40 30l100 65m-70-53l100 70m-20-100l88 58m-70-26l83 52"
                stroke="#554c43"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
          <div
            className={`board-core texture-${materialTexture(selection.core)}`}
            style={materialStyle(selection.core)}
          />
          <div
            className={`board-edge texture-${materialTexture(selection.edge)}`}
            style={materialStyle(selection.edge)}
          >
            <span className="water-stain" />
          </div>
        </div>
        <span className="sample-measure" aria-hidden="true">
          CẤU TẠO 03 LỚP
        </span>
        <span className="preview-stamp" aria-hidden="true">
          MD / LAB
        </span>
      </div>
      <p className="preview-status" role="status">
        {testing ? (
          <>
            <LoaderCircle className="spinner" size={16} aria-hidden="true" />{" "}
            Đang kiểm định phương án…
          </>
        ) : (
          "Mẫu minh họa · thay đổi theo lựa chọn của bạn"
        )}
      </p>
      <div className="preview-legend">
        {SLOT_ORDER.map((slot, index) => (
          <div key={slot}>
            <span className="legend-number">0{index + 1}</span>
            <span>
              <small>{SLOT_LABELS[slot]}</small>
              <strong>
                {selection[slot]
                  ? getMaterial(selection[slot]).shortLabel
                  : "Chưa chọn"}
              </strong>
            </span>
            <span
              className={`legend-chip texture-${materialTexture(selection[slot])}`}
              style={materialStyle(selection[slot])}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
      <p className="preview-disclaimer">
        Mô phỏng để tìm hiểu cấu tạo, không thay thế kiểm định vật liệu thực tế.
      </p>
    </aside>
  );
}

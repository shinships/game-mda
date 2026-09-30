"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, FlaskConical, Info } from "lucide-react";
import {
  MATERIALS_BY_SLOT,
  SLOT_LABELS,
  SLOT_ORDER,
  TAG_TONES,
} from "@/data/materials";
import {
  selectCanTest,
  selectCurrentSelection,
  useGameStore,
} from "@/store/useGameStore";
import type { SlotKey } from "@/types/game";
import { MaterialSwatch } from "./MaterialSwatch";

export function MaterialWorkbench() {
  const [activeSlot, setActiveSlot] = useState<SlotKey>("core");
  const selection = useGameStore(selectCurrentSelection);
  const canTest = useGameStore(selectCanTest);
  const select = useGameStore((s) => s.select);
  const runTest = useGameStore((s) => s.runTest);
  const phase = useGameStore((s) => s.phase);
  const locked = phase !== "BRIEF" && phase !== "SELECTING";
  const materials = MATERIALS_BY_SLOT[activeSlot];
  const activeIndex = SLOT_ORDER.indexOf(activeSlot);
  const count = SLOT_ORDER.filter((slot) => selection[slot]).length;
  function onArrow(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (
      ![
        "ArrowRight",
        "ArrowDown",
        "ArrowLeft",
        "ArrowUp",
        "Home",
        "End",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? materials.length - 1
          : (index +
              (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) +
              materials.length) %
            materials.length;
    select(activeSlot, materials[nextIndex].id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [nextIndex]?.focus();
  }
  return (
    <section className="workbench" aria-labelledby="workbench-title">
      <div className="workbench-heading">
        <div>
          <p className="eyebrow">BÀN PHỐI VẬT LIỆU</p>
          <h2 id="workbench-title">Bạn sẽ chọn gì?</h2>
        </div>
        <span className="selection-counter">{count}/3 lớp</span>
      </div>
      <div className="slot-tabs" aria-label="Các lớp vật liệu">
        {SLOT_ORDER.map((slot, i) => (
          <button
            type="button"
            key={slot}
            className={`slot-tab ${slot === activeSlot ? "active" : ""}`}
            aria-pressed={slot === activeSlot}
            onClick={() => setActiveSlot(slot)}
            disabled={locked}
          >
            <span className="slot-number">
              {selection[slot] ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                `0${i + 1}`
              )}
            </span>
            {SLOT_LABELS[slot]}
          </button>
        ))}
      </div>
      <p className="slot-hint">
        <Info size={15} aria-hidden="true" /> Đọc thông số và chọn một{" "}
        {SLOT_LABELS[activeSlot].toLocaleLowerCase("vi")} phù hợp.
      </p>
      <div
        className="material-options"
        role="radiogroup"
        aria-label={SLOT_LABELS[activeSlot]}
        aria-disabled={locked}
      >
        {materials.map((material, i) => {
          const chosen = selection[activeSlot] === material.id;
          const tone = TAG_TONES[material.tagTone];
          return (
            <button
              type="button"
              role="radio"
              key={material.id}
              aria-checked={chosen}
              aria-labelledby={`label-${material.id}`}
              aria-describedby={`desc-${material.id}`}
              tabIndex={chosen || (!selection[activeSlot] && i === 0) ? 0 : -1}
              disabled={locked}
              className={`material-card ${chosen ? "selected" : ""}`}
              onClick={() => select(activeSlot, material.id)}
              onKeyDown={(event) => onArrow(event, i)}
            >
              <MaterialSwatch id={material.id} />
              <span className="material-card-content">
                <span className="material-card-title">
                  <strong id={`label-${material.id}`}>{material.label}</strong>
                  {chosen ? (
                    <span className="chosen-badge">
                      <Check size={12} aria-hidden="true" /> Đã chọn
                    </span>
                  ) : (
                    <span className="radio-circle" aria-hidden="true" />
                  )}
                </span>
                <span
                  id={`desc-${material.id}`}
                  className="material-description"
                >
                  {material.description}
                </span>
                <span className="spec-tags">
                  {material.specTags.map((tag) => (
                    <span
                      key={tag.label}
                      style={{
                        background: tone.bg,
                        color: `color-mix(in srgb, ${tone.text} 80%, #000)`,
                      }}
                    >
                      {tag.kind === "caution" && (
                        <span aria-label="Lưu ý">! </span>
                      )}
                      {tag.label}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="workbench-actions">
        {activeIndex < SLOT_ORDER.length - 1 && (
          <button
            className="button button-secondary"
            disabled={!selection[activeSlot] || locked}
            onClick={() => setActiveSlot(SLOT_ORDER[activeIndex + 1])}
          >
            Chọn{" "}
            {SLOT_LABELS[SLOT_ORDER[activeIndex + 1]].toLocaleLowerCase("vi")}{" "}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        )}
        <button
          className="button button-primary"
          disabled={!canTest}
          onClick={runTest}
        >
          <FlaskConical size={18} aria-hidden="true" /> Kiểm định
        </button>
      </div>
      <p className="workbench-note" aria-live="polite">
        {locked
          ? "Đã khóa lựa chọn cho lần kiểm định này."
          : canTest
            ? "Đủ 3 lớp. Sẵn sàng kiểm định phương án của bạn."
            : "Chọn đủ cốt ván, bề mặt và nẹp cạnh để kiểm định."}
      </p>
    </section>
  );
}

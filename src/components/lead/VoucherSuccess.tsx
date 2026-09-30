"use client";

import { useRef, useState } from "react";
import { Check, Copy, MessageCircle, RotateCcw } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
export function VoucherSuccess() {
  const voucher = useGameStore((s) => s.voucher);
  const reset = useGameStore((s) => s.reset);
  const [copyMessage, setCopyMessage] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);
  if (!voucher) return null;
  async function copyCode() {
    if (!voucher) return;
    try {
      await navigator.clipboard.writeText(voucher.voucherCode);
      setCopyMessage("Đã sao chép mã voucher.");
    } catch {
      codeRef.current?.focus();
      codeRef.current?.select();
      setCopyMessage(
        "Hãy nhấn giữ hoặc dùng Ctrl/Cmd+C để sao chép mã đã chọn.",
      );
    }
  }
  return (
    <section
      className="completion-card success-card"
      aria-labelledby="success-title"
    >
      <span className="award-emblem success-emblem">
        <Check size={34} strokeWidth={1.4} aria-hidden="true" />
      </span>
      <p className="eyebrow">THÔNG TIN ĐÃ ĐƯỢC GHI NHẬN</p>
      <h1 id="success-title" data-phase-heading tabIndex={-1}>
        Món quà cho
        <br />
        <em>tổ ấm của bạn.</em>
      </h1>
      <p className="completion-description">
        Chúc mừng {voucher.rank.title}! Lưu mã voucher bên dưới và trao đổi với
        Minh Đức về dự án của bạn.
      </p>
      <div className="voucher-ticket">
        <span className="eyebrow">MD ARCHITECTS / VOUCHER NỘI THẤT</span>
        <strong className="voucher-amount">{voucher.voucherLabel}</strong>
        <div className="voucher-code-row">
          <label className="sr-only" htmlFor="voucher-code">
            Mã voucher
          </label>
          <input
            ref={codeRef}
            id="voucher-code"
            value={voucher.voucherCode}
            readOnly
          />
          <button
            className="icon-button"
            onClick={copyCode}
            aria-label="Sao chép mã voucher"
          >
            <Copy size={18} aria-hidden="true" />
          </button>
        </div>
        <span className="copy-message" role="status">
          {copyMessage || "Lưu mã này để trao đổi với đội ngũ tư vấn."}
        </span>
      </div>
      <p className="fine-print">
        Điều kiện áp dụng voucher sẽ được đội ngũ tư vấn xác nhận khi liên hệ.
      </p>
      {voucher.zaloUrl && (
        <a
          className="button button-primary"
          href={voucher.zaloUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} aria-hidden="true" /> Chat tư vấn vật liệu
          qua Zalo
        </a>
      )}
      <button className="button button-text" onClick={reset}>
        <RotateCcw size={16} aria-hidden="true" /> Trở về xưởng vật liệu
      </button>
    </section>
  );
}

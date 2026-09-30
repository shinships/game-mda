"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowRight, Gift, LoaderCircle, LockKeyhole } from "lucide-react";
import { leadFormSchema } from "@/lib/validation/lead";
import { selectRank, useGameStore } from "@/store/useGameStore";
import type { LeadFormValues } from "@/types/game";
export function LeadCaptureForm() {
  const phase = useGameStore((s) => s.phase);
  const submitError = useGameStore((s) => s.submitError);
  const submitLead = useGameStore((s) => s.submitLead);
  const rank = useGameStore(selectRank);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      project: "",
      consent: false,
      website: "",
    },
  });
  const busy = phase === "SUBMITTING" || isSubmitting;
  async function onSubmit(values: LeadFormValues) {
    const outcome = await submitLead(values);
    if (!outcome.ok && outcome.error === "VALIDATION" && outcome.fieldErrors) {
      const fields: (keyof LeadFormValues)[] = [
        "name",
        "phone",
        "project",
        "consent",
      ];
      fields.forEach((field) => {
        if (outcome.fieldErrors?.[field]?.[0])
          setError(
            field,
            { message: outcome.fieldErrors[field][0] },
            { shouldFocus: true },
          );
      });
    }
  }
  return (
    <section className="lead-layout" aria-labelledby="lead-title">
      <div className="lead-intro">
        <span className="award-emblem">
          <Gift size={34} strokeWidth={1.3} aria-hidden="true" />
        </span>
        <p className="eyebrow">MỘT MÓN QUÀ CHO TỔ ẤM</p>
        <h1 id="lead-title" data-phase-heading tabIndex={-1}>
          Hiểu vật liệu.
          <br />
          <em>Nhận ưu đãi.</em>
        </h1>
        <p>
          Để lại thông tin để nhận mã voucher và trao đổi về vật liệu phù hợp
          với dự án của bạn.
        </p>
        <div className="lead-voucher">
          <small>VOUCHER CỦA {rank.title.toLocaleUpperCase("vi")}</small>
          <strong>{rank.voucherLabel}</strong>
        </div>
        <p className="fine-print">
          Điều kiện áp dụng voucher sẽ được đội ngũ tư vấn xác nhận khi liên hệ.
        </p>
      </div>
      <form
        className="lead-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-busy={busy}
      >
        <h2>Thông tin nhận voucher</h2>
        <p className="form-note">Các trường có dấu * là bắt buộc.</p>
        {phase === "SUBMIT_ERROR" && submitError && (
          <div className="form-banner" role="alert">
            {submitError}
          </div>
        )}
        <fieldset disabled={busy}>
          <div className="form-field">
            <label htmlFor="lead-name">
              Họ và tên <span aria-hidden="true">*</span>
            </label>
            <input
              id="lead-name"
              autoComplete="name"
              placeholder="Tên của bạn"
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p id="name-error" className="field-error" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="lead-phone">
              Số điện thoại Zalo <span aria-hidden="true">*</span>
            </label>
            <input
              id="lead-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0912 345 678"
              aria-required="true"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
              {...register("phone")}
            />
            {errors.phone ? (
              <p id="phone-error" className="field-error" role="alert">
                {errors.phone.message}
              </p>
            ) : (
              <p id="phone-hint" className="input-hint">
                Để đội ngũ Minh Đức gửi voucher và liên hệ tư vấn.
              </p>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="lead-project">
              Dự án / Căn hộ <small>(tùy chọn)</small>
            </label>
            <input
              id="lead-project"
              placeholder="Ví dụ: căn hộ 2 phòng ngủ"
              aria-invalid={!!errors.project}
              aria-describedby={errors.project ? "project-error" : undefined}
              {...register("project")}
            />
            {errors.project && (
              <p id="project-error" className="field-error" role="alert">
                {errors.project.message}
              </p>
            )}
          </div>
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="lead-website">Website</label>
            <input
              id="lead-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register("website")}
            />
          </div>
          <label className="consent-field">
            <input
              type="checkbox"
              aria-required="true"
              aria-invalid={!!errors.consent}
              aria-describedby={errors.consent ? "consent-error" : undefined}
              {...register("consent")}
            />
            <span>
              Tôi đồng ý để MD Architects sử dụng thông tin trên để liên hệ gửi
              voucher và tư vấn nội thất. <span aria-hidden="true">*</span>
            </span>
          </label>
          {errors.consent && (
            <p id="consent-error" className="field-error" role="alert">
              {errors.consent.message}
            </p>
          )}
          <button
            className="button button-primary"
            type="submit"
            disabled={busy}
          >
            {busy ? (
              <>
                <LoaderCircle
                  className="spinner"
                  size={18}
                  aria-hidden="true"
                />{" "}
                Đang gửi thông tin…
              </>
            ) : (
              <>
                Nhận mã voucher <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </fieldset>
        <p className="form-privacy">
          <LockKeyhole size={14} aria-hidden="true" /> Thông tin được dùng cho
          yêu cầu nhận voucher và tư vấn của bạn.
        </p>
      </form>
    </section>
  );
}

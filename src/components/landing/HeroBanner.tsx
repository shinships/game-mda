"use client";

import { ArrowRight, Clock3, Layers3, MoveUpRight } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";

export function HeroBanner({ ready = true }: { ready?: boolean }) {
  const start = useGameStore((s) => s.start);
  return (
    <section className="hero page-width" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">
          <span className="small-line" /> XƯỞNG PHỐI VẬT LIỆU NỘI THẤT
        </p>
        <h1 id="hero-title" data-phase-heading tabIndex={-1}>
          Đẹp ở bề mặt.
          <br />
          Bền từ <em>bên trong.</em>
        </h1>
        <p className="hero-description">
          Một chiếc tủ đẹp chưa chắc đã bền. Thử làm kiến trúc sư, phối 3 lớp
          vật liệu và khám phá điều làm nên một tổ ấm vững bền.
        </p>
        <div className="hero-challenge">
          <Clock3 size={17} aria-hidden="true" />
          <span>Thử Thách 60s Bóc Mẽ Vật Liệu Nội Thất</span>
        </div>
        <button
          className="button button-primary hero-cta"
          onClick={start}
          disabled={!ready}
        >
          Bắt đầu bài test <ArrowRight size={19} aria-hidden="true" />
        </button>
        <p className="hero-note">
          3 không gian · 3 lớp vật liệu · Danh hiệu của riêng bạn
        </p>
        <div className="hero-gift">
          <span className="gift-line" />
          <span>
            Hiểu đúng vật liệu, nhận voucher
            <br />
            <strong>lên đến 5.000.000đ</strong>
          </span>
          <MoveUpRight size={20} aria-hidden="true" />
        </div>
      </div>
      <div
        className="hero-study"
        aria-label="Minh họa mặt cắt ba lớp vật liệu nội thất"
      >
        <div className="study-top">
          <span>MATERIAL STUDY / 01</span>
          <Layers3 size={20} aria-hidden="true" />
        </div>
        <svg
          className="study-drawing"
          viewBox="0 0 600 550"
          role="img"
          aria-labelledby="study-title"
        >
          <title id="study-title">
            Mẫu vật liệu tách lớp: bề mặt vân gỗ, cốt ván và nẹp bảo vệ cạnh
          </title>
          <defs>
            <pattern
              id="hero-grain"
              width="65"
              height="120"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-24)"
            >
              <rect width="65" height="120" fill="#bb9167" />
              <path
                d="M8 0Q30 50 12 120M22 0Q2 60 32 120M44 0Q64 65 47 120M59 0Q32 40 60 120"
                fill="none"
                stroke="#745237"
                strokeWidth="1.2"
                opacity=".4"
              />
              <path
                d="M15 0Q45 45 23 120M39 0Q18 80 39 120"
                fill="none"
                stroke="#ead1a8"
                opacity=".7"
              />
            </pattern>
            <pattern
              id="hero-core"
              width="12"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <rect width="12" height="10" fill="#8d9a7b" />
              <path
                d="M2 2l4 2m2 3l3-2M1 9l4-1"
                stroke="#586849"
                opacity=".35"
              />
            </pattern>
          </defs>
          <g stroke="#c9c4b9" strokeWidth="1" fill="none" opacity=".6">
            <path d="M60 385l244-143 246 143-244 144zM60 425l244-143 246 143M60 465l244-143 246 143M104 360v154m66-193v185m68-226v187m68-225v240m68-200v162m68-123v85" />
          </g>
          <ellipse
            cx="305"
            cy="435"
            rx="186"
            ry="37"
            fill="#534332"
            opacity=".09"
          />
          <g className="study-layer study-edge">
            <path d="M115 331l194-111 185 106-194 113z" fill="#b59b76" />
            <path d="M115 331v21l185 107v-20z" fill="#735941" />
            <path d="M300 439l194-113v21L300 459z" fill="#997b57" />
          </g>
          <g className="study-layer study-core">
            <path d="M115 259l194-111 185 106-194 113z" fill="#a6ae92" />
            <path d="M115 259v44l185 107v-43z" fill="url(#hero-core)" />
            <path d="M300 367l194-113v44L300 410z" fill="#6e7e5e" />
          </g>
          <g className="study-layer study-surface">
            <path
              d="M115 166l194-111 185 106-194 113z"
              fill="url(#hero-grain)"
            />
            <path d="M115 166v8l185 107v-7z" fill="#795739" />
            <path d="M300 274l194-113v8L300 282z" fill="#98734e" />
          </g>
          <g stroke="#786f62" strokeWidth="1" fill="none">
            <path d="M372 90l68-38h79M132 291l-55 31H24M394 388l63 36h87M86 153L281 40m-196 99v27m184-133l22 14" />
          </g>
          <g
            fill="#524c43"
            fontSize="11"
            fontFamily="sans-serif"
            letterSpacing="1"
          >
            <text x="448" y="43">
              01 / BỀ MẶT
            </text>
            <text x="24" y="344">
              02 / CỐT VÁN
            </text>
            <text x="441" y="448">
              03 / NẸP CẠNH
            </text>
            <text x="144" y="96" transform="rotate(-30 144 96)">
              CHI TIẾT TẠO NÊN ĐỘ BỀN
            </text>
          </g>
        </svg>
        <div className="study-bottom">
          <span>
            Một bề mặt.
            <br />
            <strong>Ba lớp quyết định.</strong>
          </span>
          <span className="study-seal">
            MD
            <br />
            <small>WORKSHOP</small>
          </span>
        </div>
        <span className="study-caption">
          Góc nhìn từ bên trong — nơi chất lượng bắt đầu.
        </span>
      </div>
    </section>
  );
}

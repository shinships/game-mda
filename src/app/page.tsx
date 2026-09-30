import { GameContainer } from "@/components/game/GameContainer";
import { TrustSection } from "@/components/landing/TrustSection";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <header className="site-header page-width">
        <Link className="brand" href="/" aria-label="MD Architects — Trang chủ">
          <span className="brand-mark" aria-hidden="true">
            md<span>.</span>
          </span>
          <span className="brand-name">
            MD ARCHITECTS<small>NỘI THẤT MINH ĐỨC</small>
          </span>
        </Link>
        <a className="header-link" href="#cach-choi">
          Khám phá vật liệu <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main id="noi-dung">
        <GameContainer />
        <TrustSection />
      </main>
      <footer className="site-footer page-width">
        <span>© MD Architects · Nội thất Minh Đức</span>
        <span>Hiểu vật liệu. Chọn đúng cho tổ ấm.</span>
      </footer>
    </>
  );
}

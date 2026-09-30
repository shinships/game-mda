import { BadgeCheck, Layers3, ScanLine, ArrowUpRight } from "lucide-react";

export function TrustSection() {
  return (
    <section
      id="cach-choi"
      className="trust-section page-width"
      aria-labelledby="trust-title"
    >
      <div className="trust-intro">
        <p className="eyebrow">CHỌN CÓ CƠ SỞ. SỐNG AN TÂM.</p>
        <h2 id="trust-title">
          Chất lượng không chỉ
          <br />
          nằm ở vẻ ngoài.
        </h2>
        <p>
          Tại MD Architects, mỗi lựa chọn vật liệu bắt đầu từ nhu cầu thực tế
          của không gian.
        </p>
      </div>
      <div className="trust-items">
        <article>
          <span className="trust-icon">
            <BadgeCheck aria-hidden="true" />
          </span>
          <span className="eyebrow">01 / NGUỒN GỐC</span>
          <h3>Vật liệu có nguồn gốc rõ ràng</h3>
          <p>
            Kiểm tra thương hiệu, chứng nhận và thông tin lô vật liệu trước khi
            đưa vào công trình.
          </p>
        </article>
        <article>
          <span className="trust-icon">
            <Layers3 aria-hidden="true" />
          </span>
          <span className="eyebrow">02 / CẤU TẠO</span>
          <h3>Đúng từ cốt đến nẹp</h3>
          <p>
            Phối cốt ván, bề mặt và nẹp cạnh theo độ ẩm, công năng và ngân sách
            của từng khu vực.
          </p>
        </article>
        <article>
          <span className="trust-icon">
            <ScanLine aria-hidden="true" />
          </span>
          <span className="eyebrow">03 / CHI TIẾT</span>
          <h3>Hiểu trước khi lựa chọn</h3>
          <p>
            Khám phá qua 3 bước: đọc đề bài, phối vật liệu và kiểm định để xem
            giải thích kỹ thuật.
          </p>
        </article>
      </div>
      <div className="trust-footnote">
        <span>MD ARCHITECTS</span>
        <span>
          Thiết kế từ thấu hiểu. Hoàn thiện bằng chi tiết.{" "}
          <ArrowUpRight size={16} aria-hidden="true" />
        </span>
      </div>
    </section>
  );
}

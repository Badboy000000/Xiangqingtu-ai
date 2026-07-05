import { Navbar } from "../components/Navbar";
import { HeroSection } from "../components/HeroSection";
import { FunctionSection } from "../components/FunctionSection";

export function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fef9f5",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', -apple-system, sans-serif",
      }}
    >
      {/* Peach / apricot — top left */}
      <div style={{ position: "fixed", top: "-200px", left: "-160px", width: "860px", height: "860px", background: "radial-gradient(circle, rgba(255,186,110,0.38) 0%, rgba(255,186,110,0.1) 45%, transparent 68%)", pointerEvents: "none", zIndex: 0 }} />
      {/* Rose / blush — bottom right */}
      <div style={{ position: "fixed", bottom: "-220px", right: "-180px", width: "800px", height: "800px", background: "radial-gradient(circle, rgba(255,150,190,0.3) 0%, rgba(255,150,190,0.08) 45%, transparent 68%)", pointerEvents: "none", zIndex: 0 }} />
      {/* Lavender — center right */}
      <div style={{ position: "fixed", top: "28%", right: "-100px", width: "640px", height: "640px", background: "radial-gradient(circle, rgba(190,160,255,0.24) 0%, rgba(190,160,255,0.06) 45%, transparent 68%)", pointerEvents: "none", zIndex: 0 }} />
      {/* Warm mint — bottom left */}
      <div style={{ position: "fixed", bottom: "60px", left: "15%", width: "480px", height: "480px", background: "radial-gradient(circle, rgba(160,230,200,0.18) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
      {/* Dot grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `radial-gradient(circle, rgba(200,140,80,0.12) 1px, transparent 1px)`, backgroundSize: "28px 28px", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />
        <HeroSection />
        <FunctionSection />
      </div>

      {/* 自定义滚动条样式 - 隐藏滚动条但保留滚动功能 */}
      <style>{`
        .detail-scroll-container::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
        .detail-scroll-container {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE/Edge */
        }
      `}</style>
    </div>
  );
}

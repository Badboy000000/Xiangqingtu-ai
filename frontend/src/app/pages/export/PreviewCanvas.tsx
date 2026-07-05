import { useState } from "react";
import { useNavigate } from "react-router";
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, CheckCircle2, AlertCircle, Layers } from "lucide-react";
import { zh, en } from "../../constants/theme";

interface Screen {
  label: string;
  url: string;
}

interface PreviewCanvasProps {
  screens: Screen[];
  confirmed: boolean[];
  onToggleConfirm: (i: number) => void;
}

export function PreviewCanvas({ screens, confirmed, onToggleConfirm }: PreviewCanvasProps) {
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(0.85);
  const [hoveredScreen, setHoveredScreen] = useState<number | null>(null);

  const previewBaseWidth = 360;

  return (
    <div style={{ flex: "1 1 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Zoom toolbar */}
      <div style={{ height: "44px", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", padding: "0 20px", gap: "8px", flexShrink: 0 }}>
        <span style={{ fontSize: "11px", color: "rgba(30,20,32,0.45)", fontFamily: en, marginRight: "4px" }}>预览缩放</span>
        <button onClick={() => setZoom(z => Math.max(0.3, +(z - 0.15).toFixed(2)))} style={{ width: "26px", height: "26px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.1)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ZoomOut size={13} color="#666" />
        </button>
        <div style={{ width: "52px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "#1e1420", fontFamily: en, background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "6px", padding: "3px 0" }}>
          {Math.round(zoom * 100)}%
        </div>
        <button onClick={() => setZoom(z => Math.min(2, +(z + 0.15).toFixed(2)))} style={{ width: "26px", height: "26px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.1)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ZoomIn size={13} color="#666" />
        </button>
        <button onClick={() => setZoom(0.85)} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: "11px", color: "#666", cursor: "pointer", fontFamily: en }}>
          <Maximize2 size={11} /> 适应屏幕
        </button>

        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "rgba(30,20,32,0.4)", fontFamily: en }}>
          <Layers size={12} />
          {screens.length} 屏 · 拼接长图
        </div>
      </div>

      {/* Scrollable canvas */}
      <div style={{ flex: 1, overflow: "auto", background: "#2d2d2d", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "20px 20px", pointerEvents: "none" }} />

        <div style={{ display: "flex", justifyContent: "center", padding: "40px 40px 60px", minHeight: "100%" }}>
          <div
            style={{
              width: previewBaseWidth * zoom,
              background: "#fff",
              boxShadow: "0 12px 60px rgba(0,0,0,0.5)",
              borderRadius: "4px",
              overflow: "hidden",
              flexShrink: 0,
              transition: "width 0.2s ease",
            }}
          >
            {screens.map((screen, i) => (
              <div
                key={i}
                style={{ position: "relative" }}
                onMouseEnter={() => setHoveredScreen(i)}
                onMouseLeave={() => setHoveredScreen(null)}
              >
                <div style={{ position: "absolute", top: "8px", left: "8px", zIndex: 2, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", borderRadius: "5px", padding: "3px 8px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.9)", fontFamily: en, fontWeight: 600 }}>{i + 1}</span>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.65)", fontFamily: zh }}>{screen.label}</span>
                </div>

                <div style={{ position: "absolute", top: "8px", right: "8px", zIndex: 2 }}>
                  {confirmed[i]
                    ? <CheckCircle2 size={18} color="#22c55e" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }} />
                    : <AlertCircle size={18} color="#f97316" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }} />
                  }
                </div>

                <img src={screen.url} alt={screen.label} style={{ width: "100%", display: "block", aspectRatio: "4/3", objectFit: "cover" }} />

                {hoveredScreen === i && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.38)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <button onClick={() => navigate("/canvas")} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.92)", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#1e1420", fontFamily: zh }}>
                      <RefreshCw size={13} /> 调整此屏
                    </button>
                    <button onClick={() => onToggleConfirm(i)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 16px", borderRadius: "8px", background: confirmed[i] ? "rgba(249,115,22,0.9)" : "rgba(34,197,94,0.9)", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: zh }}>
                      <CheckCircle2 size={13} />
                      {confirmed[i] ? "取消确认" : "确认此屏"}
                    </button>
                  </div>
                )}

                {i < screens.length - 1 && <div style={{ height: "1px", background: "rgba(0,0,0,0.1)" }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

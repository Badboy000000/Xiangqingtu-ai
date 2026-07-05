import { useState } from "react";
import { useNavigate } from "react-router";
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, CheckCircle2, AlertCircle, Smartphone, Monitor, Signal, Wifi, Battery, Lock } from "lucide-react";
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

type DeviceType = "mobile" | "pc";

export function PreviewCanvas({ screens, confirmed, onToggleConfirm }: PreviewCanvasProps) {
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(1);
  const [hoveredScreen, setHoveredScreen] = useState<number | null>(null);
  const [device, setDevice] = useState<DeviceType>("mobile");

  // Mobile: 375px (standard iPhone viewport), PC: 790px (desktop detail page)
  const baseWidth = device === "mobile" ? 375 : 790;
  const previewWidth = baseWidth * zoom;

  return (
    <div style={{ flex: "1 1 0", display: "flex", flexDirection: "column", overflow: "hidden", background: "#edeae4" }}>

      {/* Toolbar */}
      <div style={{
        height: "52px",
        background: "#fff",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        display: "flex", alignItems: "center",
        padding: "0 16px", gap: "12px",
        flexShrink: 0,
      }}>

        {/* Device toggle */}
        <div style={{
          display: "flex",
          background: "#f5f2ec",
          borderRadius: "9px",
          padding: "3px",
          border: "1px solid rgba(0,0,0,0.06)",
        }}>
          {([
            { key: "mobile" as DeviceType, icon: Smartphone, label: "手机端" },
            { key: "pc" as DeviceType, icon: Monitor, label: "电脑端" },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setDevice(key)}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "5px 13px", borderRadius: "7px",
                border: "none", cursor: "pointer",
                fontSize: "12px", fontWeight: device === key ? 600 : 400,
                background: device === key ? "#fff" : "transparent",
                color: device === key ? "#1e1420" : "rgba(30,20,32,0.42)",
                fontFamily: zh,
                boxShadow: device === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <div style={{ width: "1px", height: "20px", background: "rgba(0,0,0,0.08)" }} />

        {/* Zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => setZoom(z => Math.max(0.25, +(z - 0.15).toFixed(2)))}
            style={{ width: "26px", height: "26px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.1)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <ZoomOut size={12} color="#888" />
          </button>
          <div style={{
            width: "44px", textAlign: "center",
            fontSize: "11.5px", fontWeight: 600, color: "#1e1420",
            fontFamily: en,
          }}>
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom(z => Math.min(2, +(z + 0.15).toFixed(2)))}
            style={{ width: "26px", height: "26px", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.1)", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <ZoomIn size={12} color="#888" />
          </button>
          <button
            onClick={() => setZoom(1)}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "4px 10px", borderRadius: "6px",
              border: "1px solid rgba(0,0,0,0.1)", background: "#fff",
              fontSize: "11px", color: "#888", cursor: "pointer", fontFamily: zh,
            }}
          >
            <Maximize2 size={10} /> 重置
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "rgba(30,20,32,0.38)", fontFamily: zh }}>
            {device === "mobile" ? "375px" : "790px"} 宽 · {screens.length} 屏
          </span>
        </div>
      </div>

      {/* Scrollable preview area */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: "32px 32px 60px" }}>
        <div style={{ flexShrink: 0, transition: "width 0.25s ease", width: previewWidth }}>

          {device === "mobile" ? (
            /* ─── Mobile phone frame ─────────────────────────── */
            <div style={{
              background: "#1a1a1e",
              borderRadius: "36px",
              padding: "10px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.14)",
            }}>
              <div style={{
                background: "#000",
                borderRadius: "28px",
                overflow: "hidden",
                position: "relative",
              }}>
                {/* Dynamic island */}
                <div style={{
                  position: "sticky", top: 0, zIndex: 10,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  background: "#000",
                  paddingBottom: "2px",
                }}>
                  <div style={{
                    width: "120px", height: "28px",
                    background: "#000", borderRadius: "0 0 18px 18px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginTop: "0px",
                  }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#111", border: "1.5px solid #222" }} />
                  </div>
                  {/* iOS status bar */}
                  <div style={{
                    width: "100%", display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "0 28px 6px",
                    fontSize: "13px", fontWeight: 700, color: "#fff", fontFamily: en,
                  }}>
                    <span>9:41</span>
                    <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                      <Signal size={12} color="#fff" />
                      <Wifi size={12} color="#fff" />
                      <Battery size={15} color="#fff" />
                    </div>
                  </div>
                </div>

                {/* Screen images */}
                <div style={{ background: "#f5f3ef" }}>
                  {screens.map((screen, i) => (
                    <div
                      key={i}
                      style={{ position: "relative" }}
                      onMouseEnter={() => setHoveredScreen(i)}
                      onMouseLeave={() => setHoveredScreen(null)}
                    >
                      {/* Screen label overlay */}
                      <div style={{
                        position: "absolute", top: "8px", left: "8px", zIndex: 3,
                        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
                        borderRadius: "6px", padding: "3px 9px",
                        display: "flex", alignItems: "center", gap: "5px",
                      }}>
                        <span style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.85)", fontFamily: en, fontWeight: 700 }}>{i + 1}</span>
                        <span style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.6)", fontFamily: zh }}>{screen.label}</span>
                      </div>

                      {/* Confirm status */}
                      <div style={{ position: "absolute", top: "8px", right: "8px", zIndex: 3 }}>
                        {confirmed[i]
                          ? <CheckCircle2 size={16} color="#22c55e" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }} />
                          : <AlertCircle size={16} color="#f97316" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }} />
                        }
                      </div>

                      <img src={screen.url} alt={screen.label} style={{ width: "100%", display: "block" }} />

                      {/* Hover overlay */}
                      {hoveredScreen === i && (
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "rgba(0,0,0,0.4)",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        }}>
                          <button
                            onClick={() => navigate("/canvas")}
                            style={{
                              display: "flex", alignItems: "center", gap: "4px",
                              padding: "7px 14px", borderRadius: "8px",
                              background: "rgba(255,255,255,0.95)", border: "none",
                              fontSize: "11.5px", fontWeight: 600, cursor: "pointer", color: "#1e1420", fontFamily: zh,
                            }}
                          >
                            <RefreshCw size={12} /> 调整
                          </button>
                          <button
                            onClick={() => onToggleConfirm(i)}
                            style={{
                              display: "flex", alignItems: "center", gap: "4px",
                              padding: "7px 14px", borderRadius: "8px",
                              background: confirmed[i] ? "rgba(249,115,22,0.92)" : "rgba(34,197,94,0.92)",
                              border: "none", fontSize: "11.5px", fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: zh,
                            }}
                          >
                            <CheckCircle2 size={12} />
                            {confirmed[i] ? "取消" : "确认"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* iOS home indicator */}
                <div style={{ background: "#f5f3ef", paddingBottom: "8px", display: "flex", justifyContent: "center" }}>
                  <div style={{ width: "134px", height: "5px", background: "rgba(0,0,0,0.18)", borderRadius: "3px" }} />
                </div>
              </div>
            </div>
          ) : (
            /* ─── PC browser frame ─────────────────────────── */
            <div style={{
              background: "#fff",
              borderRadius: "10px",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 14px rgba(0,0,0,0.1)",
              border: "1px solid rgba(0,0,0,0.09)",
            }}>
              {/* Browser chrome */}
              <div style={{
                height: "42px",
                background: "linear-gradient(180deg, #f8f8fa 0%, #f0f0f2 100%)",
                borderBottom: "1px solid #d8d8dc",
                display: "flex", alignItems: "center",
                padding: "0 14px", gap: "8px",
              }}>
                {/* Traffic lights */}
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f57", border: "0.5px solid rgba(0,0,0,0.06)" }} />
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#febc2e", border: "0.5px solid rgba(0,0,0,0.06)" }} />
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#28c840", border: "0.5px solid rgba(0,0,0,0.06)" }} />
                </div>
                {/* URL bar */}
                <div style={{
                  flex: 1, height: "26px",
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "6px",
                  display: "flex", alignItems: "center",
                  padding: "0 10px", gap: "5px",
                  margin: "0 40px 0 8px",
                }}>
                  <Lock size={10} color="#aaa" />
                  <span style={{ fontSize: "11px", color: "#999", fontFamily: en, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    detail.tmall.com/item.htm?id=product
                  </span>
                </div>
              </div>

              {/* Page content */}
              <div style={{ background: "#f5f3ef" }}>
                {screens.map((screen, i) => (
                  <div
                    key={i}
                    style={{ position: "relative" }}
                    onMouseEnter={() => setHoveredScreen(i)}
                    onMouseLeave={() => setHoveredScreen(null)}
                  >
                    {/* Screen label overlay */}
                    <div style={{
                      position: "absolute", top: "10px", left: "10px", zIndex: 3,
                      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
                      borderRadius: "6px", padding: "3px 10px",
                      display: "flex", alignItems: "center", gap: "6px",
                    }}>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.85)", fontFamily: en, fontWeight: 700 }}>{i + 1}</span>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontFamily: zh }}>{screen.label}</span>
                    </div>

                    {/* Confirm status */}
                    <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 3 }}>
                      {confirmed[i]
                        ? <CheckCircle2 size={18} color="#22c55e" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }} />
                        : <AlertCircle size={18} color="#f97316" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }} />
                      }
                    </div>

                    <img src={screen.url} alt={screen.label} style={{ width: "100%", display: "block" }} />

                    {/* Hover overlay */}
                    {hoveredScreen === i && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "rgba(0,0,0,0.35)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                      }}>
                        <button
                          onClick={() => navigate("/canvas")}
                          style={{
                            display: "flex", alignItems: "center", gap: "5px",
                            padding: "8px 18px", borderRadius: "8px",
                            background: "rgba(255,255,255,0.95)", border: "none",
                            fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#1e1420", fontFamily: zh,
                          }}
                        >
                          <RefreshCw size={13} /> 调整此屏
                        </button>
                        <button
                          onClick={() => onToggleConfirm(i)}
                          style={{
                            display: "flex", alignItems: "center", gap: "5px",
                            padding: "8px 18px", borderRadius: "8px",
                            background: confirmed[i] ? "rgba(249,115,22,0.92)" : "rgba(34,197,94,0.92)",
                            border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: zh,
                          }}
                        >
                          <CheckCircle2 size={13} />
                          {confirmed[i] ? "取消确认" : "确认此屏"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

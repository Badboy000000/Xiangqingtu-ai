import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Download, RefreshCw, CheckCircle2, AlertCircle, FileImage } from "lucide-react";
import { zh, en } from "../../constants/theme";
import { ScrollFade } from "../../components/ScrollFade";
import { useProject } from "../../../context/ProjectContext";

type Format = "JPG" | "PNG" | "WebP";
type Quality = "standard" | "hd" | "print";
type SizeKey = "750" | "1080" | "1200" | "custom";

const QUALITY_OPTIONS = [
  { key: "standard" as Quality, label: "标准", sub: "适合网络传播", dpi: "72 dpi" },
  { key: "hd" as Quality, label: "高清", sub: "电商详情页推荐", dpi: "150 dpi" },
  { key: "print" as Quality, label: "印刷级", sub: "线下物料输出", dpi: "300 dpi" },
];

const SIZE_OPTIONS = [
  { key: "750" as SizeKey, label: "750 px", sub: "淘宝 / 京东移动端" },
  { key: "1080" as SizeKey, label: "1080 px", sub: "通用宽度" },
  { key: "1200" as SizeKey, label: "1200 px", sub: "PC 端详情页" },
  { key: "custom" as SizeKey, label: "自定义", sub: "手动输入像素宽度" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "11px", fontWeight: 700, color: "rgba(30,20,32,0.38)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px", fontFamily: en }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "20px 0" }} />;
}

interface Screen {
  label: string;
  url: string;
  screenIndex?: number;
  status?: string;
}

interface ExportConfigPanelProps {
  screens: Screen[];
  confirmed: boolean[];
}

export function ExportConfigPanel({ screens, confirmed }: ExportConfigPanelProps) {
  const navigate = useNavigate();
  const { state, runExport, runApproveScreen } = useProject();
  const [format, setFormat] = useState<Format>("JPG");
  const [quality, setQuality] = useState<Quality>("hd");
  const [sizeKey, setSizeKey] = useState<SizeKey>("750");
  const [customWidth, setCustomWidth] = useState("");
  const [done, setDone] = useState(false);

  const allConfirmed = confirmed.every(Boolean);
  const exporting = state.exportLoading;

  const handleExport = async () => {
    const width = sizeKey === 'custom' ? parseInt(customWidth) || 750 : parseInt(sizeKey);

    // 先确保所有有图片的屏都已 approved（双重保险）
    const screensToApprove = state.screens
      .map((s, i) => ({ ...s, arrIndex: i }))
      .filter(s => s.imageUrl && s.status !== 'approved');

    for (const s of screensToApprove) {
      try {
        await runApproveScreen(s.arrIndex);
      } catch { /* 忽略单个 approve 失败 */ }
    }

    try {
      await runExport(format, quality, width);
    } catch {
      // error handled in context
    }
  };

  // 导出结果变化时自动触发下载
  useEffect(() => {
    if (state.exportResult?.outputUrl) {
      setDone(true);
      const a = document.createElement('a');
      a.href = state.exportResult.outputUrl;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [state.exportResult?.outputUrl]);


  return (
    <div style={{ width: "360px", flexShrink: 0, background: "#fff", borderLeft: "1px solid rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ScrollFade style={{ flex: 1, minHeight: 0 }}>
        <div data-scroll-target className="scroll-reveal" style={{ overflowY: "auto", height: "100%", padding: "24px 20px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "22px" }}>
          <FileImage size={18} color="#f97316" />
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#1e1420", fontFamily: zh }}>导出设置</span>
        </div>

        {/* Format */}
        <SectionTitle>导出格式</SectionTitle>
        <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
          {(["JPG", "PNG", "WebP"] as Format[]).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              style={{
                flex: 1, padding: "8px 0", borderRadius: "8px",
                background: format === f ? "linear-gradient(135deg, #f97316, #fbbf24)" : "#f5f2ec",
                border: "none", color: format === f ? "#fff" : "rgba(30,20,32,0.55)",
                fontSize: "13px", fontWeight: format === f ? 700 : 400,
                cursor: "pointer", fontFamily: en,
                boxShadow: format === f ? "0 2px 8px rgba(249,115,22,0.25)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: "rgba(30,20,32,0.35)", fontFamily: zh, margin: 0, lineHeight: 1.5 }}>
          {format === "JPG" && "文件体积小，适合网络分享和电商上传"}
          {format === "PNG" && "无损压缩，保留透明背景，文件较大"}
          {format === "WebP" && "最优压缩比，现代浏览器与平台广泛支持"}
        </p>

        <Divider />

        {/* Quality */}
        <SectionTitle>画质等级</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {QUALITY_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setQuality(opt.key)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: "10px", cursor: "pointer",
                background: quality === opt.key ? "rgba(249,115,22,0.06)" : "#f5f2ec",
                border: `1.5px solid ${quality === opt.key ? "rgba(249,115,22,0.4)" : "transparent"}`,
                textAlign: "left" as const, transition: "all 0.15s ease",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: quality === opt.key ? 700 : 500, color: quality === opt.key ? "#f97316" : "#1e1420", fontFamily: zh }}>{opt.label}</div>
                <div style={{ fontSize: "11px", color: "rgba(30,20,32,0.38)", fontFamily: zh, marginTop: "2px" }}>{opt.sub}</div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, color: quality === opt.key ? "#f97316" : "rgba(30,20,32,0.3)", fontFamily: en, background: quality === opt.key ? "rgba(249,115,22,0.1)" : "rgba(0,0,0,0.05)", padding: "3px 8px", borderRadius: "5px" }}>
                {opt.dpi}
              </span>
            </button>
          ))}
        </div>

        <Divider />

        {/* Size */}
        <SectionTitle>尺寸规格（宽度）</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {SIZE_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSizeKey(opt.key)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 14px", borderRadius: "9px", cursor: "pointer",
                background: sizeKey === opt.key ? "rgba(249,115,22,0.06)" : "transparent",
                border: `1.5px solid ${sizeKey === opt.key ? "rgba(249,115,22,0.35)" : "rgba(0,0,0,0.07)"}`,
                textAlign: "left" as const, transition: "all 0.15s ease",
              }}
            >
              <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: `2px solid ${sizeKey === opt.key ? "#f97316" : "rgba(0,0,0,0.2)"}`, background: sizeKey === opt.key ? "#f97316" : "transparent", flexShrink: 0, transition: "all 0.15s ease" }} />
              <div>
                <span style={{ fontSize: "13px", fontWeight: 600, color: sizeKey === opt.key ? "#f97316" : "#1e1420", fontFamily: en }}>{opt.label}</span>
                <span style={{ fontSize: "11px", color: "rgba(30,20,32,0.38)", fontFamily: zh, marginLeft: "6px" }}>{opt.sub}</span>
              </div>
            </button>
          ))}
          {sizeKey === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 4px", marginTop: "4px" }}>
              <input
                type="number"
                placeholder="输入像素宽度"
                value={customWidth}
                onChange={e => setCustomWidth(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1.5px solid rgba(249,115,22,0.3)", fontSize: "13px", color: "#1e1420", fontFamily: en, outline: "none", background: "rgba(249,115,22,0.03)" }}
              />
              <span style={{ fontSize: "12px", color: "rgba(30,20,32,0.4)", fontFamily: en }}>px</span>
            </div>
          )}
        </div>

        <Divider />

        {/* Screen checklist */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <SectionTitle>分屏确认清单</SectionTitle>
          <span style={{ fontSize: "10.5px", color: confirmed.filter(Boolean).length === screens.length ? "#22c55e" : "#f97316", fontFamily: en, fontWeight: 600, marginBottom: "10px" }}>
            {confirmed.filter(Boolean).length} / {screens.length} 已确认
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {screens.map((screen, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "9px", background: confirmed[i] ? "rgba(34,197,94,0.04)" : "rgba(249,115,22,0.04)", border: `1px solid ${confirmed[i] ? "rgba(34,197,94,0.15)" : "rgba(249,115,22,0.18)"}` }}
            >
              <img src={screen.url} alt={screen.label} style={{ width: "42px", height: "34px", objectFit: "cover", borderRadius: "5px", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#1e1420", fontFamily: zh, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>第 {i + 1} 屏 · {screen.label}</div>
                <div style={{ fontSize: "10px", color: confirmed[i] ? "#22c55e" : "#f97316", fontFamily: zh, marginTop: "2px" }}>
                  {confirmed[i] ? "✓ 已确认" : "⚠ 待确认"}
                </div>
              </div>
              <button onClick={() => navigate("/canvas")} style={{ padding: "4px 9px", borderRadius: "5px", background: "transparent", border: "1px solid rgba(0,0,0,0.1)", color: "rgba(30,20,32,0.45)", fontSize: "10.5px", cursor: "pointer", fontFamily: zh, flexShrink: 0 }}>
                调整
              </button>
            </div>
          ))}
        </div>
        </div>
      </ScrollFade>
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fff", flexShrink: 0 }}>
        {!allConfirmed && (
          <div style={{ fontSize: "11px", color: "#f97316", fontFamily: zh, marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
            <AlertCircle size={12} />
            有分屏尚未确认，建议全部确认后再导出
          </div>
        )}
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            width: "100%", padding: "13px 0", borderRadius: "10px",
            background: done ? "linear-gradient(135deg, #22c55e, #16a34a)" : "linear-gradient(135deg, #f97316, #ec4899)",
            border: "none", color: "#fff",
            fontSize: "15px", fontWeight: 700, cursor: exporting ? "not-allowed" : "pointer",
            fontFamily: zh, letterSpacing: "0.04em",
            boxShadow: done ? "0 4px 16px rgba(34,197,94,0.3)" : "0 4px 20px rgba(249,115,22,0.3)",
            opacity: exporting ? 0.8 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "all 0.3s ease",
          }}
        >
          {exporting ? (
            <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> 导出中…</>
          ) : done ? (
            <><CheckCircle2 size={15} /> 导出成功！</>
          ) : (
            <><Download size={15} /> 立即导出长图</>
          )}
        </button>
        <button onClick={() => navigate("/canvas")} style={{ width: "100%", marginTop: "10px", padding: "8px 0", borderRadius: "8px", background: "transparent", border: "none", color: "rgba(30,20,32,0.38)", fontSize: "12px", cursor: "pointer", fontFamily: zh }}>
          返回工作台继续调整
        </button>
      </div>
    </div>
  );
}

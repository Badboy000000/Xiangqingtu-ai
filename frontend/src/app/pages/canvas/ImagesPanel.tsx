import { forwardRef, useState, useCallback } from "react";
import { Download, ZoomIn, Loader2, Sparkles, Images, X } from "lucide-react";
import { zh, cardStyle } from "../../constants/theme";
import { useProject } from "../../../context/ProjectContext";

interface ImageCardProps {
  screen: { label: string; imageUrl: string; status: string };
  index: number;
  onPreview: (imageUrl: string, label: string) => void;
}

export const ImageCard = forwardRef<HTMLDivElement, ImageCardProps>(({ screen, index, onPreview }, ref) => {
  const { state } = useProject();
  const isGenerating = state.node4Loading.includes(index);
  const hasImage = !!screen.imageUrl;

  return (
    <div ref={ref} style={{ ...cardStyle, width: "300px", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      {/* Card header */}
      <div style={{ padding: "9px 14px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <div style={{
            width: "7px", height: "7px", borderRadius: "50%",
            background: isGenerating ? "#f97316" : hasImage ? "#22c55e" : "rgba(0,0,0,0.15)",
            boxShadow: isGenerating ? "0 0 5px rgba(249,115,22,0.5)" : hasImage ? "0 0 5px rgba(34,197,94,0.5)" : "none",
          }} />
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#1e1420", fontFamily: zh }}>
            第 {index + 1} 屏 · {screen.label}
          </span>
        </div>
        <span style={{
          fontSize: "9.5px", fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif",
          color: isGenerating ? "#f97316" : hasImage ? "#22c55e" : "rgba(30,20,32,0.3)",
          background: isGenerating ? "rgba(249,115,22,0.08)" : hasImage ? "rgba(34,197,94,0.08)" : "rgba(0,0,0,0.03)",
          padding: "2px 7px", borderRadius: "4px",
        }}>
          {isGenerating ? "生成中..." : hasImage ? "✓ 已生成" : "待生成"}
        </span>
      </div>

      {/* Image / placeholder */}
      <div style={{ position: "relative", overflow: "hidden", height: "180px", background: isGenerating ? "rgba(249,115,22,0.04)" : "#f9f7f4" }}>
        {isGenerating ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <Loader2 size={28} color="#f97316" style={{ animation: "spin 1s linear infinite", marginBottom: "8px" }} />
            <span style={{ fontSize: "11px", color: "#f97316", fontFamily: zh }}>AI 绘图进行中...</span>
          </div>
        ) : hasImage ? (
          <>
            <img src={screen.imageUrl} alt={screen.label} style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }} />
            <div
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.0)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: 0, transition: "all 0.2s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.3)"; (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0)"; (e.currentTarget as HTMLDivElement).style.opacity = "0"; }}
            >
              <button
                onClick={() => onPreview(screen.imageUrl, screen.label)}
                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 12px", borderRadius: "7px", background: "rgba(255,255,255,0.9)", border: "none", fontSize: "11px", fontWeight: 600, cursor: "pointer", color: "#1e1420", fontFamily: zh }}>
                <ZoomIn size={12} /> 查看
              </button>
              <a href={screen.imageUrl} download style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 12px", borderRadius: "7px", background: "rgba(249,115,22,0.9)", border: "none", fontSize: "11px", fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: zh, textDecoration: "none" }}>
                <Download size={12} /> 下载
              </a>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <span style={{ fontSize: "11px", color: "rgba(30,20,32,0.25)", fontFamily: zh }}>等待生成</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "10px", color: "rgba(30,20,32,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
          {hasImage ? "1600×2848" : "—"}
        </span>
      </div>
    </div>
  );
});
ImageCard.displayName = "ImageCard";

interface ImagesPanelProps {
  imageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export function ImagesPanel({ imageRefs }: ImagesPanelProps) {
  const { state, runGenerateScreen } = useProject();
  const screens = state.screens;
  const generatedCount = screens.filter(s => !!s.imageUrl).length;
  const workflowStep = state.workflowStep;
  const isWorkflowComplete = workflowStep === 'complete';
  const hasPrompts = screens.length > 0 && screens.every(s => !!s.prompt);
  const isAnyGenerating = state.node4Loading.length > 0;

  // 图片放大预览
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);
  const handlePreview = useCallback((imageUrl: string, label: string) => {
    setPreviewImage({ url: imageUrl, label });
  }, []);
  const closePreview = useCallback(() => setPreviewImage(null), []);

  const handleBatchGenerate = async () => {
    for (let i = 0; i < screens.length; i++) {
      if (screens[i].prompt && !screens[i].imageUrl) {
        await runGenerateScreen(i);
      }
    }
  };

  return (
    <div style={{ alignSelf: "flex-start" }}>
      {/* Column label */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <div style={{ width: "3px", height: "16px", background: "linear-gradient(180deg, #22c55e, #16a34a)", borderRadius: "2px" }} />
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e1420", fontFamily: zh }}>最终生成图</span>
        {screens.length > 0 && (
          <span style={{ fontSize: "11px", color: "#22c55e", fontFamily: zh, background: "rgba(34,197,94,0.08)", padding: "2px 8px", borderRadius: "4px" }}>
            {generatedCount} / {screens.length} 完成
          </span>
        )}
      </div>

      {/* 批量生成按钮 */}
      {hasPrompts && generatedCount < screens.length && !isAnyGenerating && (
        <div style={{ ...cardStyle, padding: "16px", marginBottom: "16px", textAlign: "center" as const }}>
          <button
            onClick={handleBatchGenerate}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "8px",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              border: "none", color: "#fff", fontSize: "12.5px", fontWeight: 600,
              cursor: "pointer", fontFamily: zh,
              boxShadow: "0 2px 10px rgba(34,197,94,0.25)",
            }}
          >
            <Sparkles size={13} /> 批量生成所有屏
          </button>
          <div style={{ fontSize: "10.5px", color: "rgba(30,20,32,0.35)", fontFamily: zh, marginTop: "6px" }}>
            {screens.length - generatedCount} 屏待生成
          </div>
        </div>
      )}

      {/* 批量生成进行中 */}
      {isAnyGenerating && (
        <div style={{ ...cardStyle, padding: "14px 16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Loader2 size={14} color="#22c55e" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "12px", color: "#22c55e", fontFamily: zh, fontWeight: 600 }}>
              正在生成图片... {state.node4Loading.length} 屏进行中
            </span>
          </div>
          {/* 进度条 */}
          <div style={{ height: "4px", background: "rgba(34,197,94,0.1)", borderRadius: "2px", overflow: "hidden", marginTop: "8px" }}>
            <div style={{
              height: "100%", borderRadius: "2px",
              background: "linear-gradient(90deg, #22c55e, #16a34a)",
              width: `${(generatedCount / Math.max(screens.length, 1)) * 100}%`,
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      )}

      {screens.length === 0 && (
        <div style={{ ...cardStyle, padding: "30px 20px", textAlign: "center" as const }}>
          <Images size={24} style={{ color: "rgba(30,20,32,0.12)", margin: "0 auto 10px" }} />
          <div style={{ fontSize: "12px", color: "rgba(30,20,32,0.3)", fontFamily: zh }}>
            请先生成提示词，然后点击「生成图片」
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {screens.map((screen, i) => (
          <ImageCard
            key={i}
            screen={screen}
            index={i}
            onPreview={handlePreview}
            ref={el => { imageRefs.current[i] = el; }}
          />
        ))}
      </div>

      {/* 图片放大预览 Modal */}
      {previewImage && (
        <div
          onClick={closePreview}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          {/* 关闭按钮 */}
          <button
            onClick={closePreview}
            style={{
              position: "absolute", top: "16px", right: "16px", zIndex: 10000,
              width: "36px", height: "36px", borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff",
              transition: "background 0.2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.3)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)"; }}
          >
            <X size={18} />
          </button>

          {/* 图片标签 */}
          <div style={{
            position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.12)", backdropFilter: "blur(6px)",
            borderRadius: "8px", padding: "6px 16px",
            fontSize: "12px", color: "rgba(255,255,255,0.9)", fontFamily: zh, fontWeight: 600,
          }}>
            {previewImage.label}
          </div>

          {/* 大图 */}
          <img
            src={previewImage.url}
            alt={previewImage.label}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "90vw", maxHeight: "90vh",
              objectFit: "contain", borderRadius: "4px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
              cursor: "default",
            }}
          />

          {/* 底部下载按钮 */}
          <a
            href={previewImage.url}
            download
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)",
              display: "flex", alignItems: "center", gap: "6px",
              padding: "10px 24px", borderRadius: "8px",
              background: "rgba(249,115,22,0.9)", border: "none",
              fontSize: "12px", fontWeight: 600, color: "#fff",
              fontFamily: zh, textDecoration: "none", cursor: "pointer",
            }}
          >
            <Download size={14} /> 下载原图
          </a>
        </div>
      )}
    </div>
  );
}

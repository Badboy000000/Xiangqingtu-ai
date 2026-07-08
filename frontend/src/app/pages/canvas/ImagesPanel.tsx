import { forwardRef, useState, useCallback } from "react";
import { Download, ZoomIn, Loader2, Sparkles, Images, X, Wand2 } from "lucide-react";
import { zh, cardStyle } from "../../constants/theme";
import { useProject } from "../../../context/ProjectContext";

interface ImageCardProps {
  screen: { label: string; imageUrl: string; status: string };
  index: number;
  onPreview: (imageUrl: string, label: string) => void;
}

export const ImageCard = forwardRef<HTMLDivElement, ImageCardProps>(({ screen, index, onPreview }, ref) => {
  const { state, runEditScreen } = useProject();
  const isGenerating = state.node4Loading.includes(index);
  const hasImage = !!screen.imageUrl;

  // 真实图片尺寸（图片加载后获取）
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);

  // 「修改」交互状态
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const openEditor = () => {
    setEditPrompt("");
    setEditError(null);
    setEditing(true);
  };

  const cancelEditor = () => {
    setEditing(false);
    setEditPrompt("");
    setEditError(null);
  };

  const submitEdit = async () => {
    const trimmed = editPrompt.trim();
    if (!trimmed) {
      setEditError("请填写修改描述");
      return;
    }
    setEditError(null);
    try {
      await runEditScreen(index, trimmed);
      // 成功后收起输入区（图片会自动刷新）
      setEditing(false);
      setEditPrompt("");
    } catch (err: any) {
      setEditError(err?.message || "修改失败");
    }
  };

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
            <img
              src={screen.imageUrl}
              alt={screen.label}
              style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
                }
              }}
            />
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
              <button
                onClick={openEditor}
                disabled={isGenerating}
                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 12px", borderRadius: "7px", background: "rgba(139,92,246,0.92)", border: "none", fontSize: "11px", fontWeight: 600, cursor: isGenerating ? "not-allowed" : "pointer", color: "#fff", fontFamily: zh, opacity: isGenerating ? 0.5 : 1 }}>
                <Wand2 size={12} /> 修改
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
          {imgDims ? `${imgDims.w}×${imgDims.h}` : hasImage ? "加载中..." : "—"}
        </span>
      </div>

      {/* 修改输入区（仅在已生成图且未在其他生成任务中时展开） */}
      {editing && hasImage && (
        <div style={{ padding: "10px 14px 12px", borderTop: "1px solid rgba(0,0,0,0.05)", background: "rgba(139,92,246,0.04)" }}>
          <div style={{ fontSize: "10.5px", color: "#7c3aed", fontFamily: zh, marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
            <Wand2 size={11} /> 描述你想如何修改这张图
          </div>
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="例如：把背景换成木质桌面、放大主图、去掉左上角的文字…"
            disabled={isGenerating}
            autoFocus
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box" as const,
              fontSize: "11.5px", lineHeight: 1.5, color: "#1e1420",
              fontFamily: zh,
              border: "1px solid rgba(139,92,246,0.25)", borderRadius: "6px",
              padding: "7px 9px", outline: "none",
              resize: "vertical" as const, background: "#fff",
            }}
          />
          {editError && (
            <div style={{ fontSize: "10.5px", color: "#ef4444", fontFamily: zh, marginTop: "5px" }}>
              {editError}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "8px" }}>
            <button
              onClick={cancelEditor}
              disabled={isGenerating}
              style={{
                padding: "5px 12px", borderRadius: "6px",
                background: "transparent", border: "1px solid rgba(0,0,0,0.12)",
                fontSize: "11px", color: "rgba(30,20,32,0.6)", cursor: isGenerating ? "not-allowed" : "pointer",
                fontFamily: zh,
              }}
            >
              取消
            </button>
            <button
              onClick={submitEdit}
              disabled={isGenerating || !editPrompt.trim()}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "5px 14px", borderRadius: "6px",
                background: isGenerating || !editPrompt.trim() ? "rgba(0,0,0,0.05)" : "linear-gradient(135deg, #8b5cf6, #a855f7)",
                border: "none",
                fontSize: "11px", fontWeight: 600,
                color: isGenerating || !editPrompt.trim() ? "rgba(30,20,32,0.3)" : "#fff",
                cursor: isGenerating || !editPrompt.trim() ? "not-allowed" : "pointer",
                fontFamily: zh,
                boxShadow: !isGenerating && editPrompt.trim() ? "0 2px 6px rgba(139,92,246,0.3)" : "none",
              }}
            >
              {isGenerating ? (
                <><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> 修改中...</>
              ) : (
                <><Wand2 size={11} /> 应用修改</>
              )}
            </button>
          </div>
        </div>
      )}
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

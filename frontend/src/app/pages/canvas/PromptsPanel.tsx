import { forwardRef, useState, useEffect } from "react";
import { Edit3, Zap, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { zh, cardStyle } from "../../constants/theme";
import { useProject } from "../../../context/ProjectContext";

interface PromptBoxProps {
  prompt: string;
  label: string;
  index: number;
  status: string;
}

export const PromptBox = forwardRef<HTMLDivElement, PromptBoxProps>(({ prompt: initialPrompt, label, index, status }, ref) => {
  const { state, runGenerateScreen, saveScreenPrompt } = useProject();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [editing, setEditing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [saving, setSaving] = useState(false);

  // 当 context 中的 screen prompt 变化时同步本地 state
  const screen = state.screens[index];
  useEffect(() => {
    if (screen?.prompt) setPrompt(screen.prompt);
  }, [screen?.prompt]);

  // 非编辑时显示 context 值，编辑时显示本地值
  const currentPrompt = screen?.prompt || prompt;
  const isGenerating = state.node4Loading.includes(index);
  const isNode3Running = state.workflowStep === 'node3';
  const hasPrompt = !!currentPrompt;

  const handleGenerate = async () => {
    if (!state.projectId) return;
    await runGenerateScreen(index);
  };

  return (
    <div
      ref={ref}
      style={{ ...cardStyle, width: "320px", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      {/* Box header */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(249,115,22,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: "linear-gradient(135deg, #f97316, #fbbf24)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={11} color="#fff" />
          </div>
          <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#1e1420", fontFamily: zh }}>第 {index + 1} 屏</span>
          <span style={{ fontSize: "11px", color: "#f97316", fontFamily: zh, background: "rgba(249,115,22,0.08)", padding: "1px 7px", borderRadius: "4px", fontWeight: 600 }}>{label}</span>
          {/* 状态标识 */}
          {isNode3Running && !hasPrompt && (
            <span style={{ fontSize: "9.5px", color: "#f97316", fontFamily: zh, display: "flex", alignItems: "center", gap: "3px" }}>
              <Loader2 size={9} style={{ animation: "spin 1s linear infinite" }} /> 生成中...
            </span>
          )}
          {hasPrompt && (
            <span style={{ fontSize: "9.5px", color: "#22c55e", fontFamily: zh, background: "rgba(34,197,94,0.08)", padding: "1px 5px", borderRadius: "3px" }}>✓ 就绪</span>
          )}
        </div>
        <button
          onClick={async () => {
            if (editing) {
              // 编辑完成：保存提示词到后端和 context
              setSaving(true);
              try {
                await saveScreenPrompt(index, prompt);
              } catch {
                // 错误已在 context 中处理
              } finally {
                setSaving(false);
                setEditing(false);
              }
            } else {
              // 进入编辑模式：同步当前显示值到本地 state
              setPrompt(currentPrompt);
              setEditing(true);
            }
          }}
          disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 9px", borderRadius: "5px", background: editing ? "rgba(249,115,22,0.1)" : "transparent", border: `1px solid ${editing ? "rgba(249,115,22,0.25)" : "rgba(0,0,0,0.1)"}`, color: editing ? "#f97316" : "rgba(30,20,32,0.45)", fontSize: "10.5px", cursor: saving ? "wait" : "pointer", fontFamily: zh }}
        >
          {saving ? <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> : <Edit3 size={10} />} {saving ? "保存中..." : editing ? "完成" : "编辑"}
        </button>
      </div>

      {/* Theme display */}
      {screen?.theme && (
        <div style={{ padding: "8px 14px 0", fontSize: "11px", color: "#f97316", fontFamily: zh, fontWeight: 600 }}>
          🎨 {screen.theme}
        </div>
      )}

      {/* Prompt content - 固定高度 + 悬浮滚动 */}
      <div
        style={{ padding: "12px 14px 10px", maxHeight: editing ? "none" : "160px", overflow: hovering || editing ? "auto" : "hidden", transition: "all 0.2s ease" }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {editing ? (
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            autoFocus
            style={{ width: "100%", minHeight: "80px", fontSize: "11.5px", lineHeight: 1.65, color: "#1e1420", fontFamily: zh, border: "1px solid rgba(249,115,22,0.2)", borderRadius: "7px", padding: "8px 10px", outline: "none", resize: "vertical" as const, background: "rgba(249,115,22,0.02)", boxSizing: "border-box" as const }}
          />
        ) : isNode3Running && !hasPrompt ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 0" }}>
            <Loader2 size={14} color="#f97316" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "11.5px", color: "rgba(30,20,32,0.4)", fontFamily: zh }}>等待生成提示词...</span>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: "11.5px", lineHeight: 1.65, color: "rgba(30,20,32,0.75)", fontFamily: zh }}>
            {currentPrompt || "等待生成提示词..."}
          </p>
        )}
      </div>

      {/* Footer: generate/regenerate button */}
      <div style={{ padding: "8px 14px 12px", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !currentPrompt}
          style={{
            display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", borderRadius: "7px",
            background: isGenerating ? "rgba(249,115,22,0.07)" : !currentPrompt ? "rgba(0,0,0,0.04)" : "linear-gradient(135deg, #f97316, #fbbf24)",
            border: isGenerating ? "1px solid rgba(249,115,22,0.2)" : "none",
            color: isGenerating ? "#f97316" : !currentPrompt ? "rgba(30,20,32,0.25)" : "#fff", fontSize: "11.5px", fontWeight: 600,
            cursor: isGenerating || !currentPrompt ? "not-allowed" : "pointer", fontFamily: zh,
            boxShadow: !isGenerating && currentPrompt ? "0 2px 8px rgba(249,115,22,0.28)" : "none",
            transition: "all 0.2s ease", opacity: isGenerating ? 0.75 : 1,
          }}
        >
          {isGenerating ? (
            <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> 生成中...</>
          ) : screen?.imageUrl ? (
            <><RefreshCw size={12} /> 重新生成</>
          ) : (
            <><Sparkles size={12} /> 生成图片</>
          )}
        </button>
      </div>
    </div>
  );
});
PromptBox.displayName = "PromptBox";

interface PromptsPanelProps {
  promptRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export function PromptsPanel({ promptRefs }: PromptsPanelProps) {
  const { state, runPrompts } = useProject();
  const screens = state.screens;
  const workflowStep = state.workflowStep;
  const isNode3Running = workflowStep === 'node3';
  const completedCount = screens.filter(s => !!s.prompt).length;
  const canGeneratePrompts = !!state.projectId && !state.node3Loading && !isNode3Running && screens.length === 0;

  const handleGeneratePrompts = async () => {
    if (!state.projectId) return;
    await runPrompts();
  };

  return (
    <div style={{ alignSelf: "flex-start" }}>
      {/* Column label */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <div style={{ width: "3px", height: "16px", background: "linear-gradient(180deg, #f97316, #ec4899)", borderRadius: "2px" }} />
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e1420", fontFamily: zh }}>生图提示词</span>
        {screens.length > 0 && (
          <span style={{ fontSize: "11px", color: "rgba(30,20,32,0.35)", fontFamily: zh }}>
            {completedCount}/{screens.length} 完成
          </span>
        )}
      </div>

      {/* 生成提示词按钮 */}
      {screens.length === 0 && !isNode3Running && (
        <div style={{ ...cardStyle, padding: "20px", textAlign: "center" as const, marginBottom: "16px" }}>
          <button
            onClick={handleGeneratePrompts}
            disabled={!canGeneratePrompts}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px", borderRadius: "8px",
              background: canGeneratePrompts ? "linear-gradient(135deg, #f97316, #ec4899)" : "rgba(0,0,0,0.05)",
              border: "none", color: canGeneratePrompts ? "#fff" : "rgba(30,20,32,0.3)",
              fontSize: "12.5px", fontWeight: 600, cursor: canGeneratePrompts ? "pointer" : "not-allowed", fontFamily: zh,
              boxShadow: canGeneratePrompts ? "0 2px 10px rgba(249,115,22,0.25)" : "none",
            }}
          >
            <Sparkles size={13} /> 生成分屏提示词
          </button>
          {!state.projectId && (
            <div style={{ fontSize: "11px", color: "rgba(30,20,32,0.3)", fontFamily: zh, marginTop: "8px" }}>请先创建项目</div>
          )}
        </div>
      )}

      {/* Node3 流式加载状态 */}
      {isNode3Running && (
        <div style={{ ...cardStyle, padding: "20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <Loader2 size={16} color="#f97316" style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: "12px", color: "#f97316", fontFamily: zh, fontWeight: 600 }}>
              AI 正在生成分屏提示词...
            </div>
          </div>
          {/* 进度条 */}
          {screens.length > 0 && (
            <div style={{ height: "4px", background: "rgba(249,115,22,0.1)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "2px",
                background: "linear-gradient(90deg, #f97316, #ec4899)",
                width: `${(completedCount / Math.max(screens.length, 1)) * 100}%`,
                transition: "width 0.3s ease",
              }} />
            </div>
          )}
          <div style={{ fontSize: "11px", color: "rgba(30,20,32,0.4)", fontFamily: zh, marginTop: "6px" }}>
            已完成 {completedCount} 屏
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {screens.map((screen, i) => (
          <PromptBox
            key={i}
            prompt={screen.prompt}
            label={screen.label}
            index={i}
            status={screen.status}
            ref={el => { promptRefs.current[i] = el; }}
          />
        ))}
      </div>
    </div>
  );
}

import { forwardRef, useState } from "react";
import { Edit3, Sparkles, Loader2 } from "lucide-react";
import { zh, cardStyle } from "../../constants/theme";
import { useProject } from "../../../context/ProjectContext";

export const DesignPlanPanel = forwardRef<HTMLDivElement>((_, ref) => {
  const { state, runPlan } = useProject();
  const [plan, setPlan] = useState('');
  const [editing, setEditing] = useState(false);

  // 当 context 中的 planText 更新时同步
  const displayPlan = state.planText || plan;
  const workflowStep = state.workflowStep;
  const isNode2Running = workflowStep === 'node2' && !state.node2Loading;

  const handleAIGenerate = async () => {
    if (!state.projectId) return;
    try {
      await runPlan();
    } catch {
      // error handled in context
    }
  };

  // 自动执行：如果workflowStep是node2，表示正在自动生成
  const canGenerate = !!state.projectId && !state.node2Loading && workflowStep !== 'node2';

  return (
    <div ref={ref} style={{ width: "340px", alignSelf: "flex-start" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "3px", height: "16px", background: "linear-gradient(180deg, #f97316, #fbbf24)", borderRadius: "2px" }} />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e1420", fontFamily: zh }}>详情页设计规划</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={handleAIGenerate}
            disabled={!canGenerate}
            style={{
              display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px",
              background: state.node2Loading ? "rgba(249,115,22,0.04)" : canGenerate ? "rgba(249,115,22,0.07)" : "rgba(0,0,0,0.03)",
              border: `1px solid ${canGenerate ? "rgba(249,115,22,0.18)" : "rgba(0,0,0,0.08)"}`,
              color: canGenerate ? "#f97316" : "rgba(30,20,32,0.3)", fontSize: "11px",
              cursor: canGenerate ? "pointer" : "not-allowed", fontFamily: zh,
            }}
          >
            {state.node2Loading ? <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={10} />}
            {state.node2Loading ? "生成中..." : "AI 生成"}
          </button>
          {displayPlan && (
            <button
              onClick={() => setEditing(e => !e)}
              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", background: editing ? "rgba(249,115,22,0.1)" : "rgba(0,0,0,0.04)", border: `1px solid ${editing ? "rgba(249,115,22,0.3)" : "rgba(0,0,0,0.1)"}`, color: editing ? "#f97316" : "rgba(30,20,32,0.5)", fontSize: "11px", cursor: "pointer", fontFamily: zh }}
            >
              <Edit3 size={11} /> {editing ? "完成" : "编辑"}
            </button>
          )}
        </div>
      </div>

      {/* Card */}
      <div style={{ ...cardStyle }}>
        {!displayPlan && !state.node2Loading && workflowStep !== 'node2' ? (
          <div style={{ padding: "40px 20px", textAlign: "center" as const }}>
            <div style={{ fontSize: "12px", color: "rgba(30,20,32,0.3)", fontFamily: zh, lineHeight: 1.6 }}>
              {!state.projectId ? "请先创建项目并分析商品信息" : "点击上方「AI 生成」按钮获取设计规划"}
            </div>
          </div>
        ) : (state.node2Loading || workflowStep === 'node2') ? (
          <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Loader2 size={16} color="#f97316" style={{ animation: "spin 1s linear infinite" }} />
              <div style={{ fontSize: "12px", color: "#f97316", fontFamily: zh }}>AI 正在生成设计规划...</div>
            </div>
            {displayPlan && (
              <div style={{ 
                fontSize: "12.5px", 
                color: "#1e1420", 
                fontFamily: zh, 
                lineHeight: 1.78, 
                whiteSpace: "pre-wrap",
                background: "rgba(249,115,22,0.02)",
                padding: "12px",
                borderRadius: "8px",
                borderLeft: "3px solid #f97316"
              }}>
                {displayPlan}
                {/* 光标闪烁效果 */}
                <span style={{ 
                  display: "inline-block", 
                  width: "2px", 
                  height: "1em", 
                  background: "#f97316", 
                  marginLeft: "2px",
                  animation: "blink 1s step-end infinite",
                  verticalAlign: "text-bottom"
                }} />
              </div>
            )}
          </div>
        ) : editing ? (
          <textarea
            value={displayPlan}
            onChange={e => { setPlan(e.target.value); }}
            style={{
              width: "100%", minHeight: "520px", padding: "20px", fontSize: "12.5px", lineHeight: 1.75,
              color: "#1e1420", fontFamily: zh, border: "none", outline: "none",
              resize: "vertical" as const, boxSizing: "border-box" as const, background: "rgba(249,115,22,0.02)",
            }}
          />
        ) : (
          <div style={{ padding: "20px", fontSize: "12.5px", color: "#1e1420", fontFamily: zh, lineHeight: 1.78, whiteSpace: "pre-wrap" }}>
            {displayPlan}
          </div>
        )}
      </div>
    </div>
  );
});
DesignPlanPanel.displayName = "DesignPlanPanel";

import { forwardRef, useState } from "react";
import { Edit3, Sparkles, Loader2 } from "lucide-react";
import { zh, cardStyle } from "../../constants/theme";
import { useProject } from "../../../context/ProjectContext";

// 辅助组件：字段行
const FieldRow = ({ label, value }: { label: string; value?: string }) => (
  <div style={{ marginBottom: "12px" }}>
    <div style={{ fontSize: "11px", color: "rgba(30,20,32,0.4)", fontFamily: zh, marginBottom: "4px" }}>{label}</div>
    <div style={{ fontSize: "12.5px", color: "#1e1420", fontFamily: zh, lineHeight: 1.6 }}>{value || '-'}</div>
  </div>
);

// 辅助组件：模块卡片
const ModuleCard = ({ module }: { module: any }) => (
  <div style={{ 
    padding: "16px", 
    background: "rgba(249,115,22,0.03)", 
    borderRadius: "8px", 
    borderLeft: "3px solid #f97316",
    marginBottom: "12px"
  }}>
    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e1420", fontFamily: zh, marginBottom: "8px" }}>
      ## {module.theme}
    </div>
    <FieldRow label="核心视觉" value={module.coreVisual} />
    <FieldRow label="背景风格" value={module.bgStyle} />
    <FieldRow label="视觉策略" value={module.visualStrategy} />
    <FieldRow label="人物/道具建议" value={module.characterPropSuggestions} />
    <FieldRow label="平台规则" value={module.platformRules} />
    <FieldRow label="文案方向" value={module.textDirection} />
    <FieldRow label="产品角度" value={module.productAngle} />
  </div>
);

export const DesignPlanPanel = forwardRef<HTMLDivElement>((_, ref) => {
  const { state, runPlan } = useProject();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');  // 编辑时的临时值

  // 优先使用 node2Output.overallStyle，其次使用 planText（流式拼接的文本）
  const displayPlan = state.node2Output?.overallStyle || state.planText;
  const workflowStep = state.workflowStep;
  const isNode2Running = workflowStep === 'node2' && !state.node2Loading;

  // 判断是否已完成节点2（有设计规划）
  const hasDesignPlan = !!state.project?.node2Output;

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
              onClick={() => {
                if (editing) {
                  // 完成编辑，保存修改（这里可以调用 API 或更新 state）
                  setEditing(false);
                } else {
                  // 开始编辑，初始化 editValue
                  setEditValue(displayPlan);
                  setEditing(true);
                }
              }}
              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", background: editing ? "rgba(249,115,22,0.1)" : "rgba(0,0,0,0.04)", border: `1px solid ${editing ? "rgba(249,115,22,0.3)" : "rgba(0,0,0,0.1)"}`, color: editing ? "#f97316" : "rgba(30,20,32,0.5)", fontSize: "11px", cursor: "pointer", fontFamily: zh }}
            >
              <Edit3 size={11} /> {editing ? "完成" : "编辑"}
            </button>
          )}
        </div>
      </div>

      {/* Card */}
      <div style={{ ...cardStyle }}>
        {!hasDesignPlan && !state.node2Loading && workflowStep !== 'node2' ? (
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
            value={editValue}
            onChange={e => { setEditValue(e.target.value); }}
            style={{
              width: "100%", minHeight: "520px", padding: "20px", fontSize: "12.5px", lineHeight: 1.75,
              color: "#1e1420", fontFamily: zh, border: "none", outline: "none",
              resize: "vertical" as const, boxSizing: "border-box" as const, background: "rgba(249,115,22,0.02)",
            }}
          />
        ) : (
          <div style={{ padding: "20px" }}>
            {/* ── 整体风格 ── */}
            <FieldRow label="整体风格" value={state.project?.node2Output?.overallStyle} />
            
            {/* ── 全局视觉系统 ── */}
            {state.project?.node2Output?.globalVisualSystem && (
              <>
                <div style={{ marginTop: "20px", marginBottom: "12px", fontSize: "13px", fontWeight: 600, color: "#1e1420", fontFamily: zh }}>
                   全局视觉系统
                </div>
                <FieldRow label="背景底色" value={state.project.node2Output.globalVisualSystem.bgColor} />
                <FieldRow label="主色" value={state.project.node2Output.globalVisualSystem.mainColor} />
                <FieldRow label="辅色" value={state.project.node2Output.globalVisualSystem.accentColor} />
                <FieldRow label="点缀色" value={state.project.node2Output.globalVisualSystem.highlightColor} />
                <FieldRow label="色彩比例" value={state.project.node2Output.globalVisualSystem.colorRatio} />
                <FieldRow label="画风" value={state.project.node2Output.globalVisualSystem.artStyle} />
                <FieldRow label="光影" value={state.project.node2Output.globalVisualSystem.lighting} />
                <FieldRow label="渲染风格" value={state.project.node2Output.globalVisualSystem.rendering} />
                <FieldRow label="标题字形" value={state.project.node2Output.globalVisualSystem.titleFont} />
                <FieldRow label="正文字形" value={state.project.node2Output.globalVisualSystem.bodyFont} />
                <FieldRow label="标题呈现" value={state.project.node2Output.globalVisualSystem.titlePlacement} />
                <FieldRow label="字色数量" value={state.project.node2Output.globalVisualSystem.fontColorCount} />
                <FieldRow label="卡片风格" value={state.project.node2Output.globalVisualSystem.cardStyle} />
                <FieldRow label="圆角/线条" value={state.project.node2Output.globalVisualSystem.cornerLineStyle} />
                <FieldRow label="留白逻辑" value={state.project.node2Output.globalVisualSystem.whitespace} />
                <FieldRow label="层级关系" value={state.project.node2Output.globalVisualSystem.hierarchy} />
                <FieldRow label="品类氛围" value={state.project.node2Output.globalVisualSystem.categoryAtmosphere} />
              </>
            )}
            
            {/* ── 合规规则 ── */}
            {state.project?.node2Output?.complianceRules && state.project.node2Output.complianceRules.length > 0 && (
              <>
                <div style={{ marginTop: "20px", marginBottom: "12px", fontSize: "13px", fontWeight: 600, color: "#1e1420", fontFamily: zh }}>
                  ⚖️ 合规规则
                </div>
                <ul style={{ paddingLeft: "20px", margin: 0 }}>
                  {state.project.node2Output.complianceRules.map((rule: string, i: number) => (
                    <li key={i} style={{ fontSize: "12.5px", color: "#1e1420", fontFamily: zh, lineHeight: 1.6, marginBottom: "6px" }}>
                      {rule}
                    </li>
                  ))}
                </ul>
              </>
            )}
            
            {/* ── 分屏模块 ── */}
            {state.project?.node2Output?.modules && state.project.node2Output.modules.length > 0 && (
              <>
                <div style={{ marginTop: "20px", marginBottom: "12px", fontSize: "13px", fontWeight: 600, color: "#1e1420", fontFamily: zh }}>
                  📋 分屏模块（共 {state.project.node2Output.modules.length} 屏）
                </div>
                {state.project.node2Output.modules.map((module: any, i: number) => (
                  <ModuleCard key={i} module={module} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
DesignPlanPanel.displayName = "DesignPlanPanel";

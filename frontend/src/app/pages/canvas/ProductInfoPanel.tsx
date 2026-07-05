import { forwardRef, useRef, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { zh, cardStyle } from "../../constants/theme";
import { useProject } from "../../../context/ProjectContext";

export const ProductInfoPanel = forwardRef<HTMLDivElement>((_, ref) => {
  const { state, startWorkflow } = useProject();

  // 标记是否已经触发过工作流
  const workflowTriggeredRef = useRef(false);

  // 当 projectId 存在且项目已加载但没有 productInfo 时，自动启动工作流
  useEffect(() => {
    // 只有全新项目（无 screens 或 screens 都为空）才自动启动工作流
    // 如果已经有生成的屏，说明工作流已完成，不应再次触发
    const hasGeneratedScreens = state.screens.some(s => s.imageUrl);
    
    if (
      state.projectId && 
      state.project && 
      !state.project?.productInfo && 
      !workflowTriggeredRef.current &&
      !hasGeneratedScreens  // ← 关键：只有没有生成图片时才触发
    ) {
      console.log('[ProductInfoPanel] Auto-starting workflow for project:', state.projectId);
      workflowTriggeredRef.current = true;
      
      // 项目已在首页创建，直接启动 SSE 工作流（不需要重复创建项目）
      startWorkflow(state.projectId).catch(err => {
        console.error('[ProductInfoPanel] Workflow failed:', err);
        workflowTriggeredRef.current = false; // 允许重试
      });
    }
  }, [state.projectId, state.project, state.project?.productInfo, state.screens, startWorkflow]);

  // 判断是否已完成节点1（有商品信息）
  const hasProductInfo = !!state.project?.productInfo;

  return (
    <div ref={ref} style={{ width: "300px", alignSelf: "flex-start" }}>
      {/* Panel header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "3px", height: "16px", background: "linear-gradient(180deg, #8b5cf6, #ec4899)", borderRadius: "2px" }} />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e1420", fontFamily: zh }}>商品信息</span>
        </div>
        {hasProductInfo && (
          <span style={{ fontSize: "10.5px", color: "#22c55e", fontFamily: zh, background: "rgba(34,197,94,0.08)", padding: "2px 8px", borderRadius: "4px" }}>
            ✓ 已分析
          </span>
        )}
      </div>

      <div style={{ ...cardStyle }}>
        <div style={{ padding: "16px 18px" }}>
          {!hasProductInfo ? (
            <>
              {/* ── AI 分析中：项目已创建，正在自动分析 ── */}
              <div style={{ padding: "40px 20px", textAlign: "center" as const }}>
                <Loader2 size={24} color="#8b5cf6" style={{ animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                <div style={{ fontSize: "12px", color: "#8b5cf6", fontFamily: zh, marginBottom: "6px" }}>
                  AI 正在分析商品信息...
                </div>
                <div style={{ fontSize: "10.5px", color: "rgba(30,20,32,0.3)", fontFamily: zh }}>
                  系统正在自动整理商品数据
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ── 展示分析结果 ── */}
              <FieldRow label="产品名称" value={state.project?.productInfo?.basicInfo?.name || state.project?.name || ''} />
              <FieldRow label="针对平台" value={state.project?.productInfo?.basicInfo?.category?.includes('海外') ? '海外' : '国内'} />
              <BulletList label="核心卖点" items={(state.project?.productInfo?.productCore?.productFacts || []).filter(Boolean)} />
              <FieldRow label="目标人群" value={state.project?.productInfo?.basicInfo?.crowdSceneStyle || ''} />
              <FieldRow label="价格区间" value={state.project?.productInfo?.productCore?.infoGaps?.find((g: string) => g.includes('价格')) || ''} />
              <FieldRow label="设计元素要求" value={state.project?.productInfo?.productCore?.brandVisualGene || ''} editable />

              {state.project?.productInfo?.referenceImageUrls?.length > 0 && (
                <div>
                  <div style={{ fontSize: "10.5px", color: "rgba(30,20,32,0.38)", fontFamily: zh, marginBottom: "6px" }}>参考图</div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                    {state.project?.productInfo.referenceImageUrls.map((url: string, i: number) => (
                      <img key={i} src={url} alt={`ref-${i}`} style={{ width: "52px", height: "52px", objectFit: "cover", borderRadius: "6px", border: "1px solid rgba(0,0,0,0.08)" }} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
ProductInfoPanel.displayName = "ProductInfoPanel";

// ── 辅助组件 ──────────────────────────────────────────────

function FieldRow({ label, value, editable = false }: { label: string; value: string; editable?: boolean }) {
  const [val, setVal] = useState(value);
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "10.5px", color: "rgba(30,20,32,0.38)", fontFamily: zh, marginBottom: "4px", letterSpacing: "0.04em" }}>{label}</div>
      {editable ? (
        <textarea value={val} onChange={e => setVal(e.target.value)}
          style={{ width: "100%", background: "rgba(249,115,22,0.03)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: "8px", padding: "7px 10px", fontSize: "12px", color: "#1e1420", fontFamily: zh, lineHeight: 1.6, resize: "vertical" as const, outline: "none", boxSizing: "border-box" as const, minHeight: "64px" }} />
      ) : (
        <div style={{ fontSize: "12.5px", color: "#1e1420", fontFamily: zh, lineHeight: 1.6 }}>{val}</div>
      )}
    </div>
  );
}

function BulletList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "10.5px", color: "rgba(30,20,32,0.38)", fontFamily: zh, marginBottom: "6px", letterSpacing: "0.04em" }}>{label}</div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "7px", marginBottom: "4px" }}>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#f97316", flexShrink: 0, display: "block", marginTop: "6px" }} />
          <span style={{ fontSize: "12px", color: "#1e1420", fontFamily: zh, lineHeight: 1.55 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

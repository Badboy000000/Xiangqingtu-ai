import { Loader2, Check } from "lucide-react";
import { zh } from "../constants/theme";
import { useProject } from "../../context/ProjectContext";

const STEPS = [
  { key: "node1", label: "信息分析", color: "#8b5cf6" },
  { key: "node2", label: "设计规划", color: "#f97316" },
  { key: "node3", label: "提示词生成", color: "#ec4899" },
  { key: "node4", label: "生图准备", color: "#22c55e" },
] as const;

export function WorkflowProgress() {
  const { state } = useProject();
  const { workflowStep, workflowProgress } = state;

  // 不显示：idle 或 complete 后延迟隐藏
  if (workflowStep === "idle") return null;

  const isComplete = workflowStep === "complete";
  const currentIdx = STEPS.findIndex((s) => s.key === workflowStep);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "8px 20px",
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        fontFamily: zh,
      }}
    >
      {/* Steps */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
        {STEPS.map((step, i) => {
          const isDone = isComplete || (currentIdx > i);
          const isActive = !isComplete && currentIdx === i;
          const isPending = !isDone && !isActive;

          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
              {/* 节点圆圈 */}
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isDone
                    ? step.color
                    : isActive
                    ? `${step.color}18`
                    : "rgba(0,0,0,0.04)",
                  border: isActive ? `2px solid ${step.color}` : isDone ? "none" : "1px solid rgba(0,0,0,0.08)",
                  transition: "all 0.3s ease",
                }}
              >
                {isDone ? (
                  <Check size={12} color="#fff" />
                ) : isActive ? (
                  <Loader2 size={12} color={step.color} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <span style={{ fontSize: "9px", color: "rgba(30,20,32,0.25)", fontWeight: 600 }}>
                    {i + 1}
                  </span>
                )}
              </div>

              {/* 标签 */}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: isActive ? 600 : 400,
                  color: isDone ? step.color : isActive ? "#1e1420" : "rgba(30,20,32,0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                {step.label}
              </span>

              {/* 连接线 */}
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "2px",
                    background: isDone
                      ? step.color
                      : "rgba(0,0,0,0.06)",
                    borderRadius: "1px",
                    transition: "background 0.3s ease",
                    minWidth: "16px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 进度百分比 */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {!isComplete && (
          <span style={{ fontSize: "11px", color: "rgba(30,20,32,0.4)", fontWeight: 500 }}>
            {workflowProgress}%
          </span>
        )}
        {isComplete && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#22c55e",
              background: "rgba(34,197,94,0.08)",
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            ✓ 完成
          </span>
        )}
      </div>
    </div>
  );
}

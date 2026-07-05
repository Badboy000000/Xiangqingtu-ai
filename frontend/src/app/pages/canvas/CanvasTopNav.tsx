import { useNavigate } from "react-router";
import { Download, ChevronLeft } from "lucide-react";
import { DualGunLogo } from "../../components/DualGunLogo";
import { zh } from "../../constants/theme";
import { useProject } from "../../../context/ProjectContext";

export function CanvasTopNav() {
  const navigate = useNavigate();
  const { state } = useProject();
  const projectName = state.project?.name || '未命名项目';

  return (
    <div
      style={{
        height: "56px",
        background: "#fff",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: "0",
        flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Left: logo + back + project name */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "260px" }}>
        <DualGunLogo size={30} />
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 10px",
            borderRadius: "6px",
            background: "rgba(249,115,22,0.06)",
            border: "1px solid rgba(249,115,22,0.16)",
            color: "#f97316",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: zh,
          }}
        >
          <ChevronLeft size={13} />
          返回
        </button>
        <span style={{ fontSize: "13px", color: "rgba(30,20,32,0.35)", fontFamily: zh }}>
          {projectName} — 详情图项目
        </span>
      </div>

      {/* Center: tabs */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
        {["工具台", "资源库", "我的历史"].map((tab, i) => (
          <button
            key={tab}
            style={{
              padding: "6px 18px",
              borderRadius: "8px",
              border: "none",
              background: i === 0 ? "rgba(249,115,22,0.08)" : "transparent",
              color: i === 0 ? "#f97316" : "rgba(30,20,32,0.45)",
              fontSize: "13px",
              fontWeight: i === 0 ? 600 : 400,
              cursor: "pointer",
              fontFamily: zh,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Right: export + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "260px", justifyContent: "flex-end" }}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 16px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #f97316, #ec4899)",
            border: "none",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: zh,
            boxShadow: "0 2px 8px rgba(249,115,22,0.25)",
          }}
          onClick={() => navigate("/export")}
        >
          <Download size={13} />
          导出详情图
        </button>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #f97316, #ec4899)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            fontFamily: zh,
            cursor: "pointer",
          }}
        >
          我
        </div>
      </div>
    </div>
  );
}

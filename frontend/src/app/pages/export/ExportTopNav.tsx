import { useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";
import { DualGunLogo } from "../../components/DualGunLogo";
import { zh } from "../../constants/theme";

export function ExportTopNav() {
  const navigate = useNavigate();

  return (
    <div style={{ height: "56px", background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", padding: "0 24px", gap: "16px", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <DualGunLogo size={30} />

      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "rgba(30,20,32,0.38)", fontFamily: zh }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(30,20,32,0.38)", fontSize: "12px", padding: 0, fontFamily: zh }}>首页</button>
        <span>/</span>
        <button onClick={() => navigate("/canvas")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(30,20,32,0.38)", fontSize: "12px", padding: 0, fontFamily: zh }}>工作台</button>
        <span>/</span>
        <span style={{ color: "#f97316", fontWeight: 600 }}>导出详情图</span>
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={() => navigate("/canvas")}
        style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 14px", borderRadius: "7px", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.18)", color: "#f97316", fontSize: "12px", fontWeight: 500, cursor: "pointer", fontFamily: zh }}
      >
        <ChevronLeft size={14} /> 返回工作台
      </button>
    </div>
  );
}

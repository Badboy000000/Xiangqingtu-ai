import { useState, useEffect } from "react";
import { zh } from "../constants/theme";
import { ExportTopNav } from "./export/ExportTopNav";
import { PreviewCanvas } from "./export/PreviewCanvas";
import { ExportConfigPanel } from "./export/ExportConfigPanel";
import { ProjectProvider, useProject } from "../../context/ProjectContext";

export function ExportPage() {
  return (
    <ProjectProvider>
      <ExportPageInner />
    </ProjectProvider>
  );
}

function ExportPageInner() {
  const { state, loadProject } = useProject();

  // 从 localStorage 获取 projectId 并加载数据
  useEffect(() => {
    const savedId = localStorage.getItem('currentProjectId');
    if (savedId && !state.projectId) {
      loadProject(savedId);
    }
  }, []);

  const screens = state.screens
    .filter(s => !!s.imageUrl)
    .map(s => ({ label: s.label, url: s.imageUrl }));

  const [confirmed, setConfirmed] = useState<boolean[]>([]);

  // 当 screens 变化时初始化 confirmed 数组
  useEffect(() => {
    if (screens.length > 0 && confirmed.length !== screens.length) {
      setConfirmed(new Array(screens.length).fill(true));
    }
  }, [screens.length]);

  const toggleConfirm = (i: number) => {
    setConfirmed(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  // 无数据时的提示
  if (screens.length === 0 && !state.projectId) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f2ec", fontFamily: zh }}>
        <ExportTopNav />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" as const }}>
            <div style={{ fontSize: "14px", color: "rgba(30,20,32,0.4)", fontFamily: zh, marginBottom: "8px" }}>暂无可导出的图片</div>
            <div style={{ fontSize: "12px", color: "rgba(30,20,32,0.3)", fontFamily: zh }}>请先在工作台生成并确认图片</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f2ec", fontFamily: zh }}>
      <ExportTopNav />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <PreviewCanvas screens={screens} confirmed={confirmed} onToggleConfirm={toggleConfirm} />
        <ExportConfigPanel screens={screens} confirmed={confirmed} />
      </div>
    </div>
  );
}

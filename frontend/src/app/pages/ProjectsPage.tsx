import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderOpen,
  Copy,
  Trash2,
  Plus,
  Loader2,
  Folder,
  Globe,
  ChevronDown,
} from "lucide-react";
import * as api from "../../api";
import { Navbar } from "../components/Navbar";
import { zh } from "../constants/theme";

// ── 类型 ──────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  platform: "domestic" | "overseas";
  status: string;
  createdAt: string;
  screenCount?: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft:          { label: "草稿",   color: "#9ca3af", bg: "rgba(156,163,175,0.08)" },
  analyzing:      { label: "分析中", color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  analyzed:       { label: "已分析", color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  planning:       { label: "规划中", color: "#ec4899", bg: "rgba(236,72,153,0.08)" },
  planned:        { label: "已规划", color: "#ec4899", bg: "rgba(236,72,153,0.08)" },
  generating:     { label: "生成中", color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
  completed:      { label: "已完成", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  export_ready:   { label: "可导出", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
  failed:         { label: "失败",   color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
};

// ── 组件 ──────────────────────────────────────────────────

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "加载项目失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 点击外部关闭菜单
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = () => setMenuOpenId(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [menuOpenId]);

  const handleOpen = (id: string) => {
    localStorage.setItem("currentProjectId", id);
    navigate("/canvas");
  };

  const handleDuplicate = async (project: Project) => {
    try {
      setDuplicatingId(project.id);
      const newProject = await api.duplicateProject(project.id);
      setProjects((prev) => [newProject, ...prev]);
    } catch (e: any) {
      alert(e.message || "复制失败");
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeletingId(confirmDelete.id);
      await api.deleteProject(confirmDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e: any) {
      alert(e.message || "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin} 分钟前`;
    if (diffH < 24) return `${diffH} 小时前`;
    if (diffD < 7) return `${diffD} 天前`;
    return date.toLocaleDateString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fef9f5",
        position: "relative",
        overflow: "hidden",
        fontFamily: zh,
      }}
    >
      {/* 背景装饰 */}
      <div style={{ position: "fixed", top: "-200px", left: "-160px", width: "860px", height: "860px", background: "radial-gradient(circle, rgba(255,186,110,0.38) 0%, rgba(255,186,110,0.1) 45%, transparent 68%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: "-220px", right: "-180px", width: "800px", height: "800px", background: "radial-gradient(circle, rgba(255,150,190,0.3) 0%, rgba(255,150,190,0.08) 45%, transparent 68%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar />

        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 48px 80px" }}>
          {/* 页头 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#1e1420", letterSpacing: "-0.02em", margin: 0 }}>
                我的项目
              </h1>
              <p style={{ fontSize: "14px", color: "rgba(30,20,32,0.4)", margin: "6px 0 0" }}>
                管理你的电商详情图生成项目
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 6px 24px rgba(249,115,22,0.22)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 22px",
                borderRadius: "50px",
                background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
                border: "none",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(249,115,22,0.25)",
                fontFamily: zh,
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              新建项目
            </motion.button>
          </div>

          {/* 加载中 */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "120px 0" }}>
              <Loader2 size={28} color="rgba(249,115,22,0.6)" className="animate-spin" />
            </div>
          )}

          {/* 错误 */}
          {error && !loading && (
            <div style={{
              textAlign: "center",
              padding: "60px 0",
              color: "#ef4444",
              fontSize: "14px",
            }}>
              {error}
              <div style={{ marginTop: "16px" }}>
                <button
                  onClick={loadProjects}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    background: "rgba(249,115,22,0.08)",
                    border: "1px solid rgba(249,115,22,0.2)",
                    color: "#f97316",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: zh,
                  }}
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {/* 空状态 */}
          {!loading && !error && projects.length === 0 && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "120px 0",
              gap: "20px",
            }}>
              <div style={{
                width: "72px",
                height: "72px",
                borderRadius: "20px",
                background: "rgba(249,115,22,0.06)",
                border: "1px dashed rgba(249,115,22,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Folder size={32} color="rgba(249,115,22,0.4)" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "16px", fontWeight: 600, color: "#1e1420", margin: "0 0 6px" }}>
                  还没有项目
                </p>
                <p style={{ fontSize: "13px", color: "rgba(30,20,32,0.35)", margin: 0 }}>
                  点击「新建项目」开始生成你的第一张电商详情图
                </p>
              </div>
            </div>
          )}

          {/* 项目列表 */}
          {!loading && !error && projects.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "18px",
            }}>
              <AnimatePresence mode="popLayout">
                {projects.map((project) => {
                  const status = STATUS_MAP[project.status] || STATUS_MAP.draft;
                  const isDuplicating = duplicatingId === project.id;
                  const isDeleting = deletingId === project.id;
                  const menuOpen = menuOpenId === project.id;

                  return (
                    <motion.div
                      key={project.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      style={{
                        background: "#fff",
                        borderRadius: "14px",
                        border: "1px solid rgba(0,0,0,0.06)",
                        boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                      }}
                    >
                      {/* 顶部色条 */}
                      <div style={{
                        height: "3px",
                        background: status.color === "#9ca3af"
                          ? "linear-gradient(90deg, #d1d5db, #e5e7eb)"
                          : `linear-gradient(90deg, ${status.color}44, ${status.color}11)`,
                      }} />

                      <div style={{ padding: "20px 22px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                        {/* 标题行 */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
                          <h3
                            style={{
                              fontSize: "15px",
                              fontWeight: 700,
                              color: "#1e1420",
                              margin: 0,
                              lineHeight: 1.3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}
                            title={project.name}
                          >
                            {project.name}
                          </h3>
                          {/* 更多菜单按钮 */}
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpen ? null : project.id);
                              }}
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "8px",
                                background: menuOpen ? "rgba(0,0,0,0.04)" : "transparent",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "rgba(30,20,32,0.35)",
                                transition: "all 0.15s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                                e.currentTarget.style.color = "rgba(30,20,32,0.55)";
                              }}
                              onMouseLeave={(e) => {
                                if (!menuOpen) e.currentTarget.style.background = "transparent";
                                if (!menuOpen) e.currentTarget.style.color = "rgba(30,20,32,0.35)";
                              }}
                            >
                              <ChevronDown
                                size={14}
                                style={{
                                  transform: menuOpen ? "rotate(180deg)" : "rotate(0)",
                                  transition: "transform 0.2s",
                                }}
                              />
                            </button>

                            {/* 下拉菜单 */}
                            <AnimatePresence>
                              {menuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: "absolute",
                                    top: "34px",
                                    right: 0,
                                    width: "140px",
                                    background: "#fff",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                                    padding: "4px",
                                    zIndex: 20,
                                  }}
                                >
                                  <button
                                    onClick={() => { handleDuplicate(project); setMenuOpenId(null); }}
                                    disabled={isDuplicating}
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      padding: "8px 10px",
                                      borderRadius: "7px",
                                      background: "transparent",
                                      border: "none",
                                      cursor: isDuplicating ? "wait" : "pointer",
                                      fontSize: "13px",
                                      color: "#1e1420",
                                      fontFamily: zh,
                                      textAlign: "left",
                                      transition: "background 0.12s",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(249,115,22,0.06)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "transparent";
                                    }}
                                  >
                                    {isDuplicating ? (
                                      <Loader2 size={13} className="animate-spin" color="#f97316" />
                                    ) : (
                                      <Copy size={13} color="rgba(30,20,32,0.45)" />
                                    )}
                                    复制项目
                                  </button>
                                  <button
                                    onClick={() => { setConfirmDelete(project); setMenuOpenId(null); }}
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      padding: "8px 10px",
                                      borderRadius: "7px",
                                      background: "transparent",
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: "13px",
                                      color: "#ef4444",
                                      fontFamily: zh,
                                      textAlign: "left",
                                      transition: "background 0.12s",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = "transparent";
                                    }}
                                  >
                                    <Trash2 size={13} />
                                    删除项目
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* 标签行 */}
                        <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 10px",
                            borderRadius: "6px",
                            background: "rgba(249,115,22,0.06)",
                            border: "1px solid rgba(249,115,22,0.12)",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#f97316",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}>
                            <Globe size={10} />
                            {project.platform === "domestic" ? "国内" : "跨境"}
                          </span>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 10px",
                            borderRadius: "6px",
                            background: status.bg,
                            border: `1px solid ${status.color}18`,
                            fontSize: "11px",
                            fontWeight: 600,
                            color: status.color,
                            fontFamily: zh,
                          }}>
                            {status.label}
                          </span>
                        </div>

                        {/* 时间和屏数 */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                          <span style={{ fontSize: "12px", color: "rgba(30,20,32,0.3)" }}>
                            {formatDate(project.createdAt)}
                          </span>
                          {project.screenCount != null && (
                            <span style={{ fontSize: "12px", color: "rgba(30,20,32,0.3)" }}>
                              {project.screenCount} 屏
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 底部操作栏 */}
                      <div style={{
                        padding: "0 22px 16px",
                        display: "flex",
                        gap: "8px",
                      }}>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleOpen(project.id)}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "7px",
                            padding: "9px 0",
                            borderRadius: "9px",
                            background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
                            border: "none",
                            color: "#fff",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: "0 2px 8px rgba(249,115,22,0.2)",
                            fontFamily: zh,
                          }}
                        >
                          <FolderOpen size={14} />
                          打开
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !deletingId && setConfirmDelete(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(30,20,32,0.35)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "380px",
                background: "#fff",
                borderRadius: "16px",
                padding: "28px 28px 22px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              }}
            >
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "18px",
              }}>
                <Trash2 size={20} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e1420", margin: "0 0 8px" }}>
                确认删除
              </h3>
              <p style={{ fontSize: "13px", color: "rgba(30,20,32,0.5)", margin: "0 0 24px", lineHeight: 1.6 }}>
                删除项目「{confirmDelete.name}」后无法恢复，确定要删除吗？
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={!!deletingId}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "9px",
                    background: "rgba(0,0,0,0.04)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    color: "#1e1420",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: deletingId ? "not-allowed" : "pointer",
                    fontFamily: zh,
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!!deletingId}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "9px",
                    background: "#ef4444",
                    border: "none",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: deletingId ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: zh,
                  }}
                >
                  {deletingId && <Loader2 size={13} className="animate-spin" />}
                  删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

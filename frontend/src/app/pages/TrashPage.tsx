import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Recycle,
  RotateCcw,
  Loader2,
  Clock,
} from "lucide-react";
import {
  listDeletedProjects,
  restoreProject,
} from "../../api";

const zh = "'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif";

interface DeletedProject {
  id: string;
  name: string;
  deletedAt: string;
  templateType?: string;
}

export function TrashPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DeletedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadTrashedProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listDeletedProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "加载失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrashedProjects();
  }, []);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await restoreProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "恢复失败";
      alert(msg);
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "今天";
    if (diffDays === 1) return "昨天";
    if (diffDays < 30) return `${diffDays}天前`;
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "rgba(245,245,247,0.97)",
        fontFamily: zh,
        padding: "0 24px 60px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "28px 0 20px",
          maxWidth: "880px",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/projects")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.06)",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <ArrowLeft size={16} color="rgba(30,20,32,0.45)" />
          </motion.button>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1e1420", margin: 0 }}>
              回收站
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(30,20,32,0.4)", margin: "2px 0 0" }}>
              已删除 7 天内的项目会保留在这里，可随时恢复
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "880px", margin: "0 auto" }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "120px 0" }}>
            <Loader2 size={28} color="rgba(249,115,22,0.6)" className="animate-spin" />
          </div>
        )}

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
                onClick={loadTrashedProjects}
                style={{
                  padding: "8px 20px",
                  borderRadius: "50px",
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "#fff",
                  color: "#1e1420",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontFamily: zh,
                }}
              >
                重试
              </button>
            </div>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              textAlign: "center",
              padding: "100px 20px 60px",
            }}
          >
            <div style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "rgba(0,0,0,0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}>
              <Recycle size={32} color="rgba(30,20,32,0.15)" strokeWidth={1.5} />
            </div>
            <p style={{
              fontSize: "14px",
              color: "rgba(30,20,32,0.4)",
              margin: 0,
              fontFamily: zh,
            }}>
              回收站是空的
            </p>
          </motion.div>
        )}

        {!loading && !error && projects.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "16px",
          }}>
            <AnimatePresence mode="popLayout">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    border: "1px solid rgba(0,0,0,0.05)",
                    padding: "20px",
                    position: "relative",
                    opacity: 0.75,
                  }}
                >
                  {/* Project info */}
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "4px",
                    }}>
                      <Recycle size={13} color="rgba(249,115,22,0.5)" />
                      <span style={{
                        fontSize: "12px",
                        color: "rgba(249,115,22,0.6)",
                        fontWeight: 500,
                      }}>
                        已删除
                      </span>
                    </div>
                    <h3 style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "rgba(30,20,32,0.5)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {project.name}
                    </h3>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "6px",
                    }}>
                      <Clock size={11} color="rgba(30,20,32,0.25)" />
                      <span style={{
                        fontSize: "11px",
                        color: "rgba(30,20,32,0.3)",
                      }}>
                        {formatDate(project.deletedAt)}删除
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: "flex",
                    gap: "8px",
                    borderTop: "1px solid rgba(0,0,0,0.04)",
                    paddingTop: "12px",
                  }}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={restoringId === project.id}
                      onClick={() => handleRestore(project.id)}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                        padding: "8px 0",
                        borderRadius: "10px",
                        border: "none",
                        background: "rgba(34,197,94,0.08)",
                        color: "#16a34a",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: restoringId === project.id ? "wait" : "pointer",
                        fontFamily: zh,
                      }}
                    >
                      {restoringId === project.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RotateCcw size={12} />
                      )}
                      恢复
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

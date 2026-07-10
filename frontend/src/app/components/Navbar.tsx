import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { FolderOpen } from "lucide-react";
import { DualGunLogo } from "./DualGunLogo";
import { useAuth } from "../../context/AuthContext";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(254,249,245,0.72)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderBottom: "none",
        padding: "0 48px",
        height: "72px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 0 rgba(200,140,80,0.12), 0 2px 24px rgba(180,100,60,0.06)",
      }}
    >
      <div style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
        <DualGunLogo size={48} />
      </div>

      {isAuthenticated ? (
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/projects")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "50px",
              background: "transparent",
              border: "1px solid rgba(30,20,32,0.1)",
              color: "#4A3856",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.03)";
              e.currentTarget.style.borderColor = "rgba(249,115,22,0.2)";
              e.currentTarget.style.color = "#f97316";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(30,20,32,0.1)";
              e.currentTarget.style.color = "#4A3856";
            }}
          >
            <FolderOpen size={14} />
            我的项目
          </motion.button>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.nickname || user.username}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: `linear-gradient(135deg, #FF8C42, #FF6B9D)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              {(user?.nickname || user?.username || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#1E1420", fontFamily: "'Space Grotesk', sans-serif" }}>
            {user?.nickname || user?.username}
          </span>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => { logout(); navigate("/auth"); }}
            style={{
              padding: "7px 18px",
              borderRadius: "50px",
              background: "transparent",
              border: "1px solid rgba(30,20,32,0.15)",
              color: "#4A3856",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            退出
          </motion.button>
        </div>
      ) : (
        <motion.button
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{
            scale: 1.06,
            boxShadow: "0 8px 32px rgba(249,115,22,0.22), inset 0 0 20px rgba(249,115,22,0.06)",
          }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/auth")}
          style={{
            padding: "10px 30px",
            borderRadius: "50px",
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(249,115,22,0.28)",
            color: "#f97316",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(249,115,22,0.1), inset 0 1px 0 rgba(255,255,255,0.9)",
            letterSpacing: "0.04em",
            fontFamily: "'Space Grotesk', sans-serif",
            transition: "all 0.2s ease",
          }}
        >
          登录 / 注册
        </motion.button>
      )}
    </motion.nav>
  );
}

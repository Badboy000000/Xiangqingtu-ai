import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
import { useNavigate } from "react-router";
import { useAuth } from "../../../context/AuthContext";
import { generateDefaultAvatar } from "../../../utils/generateDefaultAvatar";

// ─── 颜色系统 ───────────────────────────────────────────────
const C = {
  canvas: "#FEF9F5",
  ink: "#1E1420",
  inkSub: "#4A3856",
  peach: "#FF8C42",
  rose: "#FF6B9D",
  violet: "#8B5CF6",
  mist: "#F0E6DC",
  white: "#FFFFFF",
  err: "#E5484D",
};

// ─── 鼠标跟随光斑 ──────────────────────────────────────────
function BlobField() {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  const x1 = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.8 });
  const y1 = useSpring(my, { stiffness: 60, damping: 20, mass: 0.8 });
  const x2 = useSpring(mx, { stiffness: 40, damping: 18, mass: 1.2 });
  const y2 = useSpring(my, { stiffness: 40, damping: 18, mass: 1.2 });
  const x3 = useSpring(mx, { stiffness: 28, damping: 16, mass: 1.6 });
  const y3 = useSpring(my, { stiffness: 28, damping: 16, mass: 1.6 });

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement)?.getBoundingClientRect?.();
      if (!rect) return;
      mx.set((e.clientX - rect.left) / rect.width);
      my.set((e.clientY - rect.top) / rect.height);
    };
    const el = document.getElementById("blob-area");
    el?.addEventListener("mousemove", handle);
    return () => el?.removeEventListener("mousemove", handle);
  }, [mx, my]);

  return (
    <div id="blob-area" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* 三个跟随鼠标的光斑，不同 spring 参数产生延迟层叠感 */}
      <motion.div style={{
        position: "absolute", width: 380, height: 380, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.peach} 0%, transparent 70%)`,
        opacity: 0.38, filter: "blur(55px)", pointerEvents: "none",
        left: "15%", top: "10%",
        x: useTransform(x1, v => (v - 0.5) * 140),
        y: useTransform(y1, v => (v - 0.5) * 100),
      }} />
      <motion.div style={{
        position: "absolute", width: 300, height: 300, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.rose} 0%, transparent 70%)`,
        opacity: 0.30, filter: "blur(50px)", pointerEvents: "none",
        left: "55%", top: "50%",
        x: useTransform(x2, v => (v - 0.5) * 180),
        y: useTransform(y2, v => (v - 0.5) * 130),
      }} />
      <motion.div style={{
        position: "absolute", width: 220, height: 220, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.violet} 0%, transparent 70%)`,
        opacity: 0.24, filter: "blur(45px)", pointerEvents: "none",
        left: "65%", top: "25%",
        x: useTransform(x3, v => (v - 0.5) * 220),
        y: useTransform(y3, v => (v - 0.5) * 160),
      }} />
    </div>
  );
}

// 需要从 motion/react 导入 useTransform (已在顶部导入)

// ─── 漂浮装饰元素 ────────────────────────────────────────────
function FloatingShapes() {
  const shapes = [
    { type: "circle", size: 18, color: C.peach, top: "12%", left: "8%", delay: 0 },
    { type: "square", size: 12, color: C.rose, top: "70%", left: "15%", delay: 1.2 },
    { type: "circle", size: 10, color: C.violet, top: "22%", left: "82%", delay: 0.6 },
    { type: "triangle", size: 16, color: C.peach, top: "78%", left: "75%", delay: 2.0 },
    { type: "square", size: 8, color: C.violet, top: "45%", left: "92%", delay: 0.3 },
  ];

  return (
    <>
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: s.type === "circle" ? "50%" : s.type === "square" ? "3px" : "0",
            background: s.type === "triangle" ? "transparent" : s.color,
            opacity: 0.6,
            ...(s.type === "triangle" ? {
              width: 0, height: 0,
              borderLeft: `${s.size / 2}px solid transparent`,
              borderRight: `${s.size / 2}px solid transparent`,
              borderBottom: `${s.size}px solid ${s.color}`,
            } : {}),
          }}
          animate={{ y: [0, -12, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 6, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

// ─── 输入框组件 ──────────────────────────────────────────────
function FloatingInput({
  label, type = "text", value, onChange, error,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;

  return (
    <div style={{ position: "relative", marginBottom: error ? "6px" : "22px" }}>
      <motion.label
        animate={{
          top: focused || hasValue ? "-8px" : "14px",
          fontSize: focused || hasValue ? "11px" : "15px",
          color: focused ? C.peach : C.inkSub,
        }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{
          position: "absolute", left: "16px",
          pointerEvents: "none", fontWeight: 500,
          fontFamily: "'Space Grotesk', sans-serif",
          background: focused || hasValue ? C.white : "transparent",
          padding: focused || hasValue ? "0 4px" : "0",
          borderRadius: "3px",
          zIndex: 1,
        }}
      >
        {label}
      </motion.label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          padding: "14px 16px",
          borderRadius: "12px",
          border: `1.5px solid ${error ? C.err : focused ? C.peach : "rgba(30,20,32,0.12)"}`,
          background: C.white,
          fontSize: "15px",
          color: C.ink,
          outline: "none",
          fontFamily: "'Space Grotesk', sans-serif",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
      />
      {/* 底部高亮线条 */}
      <motion.div
        style={{
          position: "absolute", bottom: 0, left: "50%", height: "2px",
          background: `linear-gradient(90deg, ${C.peach}, ${C.rose})`,
          borderRadius: "99px",
        }}
        animate={{ width: focused ? "92%" : "0%", x: focused ? "-50%" : "-50%" }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      />
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ color: C.err, fontSize: "12px", margin: "4px 0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────
export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginAccount, setLoginAccount] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string; password?: string }>({});
  const [shake, setShake] = useState(false);

  const { login, register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const confettiRef = useRef(false);

  // 标记：用户是否手动上传过头像
  const userUploadedRef = useRef(false);

  // 监听用户名变化，仅在用户未上传过头像时更新默认头像
  useEffect(() => {
    if (userUploadedRef.current) return; // 用户上传过头像后不再自动生成默认头像
    if (regUser) {
      const defaultAvatar = generateDefaultAvatar(regUser);
      setAvatarPreview(defaultAvatar);
    } else {
      setAvatarPreview(null);
    }
  }, [regUser]);

  // 已登录用户自动跳转到首页
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  /** 注册表单前端校验，返回是否有错误 */
  const validateRegister = (): boolean => {
    const errs: typeof fieldErrors = {};
    if (!regUser.trim()) {
      errs.username = "请输入用户名";
    } else if (regUser.trim().length < 3) {
      errs.username = "用户名至少 3 个字符";
    } else if (regUser.trim().length > 50) {
      errs.username = "用户名最多 50 个字符";
    }
    if (!regEmail.trim()) {
      errs.email = "请输入邮箱";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errs.email = "邮箱格式不正确";
    }
    if (!regPass) {
      errs.password = "请输入密码";
    } else if (regPass.length < 6) {
      errs.password = "密码至少 6 个字符";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login({ account: loginAccount, password: loginPass });
      } else {
        // 前端校验
        if (validateRegister()) {
          setSubmitting(false);
          triggerShake();
          return;
        }

        await register({ 
          username: regUser.trim(), 
          email: regEmail.trim(), 
          password: regPass, 
          nickname: regUser.trim(),
          avatar: avatarPreview || undefined 
        });
        // 注册成功放烟花
        confettiRef.current = true;
        // @ts-ignore canvas-confetti 无类型声明
        import("canvas-confetti").then(({ default: confetti }) => {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 }, colors: [C.peach, C.rose, C.violet, "#FFD700"] });
        });
      }
      navigate("/", { replace: true });
    } catch (err: any) {
      const msg = err.message || "操作失败";
      // 将后端返回的常见错误映射到对应字段
      if (mode === "register") {
        if (msg.includes("已被占用") || msg.includes("用户名")) {
          setFieldErrors(prev => ({ ...prev, username: msg }));
        } else if (msg.includes("已被注册") || msg.includes("邮箱")) {
          setFieldErrors(prev => ({ ...prev, email: msg }));
        } else if (msg.includes("密码")) {
          setFieldErrors(prev => ({ ...prev, password: msg }));
        } else {
          setError(msg);
        }
      } else {
        setError(msg);
      }
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === "login" ? "register" : "login");
    setError(null);
    setFieldErrors({});
  };

  // 压缩图片并返回 Base64
  const compressImage = async (
    file: File,
    maxWidth: number = 400,
    quality: number = 0.8
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          // 计算缩放比例
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          // 创建 Canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);

          // 导出为 JPEG（带压缩）
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };

        img.onerror = () => {
          reject(new Error('图片加载失败'));
        };
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
    });
  };

  // 处理头像文件选择
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件（JPG/PNG）');
      triggerShake();
      return;
    }

    // 验证文件大小（最大 2MB）
    if (file.size > 2 * 1024 * 1024) {
      setError('头像大小不能超过 2MB');
      triggerShake();
      return;
    }

    // 读取文件
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;

      // 先立即显示预览
      setAvatarPreview(dataUrl);
      setAvatarFile(file);
      userUploadedRef.current = true;

      // 异步压缩优化
      try {
        const compressed = await compressImage(file, 400, 0.8);
        setAvatarPreview(compressed);
      } catch {
        // 压缩失败保留原图预览
      }
    };
    reader.readAsDataURL(file);
  };

  // 删除头像（恢复为默认头像）
  const handleRemoveAvatar = () => {
    userUploadedRef.current = false; // 重置上传标记
    if (regUser) {
      const defaultAvatar = generateDefaultAvatar(regUser);
      setAvatarPreview(defaultAvatar);
    } else {
      setAvatarPreview(null);
    }
    setAvatarFile(null);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: C.canvas,
      display: "flex",
      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* 背景点阵 */}
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: `radial-gradient(circle, rgba(200,140,80,0.10) 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
        pointerEvents: "none",
      }} />

      {/* ── 左侧面板 ── */}
      <div style={{
        flex: "0 0 50%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px",
        boxSizing: "border-box",
      }}
        className="auth-left-panel"
      >
        <BlobField />
        <FloatingShapes />

        {/* 品牌标语 */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              fontSize: "clamp(32px, 4vw, 56px)",
              fontWeight: 700,
              color: C.ink,
              lineHeight: 1.15,
              margin: "0 0 20px",
              letterSpacing: "-0.02em",
            }}
          >
            创造，
            <br />
            <span style={{
              background: `linear-gradient(135deg, ${C.peach}, ${C.rose}, ${C.violet})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              从这一刻开始
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            style={{ fontSize: "16px", color: C.inkSub, lineHeight: 1.6, maxWidth: "320px", margin: "0 auto" }}
          >
            用 AI 为你的电商产品打造专业详情图，
            <br />
            四步工作流，从灵感到成品。
          </motion.p>

          {/* 特性标签 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
            style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "32px", flexWrap: "wrap" }}
          >
            {["AI 驱动", "四步出图", "专业级品质"].map((tag, i) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
                style={{
                  padding: "6px 16px",
                  borderRadius: "50px",
                  background: "rgba(255,140,66,0.12)",
                  color: C.peach,
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "1px solid rgba(255,140,66,0.2)",
                }}
              >
                {tag}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── 右侧面板 ── */}
      <div style={{
        flex: "0 0 50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px",
        boxSizing: "border-box",
      }}
        className="auth-right-panel"
      >
        <motion.div
          animate={shake ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.45 }}
          style={{
            width: "100%",
            maxWidth: "400px",
            background: C.white,
            borderRadius: "24px",
            padding: "44px 40px 36px",
            boxShadow: "0 4px 40px rgba(30,20,32,0.08), 0 1px 4px rgba(30,20,32,0.04)",
            border: "1px solid rgba(30,20,32,0.06)",
          }}
        >
          {/* Tab 切换 */}
          <div style={{ display: "flex", gap: "0", marginBottom: "32px", position: "relative", borderRadius: "12px", overflow: "hidden", background: C.mist }}>
            {(["login", "register"] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: mode === m ? C.white : C.inkSub,
                  background: "transparent",
                  fontFamily: "'Space Grotesk', sans-serif",
                  position: "relative",
                  zIndex: 1,
                  transition: "color 0.2s",
                }}
              >
                {m === "login" ? "登录" : "注册"}
              </button>
            ))}
            {/* 滑块指示器 */}
            <motion.div
              animate={{ x: mode === "login" ? "0%" : "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              style={{
                position: "absolute",
                top: 0, bottom: 0,
                width: "50%",
                borderRadius: "12px",
                background: `linear-gradient(135deg, ${C.peach}, ${C.rose})`,
                zIndex: 0,
              }}
            />
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.22 }}
                >
                  <FloatingInput
                    label="用户名 / 邮箱"
                    value={loginAccount}
                    onChange={setLoginAccount}
                  />
                  <FloatingInput
                    label="密码"
                    type="password"
                    value={loginPass}
                    onChange={setLoginPass}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.22 }}
                >
                  {/* 头像上传区域 */}
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                    <motion.label
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        width: "84px",
                        height: "84px",
                        borderRadius: "50%",
                        border: avatarPreview
                          ? "2.5px solid rgba(255,255,255,0.7)"
                          : "1.5px dashed rgba(30,20,32,0.15)",
                        background: avatarPreview
                          ? "linear-gradient(135deg, rgba(255,140,66,0.08), rgba(255,107,157,0.08))"
                          : "rgba(240,230,220,0.5)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                        transition: "border-color 0.3s, box-shadow 0.3s",
                        boxShadow: avatarPreview
                          ? "0 2px 16px rgba(255,140,66,0.18), 0 0 0 4px rgba(255,140,66,0.06), inset 0 1px 2px rgba(255,255,255,0.5)"
                          : "0 1px 6px rgba(30,20,32,0.04)",
                      }}
                    >
                      {avatarPreview ? (
                        <>
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: "50%",
                            }}
                          />
                          {/* 悬浮遮罩 */}
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: 0,
                              transition: "opacity 0.25s",
                            }}
                            className="avatar-overlay"
                          >
                            <span style={{ color: C.white, fontSize: "11px", fontWeight: 600, letterSpacing: "0.02em" }}>更换头像</span>
                          </div>
                        </>
                      ) : (
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={C.inkSub}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ opacity: 0.5 }}
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                          <line x1="12" y1="11" x2="12" y2="17" />
                          <line x1="9" y1="14" x2="15" y2="14" />
                        </svg>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleAvatarChange}
                        style={{ display: "none" }}
                      />
                    </motion.label>
                  </div>

                  <FloatingInput label="用户名 / 昵称" value={regUser} onChange={v => { setRegUser(v); if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: undefined })); }} error={fieldErrors.username} />
                  <p style={{ fontSize: "12px", color: C.inkSub, margin: fieldErrors.username ? "0 0 12px 4px" : "-16px 0 16px 4px" }}>
                    此名称将用于登录和显示
                  </p>
                  <FloatingInput label="邮箱" type="email" value={regEmail} onChange={v => { setRegEmail(v); if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined })); }} error={fieldErrors.email} />
                  <FloatingInput label="密码" type="password" value={regPass} onChange={v => { setRegPass(v); if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined })); }} error={fieldErrors.password} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  style={{
                    background: "rgba(229,72,77,0.08)",
                    border: `1px solid rgba(229,72,77,0.25)`,
                    borderRadius: "10px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                    color: C.err,
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 提交按钮 */}
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: submitting ? 1 : 1.02, boxShadow: "0 8px 32px rgba(255,140,66,0.28)" }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: "12px",
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                background: `linear-gradient(135deg, ${C.peach}, ${C.rose})`,
                color: C.white,
                fontSize: "15px",
                fontWeight: 700,
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.04em",
                boxShadow: "0 4px 20px rgba(255,140,66,0.18)",
                transition: "opacity 0.2s",
                opacity: submitting ? 0.75 : 1,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {submitting ? (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  {mode === "login" ? "登录中…" : "注册中…"}
                </motion.span>
              ) : (
                mode === "login" ? "登录" : "创建账号"
              )}
            </motion.button>
          </form>

          {/* 切换提示 */}
          <p style={{ textAlign: "center", marginTop: "24px", color: C.inkSub, fontSize: "13px" }}>
            {mode === "login" ? "还没有账号？" : "已有账号？"}
            <button
              onClick={switchMode}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: C.peach, fontWeight: 600, fontSize: "13px",
                fontFamily: "'Space Grotesk', sans-serif",
                marginLeft: "4px", padding: 0,
              }}
            >
              {mode === "login" ? "立即注册" : "去登录"}
            </button>
          </p>
        </motion.div>
      </div>

      {/* ── 响应式 CSS ── */}
      <style>{`
        @media (max-width: 860px) {
          .auth-left-panel {
            position: fixed !important;
            inset: 0 !important;
            flex: unset !important;
            padding: 0 !important;
            opacity: 0.6;
          }
          .auth-left-panel > div:first-child { display: block !important; }
          .auth-left-panel > h1, .auth-left-panel > p, .auth-left-panel > div:last-child { display: none !important; }
          .auth-right-panel {
            flex: 1 !important;
            padding: 24px !important;
            position: relative;
            z-index: 10;
          }
        }
      `}</style>
      <style>{`
        .avatar-overlay:hover {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

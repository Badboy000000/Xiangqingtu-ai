import { motion } from "motion/react";
import { Cpu, Zap, Sparkles } from "lucide-react";
import { zh, glass } from "../constants/theme";

// 本地产品参考图和详情图（已压缩并适配容器尺寸）
const HEADPHONE_PRODUCT = new URL("../../assets/product-reference.jpg", import.meta.url).href;
const HEADPHONE_DETAIL = new URL("../../assets/detail-image.jpg", import.meta.url).href;

const features = [
  {
    icon: <Cpu size={16} />,
    name: "AI 智能生成",
    desc: "深度理解产品卖点，智能编排专业图文方案",
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.18)",
  },
  {
    icon: <Zap size={16} />,
    name: "省时高效",
    desc: "分钟内完成传统设计师数小时的工作",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.08)",
    border: "rgba(236,72,153,0.18)",
  },
  {
    icon: <Sparkles size={16} />,
    name: "专业美观",
    desc: "媲美资深设计师的视觉呈现效果",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.18)",
  },
];

export function HeroSection() {
  return (
    <section
      style={{
        display: "flex",
        gap: "72px",
        alignItems: "center",
        padding: "80px 48px 80px",
        maxWidth: "1300px",
        margin: "0 auto",
      }}
    >
      {/* ─── Left column ─── */}
      <div style={{ flex: "1 1 0", minWidth: 0 }}>

        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 14px 5px 10px",
            borderRadius: "20px",
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.2)",
            marginBottom: "36px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#f97316",
              display: "block",
              boxShadow: "0 0 7px rgba(249,115,22,0.7)",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              color: "#f97316",
              letterSpacing: "0.1em",
              fontWeight: 600,
              textTransform: "uppercase",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            AI 驱动 · 极速生成
          </span>
        </motion.div>

        {/* Headline — two visual layers */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08 }}
          style={{ marginBottom: "20px" }}
        >
          {/* Line 1: warm orange gradient */}
          <div
            style={{
              fontSize: "clamp(44px, 5.5vw, 68px)",
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              background: "linear-gradient(110deg, #f97316 0%, #fb923c 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontFamily: zh,
            }}
          >
            AI 一键生成
          </div>
          {/* Line 2: deep warm charcoal */}
          <div
            style={{
              fontSize: "clamp(44px, 5.5vw, 68px)",
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "#1e1420",
              fontFamily: zh,
            }}
          >
            电商详情图
          </div>
        </motion.div>

        {/* Decorative accent rule */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.55, delay: 0.28, ease: "easeOut" }}
          style={{
            height: "2px",
            width: "100px",
            background:
              "linear-gradient(90deg, #f97316 0%, rgba(249,115,22,0) 100%)",
            borderRadius: "2px",
            marginBottom: "22px",
            transformOrigin: "left center",
          }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.18 }}
          style={{
            fontSize: "15px",
            color: "rgba(30,20,32,0.48)",
            lineHeight: 1.85,
            marginBottom: "52px",
            fontFamily: zh,
            maxWidth: "380px",
          }}
        >
          上传参考图，AI 自动补全整理信息
          <br />
          一键生成专业级详情长图
        </motion.p>

        {/* Feature strip — horizontal list with dividers */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32 }}
          style={{
            display: "flex",
            paddingTop: "24px",
            borderTop: "1px solid rgba(180,100,60,0.1)",
          }}
        >
          {features.map((f, i) => (
            <div
              key={f.name}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "flex-start",
                gap: "11px",
                paddingRight: i < 2 ? "28px" : 0,
                paddingLeft: i > 0 ? "28px" : 0,
                borderRight:
                  i < 2 ? "1px solid rgba(180,100,60,0.1)" : "none",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "9px",
                  background: f.bg,
                  border: `1px solid ${f.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: f.color,
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                {f.icon}
              </div>

              {/* Text */}
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1e1420",
                    marginBottom: "4px",
                    fontFamily: zh,
                  }}
                >
                  {f.name}
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "rgba(30,20,32,0.4)",
                    lineHeight: 1.6,
                    fontFamily: zh,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ─── Right column: Before → After transformation ─── */}
      <motion.div
        initial={{ opacity: 0, x: 36 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 0.28, ease: "easeOut" }}
        style={{
          flex: "0 0 450px",
          position: "relative",
          height: "500px",
        }}
      >
        {/* Warm ambient glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 85% 85% at 60% 50%, rgba(255,186,110,0.24) 0%, rgba(255,150,190,0.12) 55%, transparent 80%)",
            pointerEvents: "none",
          }}
        />

        {/* ① Input card — reference photo (small, top-left) */}
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            ...glass,
            position: "absolute",
            top: "28px",
            left: 0,
            width: "162px",
            borderRadius: "16px",
            overflow: "hidden",
            zIndex: 2,
            transform: "rotate(-4deg)",
          }}
        >
          {/* Step badge */}
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid rgba(180,100,60,0.08)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "rgba(180,100,60,0.1)",
                border: "1px solid rgba(180,100,60,0.18)",
                fontSize: "10px",
                fontWeight: 700,
                color: "rgba(30,20,32,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              1
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "rgba(30,20,32,0.42)",
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.03em",
              }}
            >
              上传参考图
            </span>
          </div>

          {/* Product photo */}
          <img
            src={HEADPHONE_PRODUCT}
            alt="耳机产品参考图"
            style={{
              width: "100%",
              height: "130px",
              objectFit: "cover",
              display: "block",
            }}
          />

          {/* Uploaded status */}
          <div
            style={{
              padding: "7px 12px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "rgba(34,197,94,0.05)",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "#22c55e",
                display: "block",
              }}
            />
            <span
              style={{
                fontSize: "10px",
                color: "#16a34a",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 500,
              }}
            >
              已上传 · 1 张
            </span>
          </div>
        </motion.div>

        {/* AI processing badge (center) */}
        

        {/* ② Output card — full e-commerce detail long image (tall, right) */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "248px",
            height: "490px",
            borderRadius: "18px",
            overflow: "hidden",
            zIndex: 3,
            transform: "rotate(2.5deg)",
            background: "#fff",
            boxShadow:
              "0 24px 80px rgba(180,100,60,0.14), 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)",
            border: "1px solid rgba(249,115,22,0.18)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* ── Header bar ── */}
          <div
            style={{
              padding: "9px 13px",
              background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(236,72,153,0.05))",
              borderBottom: "1px solid rgba(249,115,22,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #f97316, #ec4899)",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                2
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "#f97316",
                  fontWeight: 600,
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "0.04em",
                }}
              >
                AI 生成详情图
              </span>
            </div>
            <span
              style={{
                fontSize: "9px",
                color: "#22c55e",
                fontWeight: 600,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              ✓ 完成
            </span>
          </div>

          {/* ── 可滚动的详情图区域 ── */}
          <div
            className="detail-scroll-container"
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              position: "relative",
            }}
            onWheel={(e) => {
              // 阻止滚动事件冒泡到父元素，只让当前容器滚动
              e.stopPropagation();
            }}
          >
            <img
              src={HEADPHONE_DETAIL}
              alt="电商详情长图"
              style={{
                width: "100%",
                height: "auto",
                minHeight: "100%",
                display: "block",
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

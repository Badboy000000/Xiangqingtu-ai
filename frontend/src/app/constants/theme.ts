import { type CSSProperties } from "react";

/** 中文字体栈 */
export const zh =
  "'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', 'Space Grotesk', sans-serif";

/** 英文/数字字体栈 */
export const en = "'Space Grotesk', sans-serif";

/** 毛玻璃面板 */
export const glass: CSSProperties = {
  background: "rgba(255,255,255,0.62)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow:
    "0 8px 32px rgba(180,100,60,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95)",
};

/** 白底卡片 */
export const cardStyle: CSSProperties = {
  background: "#fff",
  borderRadius: "14px",
  boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
  border: "1px solid rgba(0,0,0,0.06)",
  overflow: "hidden",
};

/** 表单输入框基础样式 */
export const baseInput: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(180,100,60,0.12)",
  color: "#1e1420",
  fontSize: "13px",
  outline: "none",
  fontFamily: zh,
  boxSizing: "border-box",
  transition: "border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
};

/** 输入框获焦回调 */
export const focusIn = (
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
) => {
  e.currentTarget.style.borderColor = "rgba(249,115,22,0.45)";
  e.currentTarget.style.background = "rgba(255,255,255,0.9)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.08)";
};

/** 输入框失焦回调 */
export const focusOut = (
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
) => {
  e.currentTarget.style.borderColor = "rgba(180,100,60,0.12)";
  e.currentTarget.style.background = "rgba(255,255,255,0.7)";
  e.currentTarget.style.boxShadow = "none";
};

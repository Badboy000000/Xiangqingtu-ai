import { useRef, useCallback, useEffect, type ReactNode, type CSSProperties } from "react";

interface ScrollFadeProps {
  children: ReactNode;
  /** 外层包装器 style（position: relative 已内置） */
  style?: CSSProperties;
  className?: string;
}

/**
 * 滚动边缘渐隐包装器。
 *
 * 用法：将可滚动内容作为 children 传入，外层自动添加上下边缘渐隐遮罩。
 * children 中负责滚动的元素需添加 data-scroll-target 属性。
 *
 * <ScrollFade style={{ flex: 1 }}>
 *   <div data-scroll-target style={{ overflowY: "auto", height: "100%" }}>
 *     ...内容...
 *   </div>
 * </ScrollFade>
 */
export function ScrollFade({ children, style, className }: ScrollFadeProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const scroller = wrapper.querySelector<HTMLElement>("[data-scroll-target]");
    if (!scroller) return;

    const { scrollTop, scrollHeight, clientHeight } = scroller;
    const atTop = scrollTop > 6;
    const atBottom = scrollTop + clientHeight < scrollHeight - 6;
    wrapper.dataset.scrollTop = String(atTop);
    wrapper.dataset.scrollBottom = String(atBottom);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const scroller = wrapper.querySelector<HTMLElement>("[data-scroll-target]");
    if (!scroller) return;

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const wrapperClassName = `scroll-fade${className ? ` ${className}` : ""}`;

  return (
    <div
      ref={wrapperRef}
      className={wrapperClassName}
      style={{ position: "relative", ...style }}
    >
      <div className="scroll-fade__top" />
      <div className="scroll-fade__bottom" />
      {children}
    </div>
  );
}

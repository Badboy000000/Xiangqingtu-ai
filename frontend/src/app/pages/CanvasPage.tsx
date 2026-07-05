import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { CanvasTopNav } from "./canvas/CanvasTopNav";
import { ProductInfoPanel } from "./canvas/ProductInfoPanel";
import { DesignPlanPanel } from "./canvas/DesignPlanPanel";
import { PromptsPanel } from "./canvas/PromptsPanel";
import { ImagesPanel } from "./canvas/ImagesPanel";
import { WorkflowProgress } from "../components/WorkflowProgress";
import { ProjectProvider, useProject } from "../../context/ProjectContext";

interface LineCoord {
  x1: number; y1: number;
  x2: number; y2: number;
}

function getRelPos(el: HTMLElement, container: HTMLElement) {
  const er = el.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  return {
    left:    er.left   - cr.left,
    top:     er.top    - cr.top,
    right:   er.right  - cr.left,
    bottom:  er.bottom - cr.top,
    width:   er.width,
    height:  er.height,
    centerY: er.top - cr.top + er.height / 2,
    centerX: er.left - cr.left + er.width / 2,
  };
}

export function CanvasPage() {
  return (
    <ProjectProvider>
      <CanvasPageInner />
    </ProjectProvider>
  );
}

function CanvasPageInner() {
  const { state, loadProject } = useProject();
  const navigate = useNavigate();
  const screenCount = Math.max(state.screens.length, 1);
  const canvasRef      = useRef<HTMLDivElement>(null);
  const productRef     = useRef<HTMLDivElement>(null);
  const designRef      = useRef<HTMLDivElement>(null);
  const promptRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const imageRefs      = useRef<(HTMLDivElement | null)[]>([]);

  // 初始化：检查 localStorage 中是否有 projectId，如果没有则重定向到首页
  useEffect(() => {
    const savedProjectId = localStorage.getItem('currentProjectId');
    
    if (!savedProjectId) {
      // 没有项目 ID，重定向到首页
      console.log('[CanvasPage] No project found, redirecting to home');
      navigate('/');
      return;
    }
    
    if (!state.projectId) {
      console.log('[CanvasPage] Detected saved projectId:', savedProjectId);
      
      // 先加载项目数据
      loadProject(savedProjectId).catch(err => {
        console.error('[CanvasPage] Failed to load project:', err);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 动态调整 refs 数组长度
  useEffect(() => {
    promptRefs.current = promptRefs.current.slice(0, screenCount);
    imageRefs.current = imageRefs.current.slice(0, screenCount);
    while (promptRefs.current.length < screenCount) promptRefs.current.push(null);
    while (imageRefs.current.length < screenCount) imageRefs.current.push(null);
  }, [screenCount]);
  const [lines, setLines] = useState<LineCoord[]>([]);
  const [svgH, setSvgH] = useState(0);
  const [svgW, setSvgW] = useState(0);

  useEffect(() => {
    const calc = () => {
      const container = canvasRef.current;
      if (!container) return;
      setSvgW(container.scrollWidth);
      setSvgH(container.scrollHeight);

      const next: LineCoord[] = [];

      // Product Info → Design Plan
      if (productRef.current && designRef.current) {
        const p = getRelPos(productRef.current, container);
        const d = getRelPos(designRef.current, container);
        next.push({ x1: p.right, y1: p.centerY, x2: d.left, y2: d.centerY });
      }

      // Design Plan → each Prompt box
      if (designRef.current) {
        const d = getRelPos(designRef.current, container);
        const count = promptRefs.current.length;
        promptRefs.current.forEach((ref, i) => {
          if (ref) {
            const pr = getRelPos(ref, container);
            next.push({
              x1: d.right,
              y1: d.top + (d.height * (i + 0.5)) / count,
              x2: pr.left,
              y2: pr.centerY,
            });
          }
        });
      }

      // Each Prompt → corresponding Image
      promptRefs.current.forEach((pRef, i) => {
        const iRef = imageRefs.current[i];
        if (pRef && iRef) {
          const pr = getRelPos(pRef, container);
          const ir = getRelPos(iRef, container);
          next.push({ x1: pr.right, y1: pr.centerY, x2: ir.left, y2: ir.centerY });
        }
      });

      setLines(next);
    };

    // Wait for layout + images to settle
    const t = setTimeout(calc, 120);
    window.addEventListener("resize", calc);
    return () => { clearTimeout(t); window.removeEventListener("resize", calc); };
  }, []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f2ec", fontFamily: "'Space Grotesk', -apple-system, sans-serif" }}>
      <CanvasTopNav />

      {/* 工作流进度条 */}
      <WorkflowProgress />

      {/* Scrollable canvas area */}
      <div className="scroll-reveal" style={{ flex: 1, overflow: "auto" }}>
        <div
          ref={canvasRef}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            gap: "56px",
            padding: "48px 56px 80px",
            minWidth: "max-content",
            minHeight: "100%",
          }}
        >
          {/* SVG connection line overlay */}
          {svgW > 0 && (
            <svg
              style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 0 }}
              width={svgW}
              height={svgH}
            >
              {lines.map((ln, i) => {
                const mx = (ln.x1 + ln.x2) / 2;
                return (
                  <path
                    key={i}
                    d={`M ${ln.x1} ${ln.y1} C ${mx} ${ln.y1}, ${mx} ${ln.y2}, ${ln.x2} ${ln.y2}`}
                    stroke="#c8b89a"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.7"
                  />
                );
              })}
            </svg>
          )}

          {/* ── Column 1: Product Info ── */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <ProductInfoPanel ref={productRef} />
          </div>

          {/* ── Column 2: Design Plan ── */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <DesignPlanPanel ref={designRef} />
          </div>

          {/* ── Column 3: Prompt boxes ── */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <PromptsPanel promptRefs={promptRefs} />
          </div>

          {/* ── Column 4: Generated images ── */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <ImagesPanel imageRefs={imageRefs} />
          </div>
        </div>
      </div>
    </div>
  );
}

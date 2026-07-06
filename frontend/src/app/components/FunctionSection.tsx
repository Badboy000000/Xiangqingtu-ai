import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Upload, X, ImagePlus, Minus, Plus } from "lucide-react";
import { zh, glass, baseInput, focusIn, focusOut } from "../constants/theme";
import * as api from "../../api";
import { compressImages } from "../../utils/compressImage";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "12px",
          color: "rgba(30,20,32,0.45)",
          marginBottom: "7px",
          fontWeight: 500,
          letterSpacing: "0.04em",
          fontFamily: zh,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function FunctionSection() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [platform, setPlatform] = useState<"domestic" | "overseas">("domestic");
  const [screenCount, setScreenCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // 表单状态
  const [productName, setProductName] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [productSpecs, setProductSpecs] = useState('');
  const [material, setMaterial] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [designRequirements, setDesignRequirements] = useState('');

  const addFiles = useCallback((newFiles: File[]) => {
    const imageFiles = newFiles.filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => {
      const combined = [...prev, ...imageFiles].slice(0, 8);
      // revoke old URLs before creating new ones
      previews.forEach((url) => URL.revokeObjectURL(url));
      const nextUrls = combined.map((f) => URL.createObjectURL(f));
      setPreviews(nextUrls);
      return combined;
    });
  }, [previews]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const removeFile = (i: number) => {
    // revoke the URL being removed
    if (previews[i]) URL.revokeObjectURL(previews[i]);
    const nextFiles = files.filter((_, idx) => idx !== i);
    const nextPreviews = previews.filter((_, idx) => idx !== i);
    setFiles(nextFiles);
    setPreviews(nextPreviews);
  };

  const handleGenerate = async () => {
    if (!productName.trim()) {
      alert('请填写产品名称');
      return;
    }

    console.log('[FunctionSection] Starting workflow...');
    setGenerating(true);
    
    try {
      // 步骤0: 压缩图片（如果超过 18MB）
      let compressedFiles = files;
      if (files.length > 0) {
        console.log('[FunctionSection] Compressing images...');
        compressedFiles = await compressImages(files, 18); // 后端限制是 20MB，留 2MB 余量
        console.log('[FunctionSection] Images compressed:', compressedFiles.map(f => `${f.name}: ${(f.size / 1024 / 1024).toFixed(2)}MB`));
      }
      
      // 步骤1: 创建项目
      const params: api.CreateProjectParams = {
        name: productName,
        platform,
        sellingPoints,
        targetAudience,
        priceRange,
        designRequirements,
        referenceImages: compressedFiles,
        screenCount,
        material,
        productSpecs,
        language: platform === 'overseas' ? 'en' : 'zh-CN',
      };
      
      console.log('[FunctionSection] Creating project with params:', params);
      const project = await api.createProject(params);
      console.log('[FunctionSection] Project created:', project.id);
      
      // 步骤2: 存储 projectId 到 localStorage，供 CanvasPage 使用
      localStorage.setItem('currentProjectId', project.id);
      
      // 步骤3: 立即跳转到工作台
      navigate('/canvas');
      
      // 注意：工作流的实际执行会在 CanvasPage 的 useEffect 中自动触发
      // 这样确保页面跳转完成后才开始流式接收数据
      
    } catch (err: any) {
      console.error('[FunctionSection] Workflow failed:', err);
      alert(err.message || '创建工作流失败');
      setGenerating(false);
    }
  };

  return (
    <section style={{ padding: "0 48px 96px", maxWidth: "1300px", margin: "0 auto" }}>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.2) 25%, rgba(236,72,153,0.15) 75%, transparent 100%)",
          marginBottom: "64px",
        }}
      />

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65 }}
        style={{ textAlign: "center", marginBottom: "44px" }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            color: "#f97316",
            marginBottom: "14px",
            textTransform: "uppercase",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
          }}
        >
          开始创作
        </div>
        <h2
          style={{
            fontSize: "clamp(28px, 3vw, 38px)",
            fontWeight: 800,
            color: "#1e1420",
            lineHeight: 1.25,
            fontFamily: zh,
          }}
        >
          填写产品信息，一键生成
        </h2>
      </motion.div>

      {/* Main glass card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.1 }}
        style={{
          ...glass,
          borderRadius: "28px",
          padding: "36px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "36px",
        }}
      >
        {/* ── Left: Upload ── */}
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "rgba(30,20,32,0.75)",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: zh,
            }}
          >
            <ImagePlus size={15} color="#f97316" />
            上传参考图
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              height: "220px",
              borderRadius: "16px",
              border: `2px dashed ${isDragging ? "rgba(249,115,22,0.6)" : "rgba(180,100,60,0.16)"}`,
              background: isDragging
                ? "rgba(249,115,22,0.05)"
                : "rgba(255,255,255,0.4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.25s ease",
              marginBottom: "18px",
            }}
          >
            <motion.div
              animate={isDragging ? { scale: 1.15 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "14px",
              }}
            >
              <Upload size={22} color="#f97316" />
            </motion.div>
            <div
              style={{
                fontSize: "13px",
                color: "rgba(30,20,32,0.5)",
                marginBottom: "5px",
                fontFamily: zh,
              }}
            >
              {isDragging ? "松开以上传" : "拖拽图片至此处"}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "rgba(30,20,32,0.3)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              或点击选择文件 · PNG / JPG / WebP
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); }}
          />

          {/* Thumbnail strip */}
          {previews.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {previews.map((src, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  style={{ position: "relative" }}
                >
                  <img
                    src={src}
                    alt={`ref-${i}`}
                    style={{
                      width: "72px",
                      height: "72px",
                      objectFit: "cover",
                      borderRadius: "11px",
                      border: "1px solid rgba(180,100,60,0.14)",
                      display: "block",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    style={{
                      position: "absolute",
                      top: "-7px",
                      right: "-7px",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(180,100,60,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "rgba(30,20,32,0.6)",
                      padding: 0,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                    }}
                  >
                    <X size={10} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* Product name */}
          <Field label="产品名称 *">
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="如：索尼 WH-1000XM5 无线降噪耳机"
              style={baseInput}
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </Field>

          {/* Platform toggle */}
          <Field label="针对平台">
            <div style={{ display: "flex", gap: "10px" }}>
              {(
                [
                  ["domestic", "国内（淘宝 / 京东）"],
                  ["overseas", "国外（Amazon / Shopify）"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setPlatform(val)}
                  style={{
                    flex: 1,
                    padding: "10px 8px",
                    borderRadius: "10px",
                    border: `1px solid ${platform === val ? "rgba(249,115,22,0.4)" : "rgba(180,100,60,0.12)"}`,
                    background: platform === val
                      ? "rgba(249,115,22,0.08)"
                      : "rgba(255,255,255,0.6)",
                    color: platform === val ? "#f97316" : "rgba(30,20,32,0.4)",
                    fontSize: "12px",
                    fontWeight: platform === val ? 700 : 400,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    fontFamily: zh,
                    boxShadow: platform === val
                      ? "0 0 0 3px rgba(249,115,22,0.06)"
                      : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {/* Core selling points */}
          <Field label="核心卖点（每行一条）">
            <textarea
              value={sellingPoints}
              onChange={(e) => setSellingPoints(e.target.value)}
              placeholder="如：
行业顶级降噪，40dB 主动降噪深度
30小时超长续航，快充10分钟听歌5小时
轻盈佩戴设计，仅重 250g"
              rows={4}
              style={{ ...baseInput, resize: "vertical", lineHeight: 1.6 }}
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </Field>

          {/* Product specs */}
          <Field label="产品规格参数">
            <textarea
              value={productSpecs}
              onChange={(e) => setProductSpecs(e.target.value)}
              placeholder="如：尺寸 185×170×78mm、重量 250g、蓝牙 5.3、续航 30h、充电接口 USB-C..."
              rows={2}
              style={{ ...baseInput, resize: "vertical", lineHeight: 1.6 }}
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </Field>

          {/* Target audience + price range + material + screen count */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="目标人群">
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="如：25-40 岁职场白领"
                style={baseInput}
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </Field>
            <Field label="价格区间">
              <input
                type="text"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                placeholder="如：¥1,999 - ¥2,499"
                style={baseInput}
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="材质">
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="如：头层牛皮、304不锈钢、纯棉..."
                style={baseInput}
                onFocus={focusIn}
                onBlur={focusOut}
              />
            </Field>
            <Field label="分屏数量">
              <div style={{ display: "flex", alignItems: "center", gap: "0", height: "38px", border: "1px solid rgba(180,100,60,0.15)", borderRadius: "10px", background: "rgba(255,255,255,0.6)", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setScreenCount(c => Math.max(4, c - 1))}
                  disabled={screenCount <= 4}
                  style={{ width: "32px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: screenCount <= 4 ? "not-allowed" : "pointer", color: screenCount <= 4 ? "rgba(30,20,32,0.2)" : "#f97316", padding: 0 }}
                >
                  <Minus size={14} />
                </button>
                <span style={{ flex: 1, textAlign: "center", fontSize: "13px", fontWeight: 700, color: "#1e1420", fontFamily: "'Space Grotesk', sans-serif", userSelect: "none" }}>
                  {screenCount}
                </span>
                <button
                  type="button"
                  onClick={() => setScreenCount(c => Math.min(12, c + 1))}
                  disabled={screenCount >= 12}
                  style={{ width: "32px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: screenCount >= 12 ? "not-allowed" : "pointer", color: screenCount >= 12 ? "rgba(30,20,32,0.2)" : "#f97316", padding: 0 }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </Field>
          </div>

          {/* Design element requirements */}
          <Field label="设计元素要求">
            <textarea
              value={designRequirements}
              onChange={(e) => setDesignRequirements(e.target.value)}
              placeholder="如：清新简约、温暖色调、高端质感、渐变背景..."
              rows={2}
              style={{ ...baseInput, resize: "vertical", lineHeight: 1.6 }}
              onFocus={focusIn}
              onBlur={focusOut}
            />
          </Field>
        </div>
      </motion.div>

      {/* Submit button */}
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        whileHover={
          !generating && !done
            ? {
                scale: 1.015,
                boxShadow:
                  "0 20px 56px rgba(249,115,22,0.28), 0 8px 20px rgba(236,72,153,0.15)",
              }
            : {}
        }
        whileTap={!generating && !done ? { scale: 0.985 } : {}}
        onClick={handleGenerate}
        disabled={generating}
        style={{
          width: "100%",
          marginTop: "20px",
          padding: "18px 0",
          borderRadius: "16px",
          background: done
            ? "linear-gradient(135deg, #22c55e, #16a34a)"
            : "linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)",
          border: "none",
          color: "#fff",
          fontSize: "17px",
          fontWeight: 800,
          cursor: generating ? "not-allowed" : "pointer",
          letterSpacing: "0.06em",
          boxShadow: done
            ? "0 10px 32px rgba(34,197,94,0.2)"
            : "0 12px 40px rgba(249,115,22,0.24), 0 4px 12px rgba(236,72,153,0.12)",
          fontFamily: zh,
          opacity: generating ? 0.75 : 1,
          transition: "background 0.4s ease, box-shadow 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
        }}
      >
        {generating ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-block" }}
            >
              ⟳
            </motion.span>
            AI 生成中，请稍候...
          </>
        ) : done ? (
          "✓ 详情图已生成完成"
        ) : (
          "开始生成详情图 →"
        )}
      </motion.button>
    </section>
  );
}

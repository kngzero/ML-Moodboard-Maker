import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Settings2, LayoutGrid, GripVertical, Download, FileDown, Upload, ImagePlus, RotateCcw, Trash2, Image as ImageIcon, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
// NOTE: Replaced custom Select with a reliable native <select> for desktop (Tauri) compatibility
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import Review from "@/components/Review";

const cx = (...cls) => cls.filter(Boolean).join(" ");
const isTauri = () => typeof window !== "undefined" && (window.__TAURI__ || window.__TAURI_IPC__ || window.__TAURI_INTERNALS__);
/** @typedef {{x:number,y:number,zoom:number}} Crop */
/** @typedef {{id:string, src:string, w?:number, h?:number, crop?:Crop}} BoardImage */
const withDefaultCrop = (img) => ({
  colSpan: img?.colSpan ?? 1,
  rowSpan: img?.rowSpan ?? 1,
  ...img,
  crop: {
    x: img?.crop?.x ?? 50,
    y: img?.crop?.y ?? 50,
    zoom: img?.crop?.zoom ?? 1,
  },
});

export default function MoodboardMaker() {
  const [images, setImages] = useState(/** @type {BoardImage[]} */([]));
  const originalOrderRef = useRef([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [cropOpenId, setCropOpenId] = useState(null);
  const [tempCrop, setTempCrop] = useState({ x: 50, y: 50, zoom: 1 });
  const previewRef = useRef(null);
  const dragStateRef = useRef(null);
  const [boardTitle, setBoardTitle] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [showText, setShowText] = useState(true);
  const [logoSrc, setLogoSrc] = useState(null);
  const [logoSize, setLogoSize] = useState(40);
  const [logoRounded, setLogoRounded] = useState(true);
  const logoInputRef = useRef(null);
  const [gap, setGap] = useState(12);
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(3);
  const [layoutMode, setLayoutMode] = useState("auto");
  const [rounded, setRounded] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [boardPadding, setBoardPadding] = useState(24);
  const [bg, setBg] = useState("#ffffff");
  const [brandingOpen, setBrandingOpen] = useState(true);
  const [layoutOpen, setLayoutOpen] = useState(true);
  const [exportFormat, setExportFormat] = useState("png");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [snapshotting, setSnapshotting] = useState(false);
  const boardRef = useRef(null);
  const fileInputRef = useRef(null);
  const gridRef = useRef(null);
  const spanDragRef = useRef(null);
  const [gridCell, setGridCell] = useState(120);
  const canReorder = layoutMode !== "auto";
  const layoutStyle = useMemo(() => {
    if (layoutMode === "auto") return { columnCount: columns, columnGap: `${gap}px` };
    const base = { display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: `${gap}px` };
    if (layoutMode === "square") return { ...base, gridAutoRows: `${gridCell}px` };
    return base;
  }, [layoutMode, columns, gap, gridCell]);
  const itemStyle = useMemo(() => ({
    marginBottom: layoutMode === "auto" ? `${gap}px` : undefined,
    breakInside: layoutMode === "auto" ? "avoid" : undefined,
    cursor: canReorder ? "grab" : "default",
  }), [gap, layoutMode, canReorder]);

  const onDrop = useCallback(async (evt) => {
    evt.preventDefault();
    const isInternalMove = (evt.dataTransfer.types || []).includes("text/plain");
    if (isInternalMove) return;
    const files = Array.from(evt.dataTransfer.files || []).filter((f) => /image\/(png|jpe?g|webp|gif|bmp|svg)/i.test(f.type));
    if (!files.length) return;
    const newItems = await Promise.all(files.map(readFileAsImage));
    setImages((prev) => {
      const updated = [...prev, ...newItems.map(withDefaultCrop)];
      originalOrderRef.current = [...originalOrderRef.current, ...newItems.map((n) => n.id)];
      return updated;
    });
  }, []);

  const onPaste = useCallback(async (evt) => {
    const items = Array.from(evt.clipboardData.items || []);
    const imagesFromClipboard = await Promise.all(
      items.filter((i) => i.type.startsWith("image/")).map(async (i) => { const f = i.getAsFile(); if (!f) return null; return await readFileAsImage(f); })
    );
    const filtered = imagesFromClipboard.filter(Boolean);
    if (!filtered.length) return;
    setImages((prev) => {
      const updated = [...prev, ...filtered.map(withDefaultCrop)];
      originalOrderRef.current = [...originalOrderRef.current, ...filtered.map((n) => n.id)];
      return updated;
    });
  }, []);

  const onDragOverBoard = (e) => { e.preventDefault(); const t = e.dataTransfer.types || []; if (t.includes("text/plain")) e.dataTransfer.dropEffect = "move"; else if (t.includes("Files")) e.dataTransfer.dropEffect = "copy"; };

  const handleFiles = async (files) => {
    if (!files) return; const arr = await Promise.all(Array.from(files).map(readFileAsImage));
    setImages((prev) => { const updated = [...prev, ...arr.map(withDefaultCrop)]; originalOrderRef.current = [...originalOrderRef.current, ...arr.map((n) => n.id)]; return updated; });
  };

  const addFromUrl = async () => {
    const url = prompt("Paste an image URL"); if (!url) return; const id = crypto.randomUUID(); const dims = await getImageSize(url);
    setImages((prev) => { originalOrderRef.current = [...originalOrderRef.current, id]; return [...prev, withDefaultCrop({ id, src: url, ...dims })]; });
  };

  const clearAll = () => { setImages([]); originalOrderRef.current = []; };
  const removeImage = (id) => { setImages((prev) => prev.filter((i) => i.id !== id)); originalOrderRef.current = originalOrderRef.current.filter((x) => x !== id); };

  const onLogoFiles = async (files) => {
    if (!files?.[0]) return; const file = files[0]; const src = await readFileAsDataURL(file); setLogoSrc(src);
  };

  const onItemDragStart = (id) => (e) => { if (!canReorder) return; setDraggingId(id); e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; };
  const onItemDragOver = (id) => (e) => { if (!canReorder) return; e.preventDefault(); setDragOverId(id); };
  const onItemDrop = (id) => (e) => { if (!canReorder) return; e.preventDefault(); const srcId = e.dataTransfer.getData("text/plain") || draggingId; if (!srcId || srcId === id) return cleanupDrag(); setImages((prev) => moveBefore(prev, srcId, id)); cleanupDrag(); };
  const onItemDragEnd = () => cleanupDrag();
  const cleanupDrag = () => { setDraggingId(null); setDragOverId(null); };
  const resetOrder = () => { if (!originalOrderRef.current.length) return; setImages((prev) => sortByIdOrder(prev, originalOrderRef.current)); };

  function moveBefore(list, srcId, destId) { const s = list.findIndex((i) => i.id === srcId); const d = list.findIndex((i) => i.id === destId); if (s === -1 || d === -1) return list; const copy = [...list]; const [it] = copy.splice(s, 1); const idx = s < d ? d - 1 : d; copy.splice(idx, 0, it); return copy; }
  function sortByIdOrder(list, order) { const pos = new Map(order.map((id, idx) => [id, idx])); return [...list].sort((a, b) => (pos.get(a.id) - pos.get(b.id))); }

  async function withSnapshot(cb) {
    setSnapshotting(true);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try { return await cb(); } finally { setSnapshotting(false); await new Promise((r) => requestAnimationFrame(r)); }
  }
  const exportPNG = async () => {
    if (!boardRef.current) return "";
    return await htmlToImage.toPng(boardRef.current, {
      pixelRatio: 2, cacheBust: true, backgroundColor: bg,
      filter: (node) => !node.closest?.('[data-export-exclude]')
    });
  };
  const exportJPEG = async () => {
    if (!boardRef.current) return "";
    return await htmlToImage.toJpeg(boardRef.current, {
      pixelRatio: 2, quality: 0.95, cacheBust: true, backgroundColor: bg,
      filter: (node) => !node.closest?.('[data-export-exclude]')
    });
  };
  const exportWEBP = async () => {
    if (!boardRef.current) return "";
    const blob = await htmlToImage.toBlob(boardRef.current, {
      pixelRatio: 2, cacheBust: true, backgroundColor: bg,
      filter: (node) => !node.closest?.('[data-export-exclude]')
    });
    return blob ? await blobToDataURL(blob) : "";
  };

  const handleExport = async () => {
    try {
      setExportError(null); setExporting(true);
      const dataUrl = await withSnapshot(async () => {
        let du = "";
        if (exportFormat === "png") du = await exportPNG();
        if (exportFormat === "jpeg") du = await exportJPEG();
        if (exportFormat === "webp") du = await exportWEBP();
        return du;
      });
      if (!dataUrl) throw new Error("Export failed. Try smaller board or local images.");
      if (isTauri()) {
        const bytes = dataUrlToBytes(dataUrl);
        const dialogMod = "@tauri-apps/api/dialog";
        const fsMod = "@tauri-apps/api/fs";
        const { save } = await import(/* @vite-ignore */ dialogMod);
        const { writeBinaryFile } = await import(/* @vite-ignore */ fsMod);
        const path = await save({ defaultPath: `moodboard.${exportFormat}` });
        if (path) await writeBinaryFile({ path, contents: bytes });
      } else {
        downloadDataUrl(dataUrl, `moodboard.${exportFormat}`);
      }
    } catch (err) {
      setExportError((err && (err.message || String(err))) || "Unknown export error");
    } finally { setExporting(false); }
  };

  const exportAsPDF = async () => {
    try {
      setExportError(null); setExporting(true);
      const png = await withSnapshot(() => exportPNG());
      if (!png) throw new Error("Could not render board to image");
      const img = new Image(); img.src = png; await img.decode();
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth(); const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24; const maxW = pageW - margin * 2; const maxH = pageH - margin * 2;
      const scale = Math.min(maxW / img.width, maxH / img.height); const w = img.width * scale; const h = img.height * scale;
      const x = (pageW - w) / 2; const y = (pageH - h) / 2; pdf.addImage(png, "PNG", x, y, w, h);
      if (isTauri()) {
        const dialogMod = "@tauri-apps/api/dialog";
        const fsMod = "@tauri-apps/api/fs";
        const { save } = await import(/* @vite-ignore */ dialogMod);
        const { writeBinaryFile } = await import(/* @vite-ignore */ fsMod);
        const ab = pdf.output("arraybuffer");
        const path = await save({ defaultPath: "moodboard.pdf" });
        if (path) await writeBinaryFile({ path, contents: new Uint8Array(ab) });
      } else { pdf.save("moodboard.pdf"); }
    } catch (err) {
      setExportError((err && (err.message || String(err))) || "Unknown PDF export error");
    } finally { setExporting(false); }
  };

  function downloadDataUrl(dataUrl, filename) { const a = document.createElement("a"); a.href = dataUrl; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); }
  async function blobToDataURL(blob) { return await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); }); }
  function dataUrlToBytes(dataUrl) { const [meta, b64] = dataUrl.split(","); const bin = atob(b64); const bytes = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i); return bytes; }
  async function readFileAsDataURL(file){ return await new Promise((res, rej)=>{ const fr = new FileReader(); fr.onload = ()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); }); }
  async function readFileAsImage(file) { const src = await readFileAsDataURL(file); const { w, h } = await getImageSize(src); return { id: crypto.randomUUID(), src, w, h }; }
  async function getImageSize(src){ return await new Promise((resolve, reject)=>{ const img = new Image(); img.onload = ()=>resolve({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = reject; img.src = src; }); }
  useEffect(() => { const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); handleExport(); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [exportFormat]);
  const openCrop = (id) => { const img = images.find((i) => i.id === id); const c = withDefaultCrop(img).crop; setTempCrop({ ...c }); setCropOpenId(id); };
  const closeCrop = () => setCropOpenId(null);
  const applyCrop = () => { if (!cropOpenId) return; setImages((prev) => prev.map((im) => (im.id === cropOpenId ? { ...im, crop: { ...tempCrop } } : im))); setCropOpenId(null); };
  const onPreviewMouseDown = (e) => { if (!previewRef.current) return; dragStateRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, startCrop: { ...tempCrop } }; };
  const onPreviewMouseMove = (e) => { const st = dragStateRef.current; if (!st || !st.dragging || !previewRef.current) return; const box = previewRef.current.getBoundingClientRect(); const dx = ((e.clientX - st.startX) / box.width) * 100; const dy = ((e.clientY - st.startY) / box.height) * 100; setTempCrop((c) => ({ ...c, x: clamp(st.startCrop.x + dx, 0, 100), y: clamp(st.startCrop.y + dy, 0, 100) })); };
  const onPreviewMouseUpLeave = () => { if (dragStateRef.current) dragStateRef.current.dragging = false; };
  useEffect(() => { const el = previewRef.current; if (!el) return; const onWheel = (e) => { e.preventDefault(); setTempCrop((c) => ({ ...c, zoom: clamp((c.zoom || 1) + (e.deltaY > 0 ? -0.05 : 0.05), 1, 4) })); }; el.addEventListener("wheel", onWheel, { passive: false }); return () => el.removeEventListener("wheel", onWheel); }, [cropOpenId]);
  useEffect(() => { const onKey = (e) => { if (!cropOpenId) return; if (e.key === "Escape") return closeCrop(); if (e.key === "Enter") return applyCrop(); const step = e.shiftKey ? 2 : 0.5; if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) { e.preventDefault(); setTempCrop((c) => ({ ...c, x: clamp(c.x + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0), 0, 100), y: clamp(c.y + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0), 0, 100) })); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [cropOpenId]);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const SelectBox = ({ value, onChange, children }) => (<select className="input" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>);
  function onResizeStart(id){ return (e)=>{ if(layoutMode !== "square") return; const it = images.find(i=>i.id===id); if(!it) return; spanDragRef.current = { id, sx: e.clientX, sy: e.clientY, baseC: it.colSpan || 1, baseR: it.rowSpan || 1 }; window.addEventListener("mousemove", onResizing); window.addEventListener("mouseup", onResizeEnd); }; }
  function onResizing(e){ const st = spanDragRef.current; if(!st) return; const cell = getCellPx(); const dx = e.clientX - st.sx, dy = e.clientY - st.sy; const addC = Math.round(dx / (cell + gap)); const addR = Math.round(dy / (cell + gap)); const nc = Math.max(1, Math.min(columns, (st.baseC || 1) + addC)); const nr = Math.max(1, (st.baseR || 1) + addR); setImages(prev => prev.map(i => i.id===st.id ? { ...i, colSpan: nc, rowSpan: nr } : i)); }
  function onResizeEnd(){ window.removeEventListener("mousemove", onResizing); window.removeEventListener("mouseup", onResizeEnd); spanDragRef.current = null; }
  function getCellPx(){ const el = gridRef.current; if(!el) return gridCell; const w = el.clientWidth || 600; const cell = Math.max(40, Math.floor((w - gap*(columns - 1)) / columns)); return cell; }
  useEffect(()=>{ function update(){ setGridCell(getCellPx()); } update(); const ro = new ResizeObserver(update); if(gridRef.current) ro.observe(gridRef.current); window.addEventListener("resize", update); return ()=>{ window.removeEventListener("resize", update); ro.disconnect(); }; }, [columns, gap]);

  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <Card className="sticky top-6 h-fit shadow-lg rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-xl"><Settings2 className="h-5 w-5"/> Moodboard Settings</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <button type="button" className="w-full flex items-center justify-between px-0 py-1" onClick={() => setBrandingOpen((v) => !v)} aria-expanded={brandingOpen}>
                <span className="flex items-center gap-2 text-sm"><ImageIcon className="h-4 w-4"/>Branding</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2"><Switch checked={showText} onCheckedChange={setShowText} id="showText"/><Label htmlFor="showText" className="text-sm">Show</Label></div>
                  {brandingOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                </div>
              </button>
              {brandingOpen && (<>
                <div className="space-y-3">
                  <Input placeholder="Board title" value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} />
                  <Input placeholder="Short description" value={boardDescription} onChange={(e) => setBoardDescription(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => logoInputRef.current?.click()}>Upload Logo</Button>
                    {logoSrc && <Button variant="ghost" onClick={() => setLogoSrc(null)}>Remove</Button>}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogoFiles(e.target.files)} />
                  {logoSrc && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-sm">Logo size</Label><Slider min={16} max={128} step={1} value={[logoSize]} onValueChange={([v]) => setLogoSize(v)} /><div className="text-xs text-neutral-500">{logoSize}px</div></div>
                      <div className="flex items-center gap-2 mt-6"><Switch checked={logoRounded} onCheckedChange={setLogoRounded} id="logoRound"/><Label htmlFor="logoRound">Rounded</Label></div>
                    </div>
                  )}
                </div>
              </>)}
            </div>
            <div className="space-y-4">
              <button type="button" className="w-full flex items-center justify-between px-0 py-1" onClick={() => setLayoutOpen((v) => !v)} aria-expanded={layoutOpen}>
                <span className="flex items-center gap-2 text-sm"><LayoutGrid className="h-4 w-4"/>Layout</span>
                {layoutOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
              </button>
              {layoutOpen && (<>
                <div className="space-y-2">
                  <Label className="text-sm">Layout mode</Label>
                  <SelectBox value={layoutMode} onChange={setLayoutMode}>
                    <option value="auto">Automatic (Masonry)</option>
                    <option value="grid">Grid (Rows × Columns)</option>
                    <option value="square">Flexible grid (resizable tiles)</option>
                  </SelectBox>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Columns</Label>
                    <div className="px-1"><Slider min={1} max={12} step={1} value={[columns]} onValueChange={([v]) => setColumns(v)} /></div>
                    <div className="text-xs text-neutral-500">{columns} column(s)</div>
                  </div>
                  <div className={cx("space-y-2", layoutMode !== "grid" ? "opacity-50 pointer-events-none" : "")}>
                    <Label className="text-sm">Rows (visual)</Label>
                    <div className="px-1"><Slider min={1} max={12} step={1} value={[rows]} onValueChange={([v]) => setRows(v)} /></div>
                    <div className="text-xs text-neutral-500">{rows} row units</div>
                  </div>
                </div>
                <div className="space-y-2"><Label className="text-sm">Gaps</Label><div className="px-1"><Slider min={0} max={48} step={1} value={[gap]} onValueChange={([v]) => setGap(v)} /></div><div className="text-xs text-neutral-500">{gap}px</div></div>
                <div className="space-y-2"><Label className="text-sm">Board padding</Label><div className="px-1"><Slider min={0} max={96} step={2} value={[boardPadding]} onValueChange={([v]) => setBoardPadding(v)} /></div><div className="text-xs text-neutral-500">{boardPadding}px</div></div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><Switch checked={rounded} onCheckedChange={setRounded} id="rounded"/><Label htmlFor="rounded">Rounded corners</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={shadow} onCheckedChange={setShadow} id="shadow"/><Label htmlFor="shadow">Soft shadow</Label></div>
                </div>
                <div className="space-y-2"><Label className="text-sm">Background</Label><div className="flex items-center gap-3"><Input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="w-16 h-10 p-1 cursor-pointer"/><Input type="text" value={bg} onChange={(e) => setBg(e.target.value)} /></div></div>
              </>)}
            </div>
            <div className="space-y-3">
              <Label className="text-sm">Export</Label>
              <div className="grid grid-cols-2 gap-3">
                <SelectBox value={exportFormat} onChange={setExportFormat}>
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WEBP</option>
                </SelectBox>
                <Button onClick={handleExport} className="w-full" variant="default"><Download className="h-4 w-4 mr-2"/>Save Image</Button>
                <div className="col-span-2"><Button onClick={exportAsPDF} variant="secondary" className="w-full"><FileDown className="h-4 w-4 mr-2"/>Save as PDF</Button></div>
                {exportError && <div className="col-span-2 text-xs text-red-600">{exportError}</div>}
              </div>
              <p className="text-xs text-neutral-500">Tip: Press ⌘/Ctrl + S to quick-save using the selected image format.</p>
            </div>
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm">Manage</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full"><Upload className="h-4 w-4 mr-2"/>Add Images</Button>
                <Button variant="outline" onClick={addFromUrl} className="w-full"><ImagePlus className="h-4 w-4 mr-2"/>From URL</Button>
                <Button variant="ghost" onClick={resetOrder} className="w-full"><RotateCcw className="h-4 w-4 mr-2"/>Reset Order</Button>
                <Button variant="destructive" onClick={clearAll} className="w-full"><Trash2 className="h-4 w-4 mr-2"/>Clear All</Button>
              </div>
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Drag & Drop Moodboard</h1>
            <div className="text-sm text-neutral-500">Drop images • Paste • {canReorder ? "Drag tiles to reorder" : "Switch to Grid or Square to reorder"} • Reset order</div>
          </div>
          <Card className="rounded-2xl shadow-xl">
            <CardContent className="p-4 md:p-6">
              <div className={cx("relative w-full min-h-[60vh] bg-white/90 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl", images.length === 0 ? "grid place-items-center" : "")} onDrop={onDrop} onDragOver={onDragOverBoard} onPaste={onPaste}>
                {images.length === 0 && (<div className="text-center p-8"><div className="text-sm text-neutral-500 mb-3">Drop images here, paste from clipboard, or use “Add Images”.</div><Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Select Files</Button></div>)}
                <div ref={boardRef} className="w-full" style={{ background: bg, padding: boardPadding }}>
                  {showText && (boardTitle || boardDescription || logoSrc) && (
                    <header className="mb-6 flex items-center gap-3">
                      {logoSrc && (<img src={logoSrc} alt="logo" style={{ width: logoSize, height: logoSize, borderRadius: logoRounded ? "9999px" : "12px" }} className="shrink-0 object-cover" />)}
                      <div>
                        {boardTitle && <h2 className="text-2xl font-semibold leading-tight mb-1">{boardTitle}</h2>}
                        {boardDescription && <p className="text-sm text-neutral-600 dark:text-neutral-300">{boardDescription}</p>}
                      </div>
                    </header>
                  )}
                  <div ref={gridRef} style={layoutStyle} className="w-full">
                    {images.map((img) => {
                      const crop = withDefaultCrop(img).crop;
                      const figureBase = cx("relative inline-block w-full overflow-hidden group", rounded ? "rounded-xl" : "", shadow ? "shadow-sm" : "", draggingId === img.id ? "opacity-70" : "", dragOverId === img.id ? "ring-2 ring-neutral-400" : "");
                      return (
                        <figure key={img.id} style={{...itemStyle, ...(layoutMode === "square" ? { gridColumnEnd: `span ${img.colSpan || 1}`, gridRowEnd: `span ${img.rowSpan || 1}`, height: (gridCell * (img.rowSpan || 1)) + (gap * ((img.rowSpan || 1) - 1)) } : {}), borderRadius: rounded ? 12 : 0, boxShadow: shadow ? "0 8px 24px rgba(0,0,0,.08)" : "none", backgroundColor: "#fff"}} className={figureBase} draggable={canReorder} onDragStart={onItemDragStart(img.id)} onDragOver={onItemDragOver(img.id)} onDrop={onItemDrop(img.id)} onDragEnd={onItemDragEnd}>
                          {canReorder && (<div data-export-exclude className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] bg-white/80 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity"><GripVertical className="h-3 w-3"/>Drag to reorder</div>)}
                          {layoutMode === "square" ? (<img src={img.src} alt="mood" className="block w-full h-full select-none object-cover" style={{ objectPosition: `${crop.x}% ${crop.y}%`, transform: `scale(${crop.zoom})`, transformOrigin: "center center" }} draggable={false}/>) : (<img src={img.src} alt="mood" className={cx("block w-full h-auto select-none", layoutMode === "grid" ? "object-cover" : "")} style={layoutMode === "grid" ? { aspectRatio: `${img.w || 4} / ${img.h || 3}` } : undefined} draggable={false}/>)}
                          <div data-export-exclude className="absolute inset-x-2 top-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {layoutMode === "square" && (<Button size="sm" variant="secondary" className="h-8" onClick={() => openCrop(img.id)}>Crop</Button>)}
                            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => removeImage(img.id)}><Trash2 className="h-4 w-4"/></Button>
                          </div>
                          {layoutMode === "square" && (
                            <div data-export-exclude onMouseDown={(e)=>{ e.preventDefault(); e.stopPropagation(); onResizeStart(img.id)(e); }} title={`${img.colSpan||1}×${img.rowSpan||1}`} style={{ position:"absolute", right:6, bottom:6, width:22, height:22, borderRadius:6, background:"#fff", border:"1px solid #ddd", display:"grid", placeItems:"center", fontSize:12, cursor:"nwse-resize" }}>⇲</div>
                          )}
                        </figure>
                      );
                    })}
                  </div>
                </div>
                {exporting && (<div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70 dark:bg-black/50 text-sm">Exporting…</div>)}
              </div>
            </CardContent>
          </Card>
          <Review />
        </div>
      </div>
      {cropOpenId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onMouseUp={onPreviewMouseUpLeave} onMouseLeave={onPreviewMouseUpLeave}>
          <div className="w-full max-w-[720px] bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Adjust Crop</h3><div className="flex items-center gap-2"><Button variant="ghost" onClick={closeCrop}>Cancel</Button><Button variant="default" onClick={applyCrop}>Apply</Button></div></div>
            <div ref={previewRef} className="mx-auto mb-4 w-[420px] h-[420px] bg-neutral-100 dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 cursor-grab" onMouseDown={onPreviewMouseDown} onMouseMove={onPreviewMouseMove}>
              {(() => { const img = images.find((i) => i.id === cropOpenId); if (!img) return null; return (<img src={img.src} alt="preview" className="w-full h-full object-cover select-none" style={{ objectPosition: `${tempCrop.x}% ${tempCrop.y}%`, transform: `scale(${tempCrop.zoom})`, transformOrigin: "center center" }} draggable={false}/>); })()}
            </div>
            <div className="space-y-3">
              <div><Label className="text-xs">Zoom</Label><Slider min={1} max={4} step={0.01} value={[tempCrop.zoom]} onValueChange={([v]) => setTempCrop((c) => ({ ...c, zoom: v }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">X Position</Label><Slider min={0} max={100} step={0.5} value={[tempCrop.x]} onValueChange={([v]) => setTempCrop((c) => ({ ...c, x: v }))} /></div>
                <div><Label className="text-xs">Y Position</Label><Slider min={0} max={100} step={0.5} value={[tempCrop.y]} onValueChange={([v]) => setTempCrop((c) => ({ ...c, y: v }))} /></div>
              </div>
              <p className="text-[11px] text-neutral-500">Tip: drag to pan • scroll to zoom • arrows to nudge</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

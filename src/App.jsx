import React, { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { LayoutGrid, GripVertical, Download, FileDown, Upload, ImagePlus, RotateCcw, Trash2, Image as ImageIcon, ChevronDown, ChevronRight, HelpCircle, X, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
// NOTE: Replaced custom Select with a reliable native <select> for desktop (Tauri) compatibility
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import Review from "@/components/Review";
import AssetPanel from "@/components/AssetPanel";
import SettingsDrawer from "@/components/SettingsDrawer";
import TemplateSelector, { TEMPLATES } from "@/components/TemplateSelector";
import SafeMarginOverlay from "@/components/SafeMarginOverlay";
import VirtualImage from "@/components/VirtualImage";
import pkg from "../package.json";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";

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

const BRANDING_PRESETS = {
  "left-s": {
    header: "flex items-center gap-3 text-left",
    logo: 32,
    title: "text-xl",
    desc: "text-xs",
  },
  "left-m": {
    header: "flex items-center gap-3 text-left",
    logo: 40,
    title: "text-2xl",
    desc: "text-sm",
  },
  "center-s": {
    header: "flex flex-col items-center gap-3 text-center",
    logo: 32,
    title: "text-xl",
    desc: "text-xs",
  },
  "center-m": {
    header: "flex flex-col items-center gap-3 text-center",
    logo: 40,
    title: "text-2xl",
    desc: "text-sm",
  },
};

export default function MethodMosaic() {
  const [images, setImages] = useState(/** @type {BoardImage[]} */([]));
  const [assets, setAssets] = useState([]);
  const [assetPanelOpen, setAssetPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
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
  const [logoSize, setLogoSize] = useState(BRANDING_PRESETS["left-m"].logo);
  const [logoRounded, setLogoRounded] = useState(true);
  const logoInputRef = useRef(null);
  const [brandingPreset, setBrandingPreset] = useState("left-m");
  const [titleClass, setTitleClass] = useState(BRANDING_PRESETS["left-m"].title);
  const [descClass, setDescClass] = useState(BRANDING_PRESETS["left-m"].desc);
  const [gap, setGap] = useState(12);
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(3);
  const [layoutMode, setLayoutMode] = useState("auto");
  const [rounded, setRounded] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [showSafeMargin, setShowSafeMargin] = useState(false);
  const [boardPadding, setBoardPadding] = useState(24);
  const [selectedTemplate, setSelectedTemplate] = useState("custom");
  const [boardWidth, setBoardWidth] = useState(null);
  const [boardHeight, setBoardHeight] = useState(null);
  const [boardAspect, setBoardAspect] = useState(undefined);
  const [zoom, setZoom] = useState(100);
  const [bg, setBg] = useState("#ffffff");
  const [brandingOpen, setBrandingOpen] = useState(true);
  const [layoutOpen, setLayoutOpen] = useState(true);
  const [exportFormat, setExportFormat] = useState("png");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [snapshotting, setSnapshotting] = useState(false);
  const [renderAllImages, setRenderAllImages] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const boardRef = useRef(null);
  const fileInputRef = useRef(null);
  const boardFileRef = useRef(null);
  const gridRef = useRef(null);
  const spanDragRef = useRef(null);
  const infoButtonRef = useRef(null);
  const infoRef = useRef(null);
  const headerRef = useRef(null);
  const [gridCell, setGridCell] = useState(120);
  const canReorder = layoutMode !== "auto";

  useEffect(() => {
    const stored = localStorage.getItem("assets");
    if (stored) {
      try { setAssets(JSON.parse(stored)); } catch {}
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("assets", JSON.stringify(assets));
    } catch (err) {
      if (err && (err.name === "QuotaExceededError" || err.code === 22)) {
        if (!isTauri()) {
          // alert("Storage limit reached. Please remove some images to continue.");
        }
        console.warn("Failed to persist assets: storage quota exceeded");
      } else {
        console.warn("Failed to persist assets", err);
      }
    }
  }, [assets]);

  useEffect(() => {
    const preset = BRANDING_PRESETS[brandingPreset];
    if (preset) {
      setLogoSize(preset.logo);
      setTitleClass(preset.title);
      setDescClass(preset.desc);
    }
  }, [brandingPreset]);

  useEffect(() => {
    const handleClick = (e) => {
      if (!infoOpen) return;
      const dropdownEl = infoRef.current;
      const buttonEl = infoButtonRef.current;
      if (
        dropdownEl && !dropdownEl.contains(e.target) &&
        buttonEl && !buttonEl.contains(e.target)
      ) {
        setInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [infoOpen]);

  useLayoutEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        document.documentElement.style.setProperty("--header-height", `${headerRef.current.offsetHeight}px`);
      }
    };
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, []);
  const layoutStyle = useMemo(() => {
    if (layoutMode === "auto") return { columnCount: columns, columnGap: `${gap}px` };
    const base = { display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: `${gap}px` };
    if (layoutMode === "square") return { ...base, gridAutoRows: `${gridCell}px` };
    if (layoutMode === "grid") return { ...base, gridTemplateRows: `repeat(${rows}, 1fr)` };
    return base;
  }, [layoutMode, columns, gap, gridCell, rows]);
  const itemStyle = useMemo(() => ({
    marginBottom: layoutMode === "auto" ? `${gap}px` : undefined,
    breakInside: layoutMode === "auto" ? "avoid" : undefined,
    cursor: canReorder ? "grab" : "default",
  }), [gap, layoutMode, canReorder]);

  const addImageFromAsset = useCallback((asset) => {
    setImages((prev) => {
      const id = crypto.randomUUID();
      const boardImg = withDefaultCrop({ id, src: asset.src, w: asset.w, h: asset.h, assetId: asset.id });
      originalOrderRef.current = [...originalOrderRef.current, id];
      return [...prev, boardImg];
    });
  }, []);

  const onDrop = useCallback(async (evt) => {
    evt.preventDefault();
    const assetId = evt.dataTransfer.getData("application/x-asset-id");
    if (assetId) {
      const asset = assets.find((a) => a.id === assetId);
      if (asset) addImageFromAsset(asset);
      return;
    }
    const isInternalMove = (evt.dataTransfer.types || []).includes("text/plain");
    if (isInternalMove) return;
    const files = Array.from(evt.dataTransfer.files || []).filter((f) => /image\/(png|jpe?g|webp|gif|bmp|svg)/i.test(f.type));
    if (!files.length) return;
    const newAssets = await Promise.all(files.map(readFileAsAsset));
    setAssets((prev) => [...prev, ...newAssets]);
    newAssets.forEach(addImageFromAsset);
  }, [assets, addImageFromAsset]);

  const onPaste = useCallback(async (evt) => {
    const items = Array.from(evt.clipboardData.items || []);
    const assetsFromClipboard = await Promise.all(
      items.filter((i) => i.type.startsWith("image/")).map(async (i) => { const f = i.getAsFile(); if (!f) return null; return await readFileAsAsset(f); })
    );
    const filtered = assetsFromClipboard.filter(Boolean);
    if (!filtered.length) return;
    setAssets((prev) => [...prev, ...filtered]);
    filtered.forEach(addImageFromAsset);
  }, [addImageFromAsset]);

  const onDragOverBoard = (e) => {
    e.preventDefault();
    const t = e.dataTransfer.types || [];
    if (t.includes("text/plain")) e.dataTransfer.dropEffect = "move";
    else if (t.includes("Files") || t.includes("application/x-asset-id")) e.dataTransfer.dropEffect = "copy";
  };

  const handleFiles = async (files) => {
    if (!files) return;
    const arr = await Promise.all(Array.from(files).map(readFileAsAsset));
    setAssets((prev) => [...prev, ...arr]);
    arr.forEach(addImageFromAsset);
  };

  const addFromUrl = async () => {
    const url = prompt("Paste an image URL");
    if (!url) return;
    let src = url;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      src = await readFileAsDataURL(blob);
    } catch (err) {
      if (!isTauri()) alert("Couldn't fetch image; it may be blocked by CORS.");
    }
    const dims = await getImageSize(src);
    const asset = { id: crypto.randomUUID(), src, ...dims, name: url.split("/").pop() || "image" };
    setAssets((prev) => [...prev, asset]);
    addImageFromAsset(asset);
  };

  const replaceImage = async (id) => {
    const useUrl = confirm("Replace with image URL? Click Cancel to select a local file.");
    if (useUrl) {
      const url = prompt("Paste an image URL");
      if (!url) return;
      let src = url;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        src = await readFileAsDataURL(blob);
      } catch (err) {
        if (!isTauri()) alert("Couldn't fetch image; it may be blocked by CORS.");
      }
      const { w, h } = await getImageSize(src);
      const asset = { id: crypto.randomUUID(), src, w, h, name: url.split("/").pop() || "image" };
      setAssets((prev) => [...prev, asset]);
      setImages((prev) => prev.map((im) => im.id === id ? withDefaultCrop({ ...im, src, w, h, assetId: asset.id }) : im));
      return;
    }
    await new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) { resolve(); return; }
        const asset = await readFileAsAsset(file);
        setAssets((prev) => [...prev, asset]);
        setImages((prev) => prev.map((im) => im.id === id ? withDefaultCrop({ ...im, src: asset.src, w: asset.w, h: asset.h, assetId: asset.id }) : im));
        resolve();
      };
      input.click();
    });
  };

  const clearAll = () => { setImages([]); originalOrderRef.current = []; };
  const removeImage = (id) => { setImages((prev) => prev.filter((i) => i.id !== id)); originalOrderRef.current = originalOrderRef.current.filter((x) => x !== id); };
  const removeAsset = (id) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setImages((prev) => prev.filter((i) => i.assetId !== id));
    originalOrderRef.current = originalOrderRef.current.filter((x) => {
      const img = images.find((i) => i.id === x);
      return img && img.assetId !== id;
    });
  };
  const clearAssets = () => {
    setAssets([]);
    clearAll();
  };

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
    setRenderAllImages(true);
    const prevZoom = zoom;
    setZoom(100);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const node = boardRef.current;
    let width = 0;
    let height = 0;
    let prev = { width: "", height: "" };
    if (node) {
      prev = { width: node.style.width, height: node.style.height };
      width = boardWidth || node.clientWidth;
      if (boardHeight) height = boardHeight; else if (boardAspect) height = Math.round(width / boardAspect); else height = node.clientHeight;
      node.style.width = `${width}px`;
      node.style.height = `${height}px`;
    }
    try {
      return await cb({ width, height });
    } finally {
      if (node) {
        node.style.width = prev.width;
        node.style.height = prev.height;
      }
      setZoom(prevZoom);
      setSnapshotting(false);
      setRenderAllImages(false);
      await new Promise((r) => requestAnimationFrame(r));
    }
  }
  const exportPNG = async ({ width, height }) => {
    if (!boardRef.current) return "";
    return await htmlToImage.toPng(boardRef.current, {
      pixelRatio: 2, cacheBust: true, backgroundColor: bg, width, height,
      filter: (node) => !node.closest?.('[data-export-exclude]')
    });
  };
  const exportJPEG = async ({ width, height }) => {
    if (!boardRef.current) return "";
    return await htmlToImage.toJpeg(boardRef.current, {
      pixelRatio: 2, quality: 0.95, cacheBust: true, backgroundColor: bg, width, height,
      filter: (node) => !node.closest?.('[data-export-exclude]')
    });
  };
  const exportWEBP = async ({ width, height }) => {
    if (!boardRef.current) return "";
    const blob = await htmlToImage.toBlob(boardRef.current, {
      pixelRatio: 2, cacheBust: true, backgroundColor: bg, width, height,
      filter: (node) => !node.closest?.('[data-export-exclude]')
    });
    return blob ? await blobToDataURL(blob) : "";
  };

  const handleExport = useCallback(async () => {
    try {
      setExportError(null);
      setExporting(true);
      const dataUrl = await withSnapshot(async (size) => {
        let du = "";
        if (exportFormat === "png") du = await exportPNG(size);
        if (exportFormat === "jpeg") du = await exportJPEG(size);
        if (exportFormat === "webp") du = await exportWEBP(size);
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
    } finally {
      setExporting(false);
    }
  }, [exportFormat, bg, boardWidth, boardHeight, boardAspect]);

  const exportAsPDF = async () => {
    try {
      setExportError(null); setExporting(true);
      const { dataUrl: png, width, height } = await withSnapshot(async (size) => ({ dataUrl: await exportPNG(size), ...size }));
      if (!png) throw new Error("Could not render board to image");
      const orientation = width >= height ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "px", format: [width, height] });
      pdf.addImage(png, "PNG", 0, 0, width, height);
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
  function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); }
  function dataUrlToUint8(dataUrl) { const [meta, b64] = dataUrl.split(","); const mime = /data:(.*?);base64/.exec(meta)?.[1] || "application/octet-stream"; const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const ext = mime.split("/")[1] || "bin"; return { u8, mime, ext }; }
  function uint8ToDataUrl(u8, mime) { let bin = ""; for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]); return `data:${mime};base64,${btoa(bin)}`; }
  function extToMime(ext) { ext = ext.toLowerCase(); if (ext === "jpg" || ext === "jpeg") return "image/jpeg"; if (ext === "png") return "image/png"; if (ext === "webp") return "image/webp"; if (ext === "gif") return "image/gif"; if (ext === "bmp") return "image/bmp"; if (ext === "svg") return "image/svg+xml"; return "application/octet-stream"; }
  async function readFileAsDataURL(file){ return await new Promise((res, rej)=>{ const fr = new FileReader(); fr.onload = ()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); }); }
  async function readFileAsAsset(file) {
    const src = await readFileAsDataURL(file);
    const { w, h } = await getImageSize(src);
    return { id: crypto.randomUUID(), src, w, h, name: file.name || "image" };
  }
  async function getImageSize(src){ return await new Promise((resolve, reject)=>{ const img = new Image(); img.onload = ()=>resolve({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = reject; img.src = src; }); }
  const saveBoardFile = async () => { try { const files = {}; const assetMeta = []; assets.forEach((a) => { const { u8, ext } = dataUrlToUint8(a.src); const fname = `${a.id}.${ext}`; files[`assets/${fname}`] = u8; assetMeta.push({ id: a.id, name: a.name, w: a.w, h: a.h, file: fname }); }); let logoMeta = null; if (logoSrc) { const { u8, ext } = dataUrlToUint8(logoSrc); const fname = `logo.${ext}`; files[`assets/${fname}`] = u8; logoMeta = { file: fname, size: logoSize, rounded: logoRounded }; } const meta = { schema: 1, appVersion: pkg.version, board: { title: boardTitle, description: boardDescription, showText, gap, columns, rows, layoutMode, rounded, shadow, showSafeMargin, boardPadding, boardWidth, boardHeight, boardAspect, zoom, bg, selectedTemplate, images: images.map(({ id, assetId, colSpan, rowSpan, crop }) => ({ id, assetId, colSpan, rowSpan, crop })), logo: logoMeta }, assets: assetMeta }; files["meta.json"] = strToU8(JSON.stringify(meta, null, 2)); const zipped = zipSync(files, { level: 0 }); if (isTauri()) { const dialogMod = "@tauri-apps/api/dialog"; const fsMod = "@tauri-apps/api/fs"; const { save } = await import(/* @vite-ignore */ dialogMod); const { writeBinaryFile } = await import(/* @vite-ignore */ fsMod); const path = await save({ defaultPath: `${boardTitle || "board"}.mlmboard` }); if (path) await writeBinaryFile({ path, contents: zipped }); } else { downloadBlob(new Blob([zipped], { type: "application/zip" }), `${boardTitle || "board"}.mlmboard`); } } catch (err) { console.error("Failed to save board", err); } };
  const loadBoardFile = async (file) => { try { const u8 = new Uint8Array(await file.arrayBuffer()); const files = unzipSync(u8); const meta = JSON.parse(strFromU8(files["meta.json"])); if (!meta.schema || meta.schema > 1) { alert("Unsupported board file version"); return; } const loadedAssets = []; (meta.assets || []).forEach((a) => { const data = files[`assets/${a.file}`]; if (!data) return; const mime = extToMime(a.file.split('.').pop() || ""); const src = uint8ToDataUrl(data, mime); loadedAssets.push({ id: a.id, src, w: a.w, h: a.h, name: a.name }); }); setAssets(loadedAssets); setImages((meta.board?.images || []).map((img) => { const asset = loadedAssets.find((a) => a.id === img.assetId); return withDefaultCrop({ ...img, src: asset?.src, w: asset?.w, h: asset?.h }); })); originalOrderRef.current = (meta.board?.images || []).map((i) => i.id); setBoardTitle(meta.board?.title || ""); setBoardDescription(meta.board?.description || ""); setShowText(!!meta.board?.showText); setGap(meta.board?.gap ?? 12); setColumns(meta.board?.columns ?? 4); setRows(meta.board?.rows ?? 3); setLayoutMode(meta.board?.layoutMode || "auto"); setRounded(meta.board?.rounded ?? true); setShadow(meta.board?.shadow ?? true); setShowSafeMargin(!!meta.board?.showSafeMargin); setBoardPadding(meta.board?.boardPadding ?? 24); setBoardWidth(meta.board?.boardWidth ?? null); setBoardHeight(meta.board?.boardHeight ?? null); setBoardAspect(meta.board?.boardAspect); setZoom(meta.board?.zoom ?? 100); setBg(meta.board?.bg || "#ffffff"); setSelectedTemplate(meta.board?.selectedTemplate || "custom"); if (meta.board?.logo && meta.board.logo.file) { const data = files[`assets/${meta.board.logo.file}`]; if (data) { const mime = extToMime(meta.board.logo.file.split('.').pop() || ""); setLogoSrc(uint8ToDataUrl(data, mime)); setLogoSize(meta.board.logo.size ?? 40); setLogoRounded(meta.board.logo.rounded ?? true); } } else setLogoSrc(null); } catch (err) { console.error("Failed to load board", err); } };
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleExport();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleExport]);
  const openCrop = (id) => { const img = images.find((i) => i.id === id); const c = withDefaultCrop(img).crop; setTempCrop({ ...c }); setCropOpenId(id); };
  const closeCrop = useCallback(() => setCropOpenId(null), []);
  const applyCrop = useCallback(() => {
    if (!cropOpenId) return;
    setImages((prev) =>
      prev.map((im) => (im.id === cropOpenId ? { ...im, crop: { ...tempCrop } } : im))
    );
    setCropOpenId(null);
  }, [cropOpenId, tempCrop]);
  const onPreviewMouseDown = (e) => { if (!previewRef.current) return; dragStateRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, startCrop: { ...tempCrop } }; };
  const onPreviewMouseMove = (e) => { const st = dragStateRef.current; if (!st || !st.dragging || !previewRef.current) return; const box = previewRef.current.getBoundingClientRect(); const dx = ((e.clientX - st.startX) / box.width) * 100; const dy = ((e.clientY - st.startY) / box.height) * 100; setTempCrop((c) => ({ ...c, x: clamp(st.startCrop.x + dx, 0, 100), y: clamp(st.startCrop.y + dy, 0, 100) })); };
  const onPreviewMouseUpLeave = () => { if (dragStateRef.current) dragStateRef.current.dragging = false; };
  useEffect(() => { const el = previewRef.current; if (!el) return; const onWheel = (e) => { e.preventDefault(); setTempCrop((c) => ({ ...c, zoom: clamp((c.zoom || 1) + (e.deltaY > 0 ? -0.05 : 0.05), 1, 4) })); }; el.addEventListener("wheel", onWheel, { passive: false }); return () => el.removeEventListener("wheel", onWheel); }, [cropOpenId]);
  useEffect(() => {
    const onKey = (e) => {
      if (!cropOpenId) return;
      if (e.key === "Escape") return closeCrop();
      if (e.key === "Enter") return applyCrop();
      const step = e.shiftKey ? 2 : 0.5;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        setTempCrop((c) => ({
          ...c,
          x: clamp(c.x + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0), 0, 100),
          y: clamp(c.y + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0), 0, 100),
        }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cropOpenId, closeCrop, applyCrop]);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const SelectBox = ({ value, onChange, children }) => (<select className="input" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>);
  function onResizeStart(id){ return (e)=>{ if(layoutMode !== "square") return; const it = images.find(i=>i.id===id); if(!it) return; spanDragRef.current = { id, sx: e.clientX, sy: e.clientY, baseC: it.colSpan || 1, baseR: it.rowSpan || 1 }; window.addEventListener("mousemove", onResizing); window.addEventListener("mouseup", onResizeEnd); }; }
  function onResizing(e){ const st = spanDragRef.current; if(!st) return; const cell = getCellPx(); const dx = e.clientX - st.sx, dy = e.clientY - st.sy; const addC = Math.round(dx / (cell + gap)); const addR = Math.round(dy / (cell + gap)); const nc = Math.max(1, Math.min(columns, (st.baseC || 1) + addC)); const nr = Math.max(1, (st.baseR || 1) + addR); setImages(prev => prev.map(i => i.id===st.id ? { ...i, colSpan: nc, rowSpan: nr } : i)); }
  function onResizeEnd(){ window.removeEventListener("mousemove", onResizing); window.removeEventListener("mouseup", onResizeEnd); spanDragRef.current = null; }
  function getCellPx(){ const el = gridRef.current; if(!el) return gridCell; const w = el.clientWidth || 600; const cell = Math.max(40, Math.floor((w - gap*(columns - 1)) / columns)); return cell; }
  useEffect(()=>{ function update(){ setGridCell(getCellPx()); } update(); const ro = new ResizeObserver(update); if(gridRef.current) ro.observe(gridRef.current); window.addEventListener("resize", update); return ()=>{ window.removeEventListener("resize", update); ro.disconnect(); }; }, [columns, gap]);

  const handleTemplateChange = (id) => {
    setSelectedTemplate(id);
    const tmpl = TEMPLATES.find((t) => t.id === id);
    if (!tmpl || id === "custom") {
      setColumns(4);
      setGap(12);
      setBoardPadding(24);
      setBoardWidth(null);
      setBoardHeight(null);
      setBoardAspect(undefined);
    } else {
      setColumns(tmpl.columns);
      setGap(tmpl.gap);
      setBoardPadding(tmpl.padding);
      setBoardWidth(tmpl.canvasWidth || null);
      setBoardHeight(tmpl.canvasHeight || null);
      setBoardAspect(tmpl.aspectRatio);
    }
    setTimeout(() => setGridCell(getCellPx()), 0);
  };

  const resetSettings = useCallback(() => {
    setBoardTitle("");
    setBoardDescription("");
    setShowText(true);
    setLogoSrc(null);
    setLogoSize(40);
    setLogoRounded(true);
    setGap(12);
    setColumns(4);
    setRows(3);
    setLayoutMode("auto");
    setRounded(true);
    setShadow(true);
    setShowSafeMargin(false);
    setBoardPadding(24);
    setSelectedTemplate("custom");
    setBoardWidth(null);
    setBoardHeight(null);
    setBoardAspect(undefined);
    setZoom(100);
    setBg("#ffffff");
    setBrandingOpen(true);
    setLayoutOpen(true);
    setExportFormat("png");
    setTimeout(() => setGridCell(getCellPx()), 0);
  }, []);

  const Header = () => (
    <header ref={headerRef} className="fixed top-0 left-0 w-full bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 z-50">
      <div className="mx-auto max-w-[1400px] flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 40 40"
            className="h-6 w-6 text-black"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M11.25 15H6.25C5.55977 15 5 15.5598 5 16.25V18.75C5 19.4402 5.55977 20 6.25 20H11.25C11.9402 20 12.5 19.4402 12.5 18.75V16.25C12.5 15.5598 11.9402 15 11.25 15ZM22.5 27.5H17.5C16.8098 27.5 16.25 28.0598 16.25 28.75V33.75C16.25 34.4402 16.8098 35 17.5 35H22.5C23.1902 35 23.75 34.4402 23.75 33.75V28.75C23.75 28.0598 23.1902 27.5 22.5 27.5ZM12.5 33.75V23.75C12.5 23.0598 11.9402 22.5 11.25 22.5H6.25C5.55977 22.5 5 23.0598 5 23.75V33.75C5 34.4402 5.55977 35 6.25 35H11.25C11.9402 35 12.5 34.4402 12.5 33.75ZM22.5 20H17.5C16.8098 20 16.25 20.5598 16.25 21.25V23.75C16.25 24.4402 16.8098 25 17.5 25H22.5C23.1902 25 23.75 24.4402 23.75 23.75V21.25C23.75 20.5598 23.1902 20 22.5 20ZM33.75 15H28.75C28.0598 15 27.5 15.5598 27.5 16.25V18.75C27.5 19.4402 28.0598 20 28.75 20H33.75C34.4402 20 35 19.4402 35 18.75V16.25C35 15.5598 34.4402 15 33.75 15ZM22.5 5H17.5C16.8098 5 16.25 5.55977 16.25 6.25V16.25C16.25 16.9402 16.8098 17.5 17.5 17.5H22.5C23.1902 17.5 23.75 16.9402 23.75 16.25V6.25C23.75 5.55977 23.1902 5 22.5 5ZM11.25 5H6.25C5.55977 5 5 5.55977 5 6.25V11.25C5 11.9402 5.55977 12.5 6.25 12.5H11.25C11.9402 12.5 12.5 11.9402 12.5 11.25V6.25C12.5 5.55977 11.9402 5 11.25 5ZM33.75 5H28.75C28.0598 5 27.5 5.55977 27.5 6.25V11.25C27.5 11.9402 28.0598 12.5 28.75 12.5H33.75C34.4402 12.5 35 11.9402 35 11.25V6.25C35 5.55977 34.4402 5 33.75 5ZM33.75 22.5H28.75C28.0598 22.5 27.5 23.0598 27.5 23.75V33.75C27.5 34.4402 28.0598 35 28.75 35H33.75C34.4402 35 35 34.4402 35 33.75V23.75C35 23.0598 34.4402 22.5 33.75 22.5Z" />
          </svg>
          <h1 className="text-2xl font-semibold tracking-tight">Method Mosaic</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" />Add Images
          </Button>
          <Button variant="outline" size="sm" onClick={addFromUrl}>
            <ImagePlus className="h-4 w-4 mr-1" />From URL
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
            Leave Review
          </Button>
          <Button variant="ghost" size="sm" onClick={resetOrder}>
            <RotateCcw className="h-4 w-4 mr-1" />Reset Order
          </Button>
          <Button variant="destructive" size="sm" onClick={clearAll}>
            <Trash2 className="h-4 w-4 mr-1" />Clear All
          </Button>
          <div className="relative">
            <Button
              ref={infoButtonRef}
              variant="outline"
              size="icon"
              onClick={() => setInfoOpen((v) => !v)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            {infoOpen && (
              <div
                ref={infoRef}
                className="absolute right-0 mt-2 w-64 rounded-md border border-neutral-200 bg-white p-3 text-left text-sm shadow-md dark:border-neutral-700 dark:bg-neutral-900"
              >
                <h3 className="font-medium">Method Mosaic</h3>
                <p className="mt-1 mb-2 text-neutral-600">
                  Arrange images and export your moodboard.
                </p>
                <p className="text-neutral-600">
                  Created by <a href="https://methodlab.ca" target="_blank" rel="noreferrer" className="underline">Method Lab</a>
                </p>
                <p className="mt-2 text-xs text-neutral-500">Version {pkg.version}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <Header />
      <div className="p-4 md:p-6 lg:p-8" style={{ marginTop: "var(--header-height)" }}>
        <div className="max-w-[1400px] mx-auto">
        <div className="space-y-4">
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <p className="text-sm text-neutral-500">Drop images • Paste • {canReorder ? "Drag tiles to reorder" : "Switch to Grid or Square to reorder"} • Reset order</p>
          <Card className="bg-transparent rounded-none shadow-none">
            <CardContent className="p-4 md:p-6">
              <div
                className={cx(
                  "relative w-full min-h-[60vh] overflow-auto",
                  images.length === 0 ? "grid place-items-center" : ""
                )}
                onDrop={onDrop}
                onDragOver={onDragOverBoard}
                onPaste={onPaste}
              >
                <div
                  ref={boardRef}
                  className="relative w-full min-h-[60vh] border border-neutral-200 dark:border-neutral-700"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "top left",
                    background: bg,
                    padding: boardPadding,
                    width: boardWidth ? `${boardWidth}px` : undefined,
                    height: boardHeight ? `${boardHeight}px` : undefined,
                    aspectRatio: boardAspect,
                  }}
                >
                  {showText && (boardTitle || boardDescription || logoSrc) && (
                    <header className={cx("mb-6", BRANDING_PRESETS[brandingPreset].header)}>
                      {logoSrc && (
                        <img
                          src={logoSrc}
                          alt="logo"
                          style={{ width: logoSize, height: logoSize, borderRadius: logoRounded ? "9999px" : "12px" }}
                          className="shrink-0 object-cover"
                        />
                      )}
                      <div>
                        {boardTitle && (
                          <h2 className={cx(titleClass, "font-semibold leading-tight mb-1")}>{boardTitle}</h2>
                        )}
                        {boardDescription && (
                          <p className={cx(descClass, "text-neutral-600 dark:text-neutral-300")}>{boardDescription}</p>
                        )}
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
                          {layoutMode === "square" ? (
                            <VirtualImage
                              force={renderAllImages}
                              src={img.src}
                              alt="mood"
                              wrapperClassName="w-full h-full"
                              imgClassName="block w-full h-full select-none object-cover"
                              imgStyle={{ objectPosition: `${crop.x}% ${crop.y}%`, transform: `scale(${crop.zoom})`, transformOrigin: "center center" }}
                            />
                          ) : (
                            <VirtualImage
                              force={renderAllImages}
                              src={img.src}
                              alt="mood"
                              wrapperClassName="block w-full"
                              wrapperStyle={{ aspectRatio: `${img.w || 4} / ${img.h || 3}` }}
                              imgClassName={cx("block w-full h-full select-none", (layoutMode === "grid" || layoutMode === "auto") ? "object-cover" : "")}
                            />
                          )}
                          <div data-export-exclude className="absolute inset-x-2 top-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {layoutMode === "square" && (<Button size="sm" variant="secondary" className="h-8" onClick={() => openCrop(img.id)}>Crop</Button>)}
                            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => replaceImage(img.id)}><ImageIcon className="h-4 w-4"/></Button>
                            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => removeImage(img.id)}><Trash2 className="h-4 w-4"/></Button>
                          </div>
                          {layoutMode === "square" && (
                            <div data-export-exclude onMouseDown={(e)=>{ e.preventDefault(); e.stopPropagation(); onResizeStart(img.id)(e); }} title={`${img.colSpan||1}×${img.rowSpan||1}`} style={{ position:"absolute", right:6, bottom:6, width:22, height:22, borderRadius:6, background:"#fff", border:"1px solid #ddd", display:"grid", placeItems:"center", fontSize:12, cursor:"nwse-resize" }}>⇲</div>
                          )}
                        </figure>
                      );
                    })}
                  </div>
                  {showSafeMargin && <SafeMarginOverlay targetRef={boardRef} />}
                </div>
                {images.length === 0 && (
                  <div className="text-center p-8">
                    <div className="text-sm text-neutral-500 mb-3">Drop images here, paste from clipboard, or use “Add Images”.</div>
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Select Files</Button>
                  </div>
                )}
                {exporting && (
                  <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70 dark:bg-black/50 text-sm">Exporting…</div>
                )}
              </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
    <SettingsDrawer open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)}>
      <div className="h-full overflow-y-auto space-y-6">
        <div className="pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Moodboard Settings</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={resetSettings}
              aria-label="Reset settings"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            <button type="button" className="w-full flex items-center justify-between px-0 py-1" onClick={() => setBrandingOpen((v) => !v)} aria-expanded={brandingOpen}>
              <span className="flex items-center gap-2 text-sm"><ImageIcon className="h-4 w-4"/>Branding</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2"><Switch checked={showText} onCheckedChange={setShowText} id="showText"/><Label htmlFor="showText" className="text-sm">Show</Label></div>
                {brandingOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
              </div>
            </button>
            {brandingOpen && (
              <>
                <div className="space-y-3">
                  <Input placeholder="Board title" value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} />
                  <Input placeholder="Short description" value={boardDescription} onChange={(e) => setBoardDescription(e.target.value)} />
                  <div className="space-y-2">
                    <Label className="text-sm">Preset</Label>
                    <select
                      className="input"
                      value={brandingPreset}
                      onChange={(e) => setBrandingPreset(e.target.value)}
                    >
                      <option value="left-s">Left S</option>
                      <option value="left-m">Left M</option>
                      <option value="center-s">Center S</option>
                      <option value="center-m">Center M</option>
                    </select>
                  </div>
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
              </>
            )}
          </div>
          <div className="space-y-4">
            <button type="button" className="w-full flex items-center justify-between px-0 py-1" onClick={() => setLayoutOpen((v) => !v)} aria-expanded={layoutOpen}>
              <span className="flex items-center gap-2 text-sm"><LayoutGrid className="h-4 w-4"/>Layout</span>
              {layoutOpen ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
            </button>
            {layoutOpen && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">Template</Label>
                  <TemplateSelector value={selectedTemplate} onChange={handleTemplateChange} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Layout mode</Label>
                  <SelectBox value={layoutMode} onChange={setLayoutMode}>
                    <option value="auto">Automatic (Masonry)</option>
                    <option value="grid">Grid (Rows × Columns)</option>
                    <option value="square">Flexible grid (resizable tiles)</option>
                  </SelectBox>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Zoom</Label>
                  <div className="px-1"><Slider min={50} max={200} step={10} value={[zoom]} onValueChange={([v]) => setZoom(v)} /></div>
                  <div className="text-xs text-neutral-500">{zoom}%</div>
                </div>
                <div className={cx("grid gap-4", layoutMode === "grid" ? "grid-cols-2" : "grid-cols-1")}> 
                  <div className="space-y-2">
                    <Label className="text-sm">Columns</Label>
                    <div className="px-1"><Slider min={1} max={12} step={1} value={[columns]} onValueChange={([v]) => setColumns(v)} /></div>
                    <div className="text-xs text-neutral-500">{columns} column(s)</div>
                  </div>
                  {layoutMode === "grid" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Row height</Label>
                      <div className="px-1"><Slider min={1} max={12} step={1} value={[rows]} onValueChange={([v]) => setRows(v)} /></div>
                      <div className="text-xs text-neutral-500">{rows} row(s)</div>
                    </div>
                  )}
                </div>
                <div className="space-y-2"><Label className="text-sm">Gaps</Label><div className="px-1"><Slider min={0} max={48} step={1} value={[gap]} onValueChange={([v]) => setGap(v)} /></div><div className="text-xs text-neutral-500">{gap}px</div></div>
                <div className="space-y-2"><Label className="text-sm">Board padding</Label><div className="px-1"><Slider min={0} max={96} step={2} value={[boardPadding]} onValueChange={([v]) => setBoardPadding(v)} /></div><div className="text-xs text-neutral-500">{boardPadding}px</div></div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><Switch checked={rounded} onCheckedChange={setRounded} id="rounded"/><Label htmlFor="rounded">Rounded corners</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={shadow} onCheckedChange={setShadow} id="shadow"/><Label htmlFor="shadow">Soft shadow</Label></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={showSafeMargin} onCheckedChange={setShowSafeMargin} id="safe-margin"/><Label htmlFor="safe-margin">Show safe margin</Label></div>
                <div className="space-y-2"><Label className="text-sm">Background</Label><div className="flex items-center gap-3"><Input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="w-16 h-10 p-1 cursor-pointer"/><Input type="text" value={bg} onChange={(e) => setBg(e.target.value)} /></div></div>
              </>
            )}
          </div>
          <div className="space-y-3">
            <Label className="text-sm">Project</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={saveBoardFile} className="w-full"><Archive className="h-4 w-4 mr-2"/>Save</Button>
              <Button variant="secondary" onClick={() => boardFileRef.current?.click()} className="w-full"><ArchiveRestore className="h-4 w-4 mr-2"/>Load</Button>
            </div>
            <input ref={boardFileRef} type="file" accept=".mlmboard" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0]; if(f) loadBoardFile(f); e.target.value=""; }} />
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
        </div>
      </div>
    </SettingsDrawer>
    <AssetPanel
        assets={assets}
        open={assetPanelOpen}
        onToggle={() => setAssetPanelOpen((v) => !v)}
        onRemoveAsset={removeAsset}
        onClearAssets={clearAssets}
      />
      {reviewOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-md w-full p-6">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setReviewOpen(false)}
              aria-label="Close review"
            >
              <X className="h-4 w-4" />
            </Button>
            <Review />
          </div>
        </div>
      )}
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

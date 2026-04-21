/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Maximize2,
  LayoutGrid,
  Settings2,
  Download,
  Trash2,
  MoveUpRight,
  MoveUpLeft,
  MoveDownRight,
  MoveDownLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Palette
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { cn } from './lib/utils';

type CanvasSize = {
  width: number;
  height: number;
  label: string;
};

const CANVAS_SIZES: Record<string, CanvasSize> = {
  high: { width: 1920, height: 1080, label: '高解析 (1920x1080)' },
  preview: { width: 960, height: 540, label: '預覽小檔 (960x540)' },
  ig: { width: 1080, height: 1350, label: 'IG專用直式 (1080x1350)' },
};

type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type ImageOrientation = 'landscape' | 'portrait';

type WorkImage = {
  src: string;
  versionText: string;
};

const SOLID_COLORS = [
  { label: '純白', value: '#FFFFFF' },
  { label: '淺灰', value: '#F5F5F7' },
  { label: '深灰', value: '#1D1D1F' },
  { label: '米色', value: '#F5F2ED' },
  { label: '淡藍', value: '#E3F2FD' },
];

const GRADIENTS = [
  { label: '晨曦', value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' },
  { label: '夕陽', value: 'linear-gradient(to right, #ffecd2 0%, #fcb69f 100%)' },
  { label: '天空', value: 'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { label: '雲霧', value: 'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)' },
  { label: '極光', value: 'linear-gradient(to top, #96fbc4 0%, #f9f586 100%)' },
];

export default function App() {
  const [canvasSize, setCanvasSize] = useState<keyof typeof CANVAS_SIZES>('high');
  const [watermark, setWatermark] = useState<string | null>(null);
  const [watermarkPos, setWatermarkPos] = useState<WatermarkPosition>('top-right');
  const [watermarkSize, setWatermarkSize] = useState(200);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
  const [workImages, setWorkImages] = useState<WorkImage[]>([]);
  const [imageOrientation, setImageOrientation] = useState<ImageOrientation>('landscape');
  const [spacing, setSpacing] = useState(60);
  const [imageScale, setImageScale] = useState(1);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [customColor1, setCustomColor1] = useState('#FFFFFF');
  const [customColor2, setCustomColor2] = useState('#F5F5F7');
  const [gradientAngle, setGradientAngle] = useState(135);
  const [isCustomGradient, setIsCustomGradient] = useState(false);
  const [isUsingCustomColor, setIsUsingCustomColor] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageConfigs, setPageConfigs] = useState<number[]>([3]);
  const [pageLabels, setPageLabels] = useState<string[]>([]);
  const [showVersionIcon, setShowVersionIcon] = useState(false);
  const [versionIconShape, setVersionIconShape] = useState<'circle' | 'rounded'>('circle');

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Calculate pages based on pageConfigs
  const pages = useMemo(() => {
    let imageIndex = 0;
    return pageConfigs.map(slotCount => {
      const pageImages = workImages.slice(imageIndex, imageIndex + slotCount);
      imageIndex += slotCount;
      return pageImages;
    });
  }, [workImages, pageConfigs]);

  useEffect(() => {
    if (currentPage >= pages.length && pages.length > 0) {
      setCurrentPage(pages.length - 1);
    } else if (pages.length === 0) {
      setCurrentPage(0);
    }

    // Initialize or adjust page labels
    if (pageLabels.length !== pages.length) {
      setPageLabels(prev => {
        const newLabels = [...prev];
        if (newLabels.length < pages.length) {
          for (let i = newLabels.length; i < pages.length; i++) {
            newLabels[i] = ''; // Default to empty as requested
          }
        } else {
          newLabels.length = pages.length;
        }
        return newLabels;
      });
    }
  }, [pages.length, currentPage]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 120;
        const containerHeight = containerRef.current.clientHeight - 180; // More space for bottom pagination
        const targetWidth = CANVAS_SIZES[canvasSize].width;
        const targetHeight = CANVAS_SIZES[canvasSize].height;

        const scaleW = containerWidth / targetWidth;
        const scaleH = containerHeight / targetHeight;
        setScale(Math.min(scaleW, scaleH, 1));
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [canvasSize]);

  const updateCustomBg = () => {
    setIsUsingCustomColor(true);
    if (isCustomGradient) {
      setBgColor(`linear-gradient(${gradientAngle}deg, ${customColor1} 0%, ${customColor2} 100%)`);
    } else {
      setBgColor(customColor1);
    }
  };

  useEffect(() => {
    if (isUsingCustomColor) {
      updateCustomBg();
    }
  }, [customColor1, customColor2, gradientAngle, isCustomGradient, isUsingCustomColor]);

  const handlePresetColor = (color: string) => {
    setIsUsingCustomColor(false);
    setBgColor(color);
  };
  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setWatermark(event.target?.result as string);
      reader.readAsDataURL(file as Blob);
    }
  };

  const handleWorkImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setWorkImages(prev => {
          // Auto-generate version text based on current count
          const nextLetter = String.fromCharCode(65 + (prev.length % 26));
          const versionText = prev.length >= 26 ? `${nextLetter}-${Math.floor(prev.length / 26)}` : nextLetter;

          return [...prev, {
            src: event.target?.result as string,
            versionText: versionText
          }];
        });
      };
      reader.readAsDataURL(file as Blob);
    });
  };

  const updateWorkImageVersion = (index: number, text: string) => {
    setWorkImages(prev => prev.map((img, i) => i === index ? { ...img, versionText: text } : img));
  };

  const removeWorkImage = (index: number) => {
    setWorkImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveWorkImage = (index: number, direction: 'up' | 'down') => {
    setWorkImages(prev => {
      const newImages = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < newImages.length) {
        [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
      }
      return newImages;
    });
  };

  const addPage = () => {
    setPageConfigs(prev => [...prev, 3]);
  };

  const removePage = (index: number) => {
    if (pageConfigs.length > 1) {
      setPageConfigs(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateSlotCount = (index: number, delta: number) => {
    setPageConfigs(prev => prev.map((count, i) => {
      if (i === index) {
        const newCount = Math.max(1, count + delta);
        return newCount;
      }
      return count;
    }));
  };

  const exportAllPages = async () => {
    setIsExporting(true);
    const originalPage = currentPage;
    try {
      for (let i = 0; i < pages.length; i++) {
        // Switch to the page to ensure it's rendered and visible
        setCurrentPage(i);
        // Wait for React to update and browser to paint
        await new Promise(resolve => setTimeout(resolve, 500));

        const pageEl = pageRefs.current[i];
        if (!pageEl) continue;

        const dataUrl = await toPng(pageEl, {
          pixelRatio: 2,
          width: CANVAS_SIZES[canvasSize].width,
          height: CANVAS_SIZES[canvasSize].height,
          cacheBust: true,
        });

        const link = document.createElement('a');
        link.download = `mockup-page-${i + 1}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setCurrentPage(originalPage);
      setIsExporting(false);
    }
  };

  const watermarkPositionClasses: Record<WatermarkPosition, string> = {
    'top-left': 'top-12 left-12',
    'top-right': 'top-12 right-12',
    'bottom-left': 'bottom-12 left-12',
    'bottom-right': 'bottom-12 right-12',
  };

  return (
    <div className="flex flex-col h-screen bg-retro-bg text-[#1D1D1F] font-pixel overflow-hidden relative p-4 gap-4">
      {/* Decorative Pixel Clouds */}
      <div className="pixel-cloud top-20 left-[10%]" />
      <div className="pixel-cloud top-40 left-[40%]" />
      <div className="pixel-cloud top-10 left-[70%]" />
      <div className="pixel-cloud bottom-20 left-[20%]" />
      <div className="pixel-cloud bottom-40 left-[60%]" />
      <div className="pixel-cloud bottom-10 left-[85%]" />

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-85 retro-window flex flex-col z-10 custom-scrollbar">
          <div className="retro-title-bar">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              <span>PROPOSAL_HELPER.EXE</span>
            </div>
            <div className="flex gap-1">
              <button className="w-4 h-4 retro-button p-0 flex items-center justify-center text-[8px] text-black leading-none">_</button>
              <button className="w-4 h-4 retro-button p-0 flex items-center justify-center text-[8px] text-black leading-none">X</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Work Images - Moved to Top and Enhanced */}
            <section className="space-y-3">
              <label className="text-[10px] font-bold text-retro-title uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-3 h-3" /> 1. 上傳作品圖
              </label>

              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleWorkImagesUpload}
                  className="hidden"
                  id="work-upload"
                />
                <label
                  htmlFor="work-upload"
                  className="retro-button flex flex-col items-center justify-center gap-2 w-full py-6 bg-retro-title text-white hover:bg-opacity-90 transition-all active:scale-[0.98] group"
                >
                  <Upload className="w-5 h-5" />
                  <div className="text-center">
                    <span className="block text-xs font-bold">SELECT_FILES.go</span>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setImageOrientation('landscape')}
                    className={cn(
                      "retro-button text-[10px] flex items-center justify-center gap-2",
                      imageOrientation === 'landscape' ? "bg-retro-title text-white" : ""
                    )}
                  >
                    橫式
                  </button>
                  <button
                    onClick={() => setImageOrientation('portrait')}
                    className={cn(
                      "retro-button text-[10px] flex items-center justify-center gap-2",
                      imageOrientation === 'portrait' ? "bg-retro-title text-white" : ""
                    )}
                  >
                    直式
                  </button>
                </div>

                <div className="space-y-2 p-2 retro-inset bg-white/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold">版本標示 Icon</span>
                    <button
                      onClick={() => setShowVersionIcon(!showVersionIcon)}
                      className={cn(
                        "w-8 h-4 border border-retro-border-dark relative transition-colors",
                        showVersionIcon ? "bg-retro-title" : "bg-retro-window"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-2.5 h-2.5 bg-white border border-retro-border-dark transition-transform",
                        showVersionIcon ? "left-4.5" : "left-0.5"
                      )} />
                    </button>
                  </div>

                  {showVersionIcon && (
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => setVersionIconShape('circle')}
                        className={cn(
                          "retro-button text-[8px] py-0.5",
                          versionIconShape === 'circle' ? "bg-retro-title text-white" : ""
                        )}
                      >
                        圓形
                      </button>
                      <button
                        onClick={() => setVersionIconShape('rounded')}
                        className={cn(
                          "retro-button text-[8px] py-0.5",
                          versionIconShape === 'rounded' ? "bg-retro-title text-white" : ""
                        )}
                      >
                        圓角
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span>間距調整</span>
                    <span>{spacing}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="400"
                    value={spacing}
                    onChange={(e) => setSpacing(Number(e.target.value))}
                    className="w-full h-4 accent-retro-title"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span>圖片縮放</span>
                    <span>{Math.round(imageScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.01"
                    value={imageScale}
                    onChange={(e) => setImageScale(Number(e.target.value))}
                    className="w-full h-4 accent-retro-title"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {workImages.map((img, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="relative aspect-square retro-inset overflow-hidden group">
                        <img src={img.src} alt={`Work ${idx}`} className="w-full h-full object-cover" />

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                          <div className="flex gap-1">
                            <button
                              onClick={() => moveWorkImage(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 bg-white/20 hover:bg-white/40 rounded text-white disabled:opacity-30"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveWorkImage(idx, 'down')}
                              disabled={idx === workImages.length - 1}
                              className="p-1 bg-white/20 hover:bg-white/40 rounded text-white disabled:opacity-30"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeWorkImage(idx)}
                            className="p-1 bg-red-500/80 hover:bg-red-500 rounded text-white"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {showVersionIcon && (
                        <input
                          type="text"
                          value={img.versionText}
                          onChange={(e) => updateWorkImageVersion(idx, e.target.value)}
                          className="w-full px-1 py-0.5 text-[8px] text-center retro-inset focus:outline-none"
                          placeholder="VER"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Page Management */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-retro-title uppercase tracking-wider flex items-center gap-2">
                  <LayoutGrid className="w-3 h-3" /> 2. 頁面管理
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPageConfigs(prev => prev.slice(0, -1))}
                    disabled={pageConfigs.length <= 1}
                    className="retro-button p-0.5 disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] font-bold w-4 text-center">{pageConfigs.length}</span>
                  <button
                    onClick={addPage}
                    className="retro-button p-0.5"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {pageConfigs.map((count, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between p-2 retro-inset transition-all",
                      currentPage === idx ? "bg-retro-title/10 border-retro-title" : "bg-white/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold">P{idx + 1}</span>
                      <div className="flex items-center gap-1 bg-retro-window border border-retro-border-dark px-1 py-0.5">
                        <button onClick={() => updateSlotCount(idx, -1)} className="hover:text-retro-title"><Minus className="w-2 h-2" /></button>
                        <span className="text-[8px] font-bold w-3 text-center">{count}</span>
                        <button onClick={() => updateSlotCount(idx, 1)} className="hover:text-retro-title"><Plus className="w-2 h-2" /></button>
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentPage(idx)}
                      className={cn(
                        "retro-button text-[8px] py-0.5 px-2",
                        currentPage === idx ? "bg-retro-title text-white" : ""
                      )}
                    >
                      VIEW
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Canvas Size */}
            <section className="space-y-2">
              <label className="text-[10px] font-bold text-retro-title uppercase tracking-wider flex items-center gap-2">
                <Maximize2 className="w-3 h-3" /> 3. 畫布尺寸
              </label>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(CANVAS_SIZES).map(([key, size]) => (
                  <button
                    key={key}
                    onClick={() => setCanvasSize(key as any)}
                    className={cn(
                      "retro-button text-[10px] text-left",
                      canvasSize === key ? "bg-retro-title text-white" : ""
                    )}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Background Color */}
            <section className="space-y-3">
              <label className="text-[10px] font-bold text-retro-title uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-3 h-3" /> 4. 畫布底色
              </label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {SOLID_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => handlePresetColor(color.value)}
                      className={cn(
                        "w-6 h-6 border border-retro-border-dark",
                        !isUsingCustomColor && bgColor === color.value && "ring-1 ring-retro-title ring-offset-1"
                      )}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap gap-1">
                  {GRADIENTS.map(grad => (
                    <button
                      key={grad.value}
                      onClick={() => handlePresetColor(grad.value)}
                      className={cn(
                        "w-6 h-6 border border-retro-border-dark",
                        !isUsingCustomColor && bgColor === grad.value && "ring-1 ring-retro-title ring-offset-1"
                      )}
                      style={{ background: grad.value }}
                    />
                  ))}
                </div>

                <div className="pt-2 border-t border-retro-border-dark space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold uppercase">CUSTOM_Background 自訂背景顏色</span>
                    <button
                      onClick={() => setIsUsingCustomColor(true)}
                      className={cn(
                        "retro-button text-[8px] py-0.5",
                        isUsingCustomColor ? "bg-retro-title text-white" : ""
                      )}
                    >
                      USE_CUSTOM
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="color"
                      value={customColor1}
                      onChange={(e) => {
                        setCustomColor1(e.target.value);
                        setIsUsingCustomColor(true);
                      }}
                      className="w-full h-6 cursor-pointer border border-retro-border-dark p-0 bg-transparent"
                    />
                    {isCustomGradient && (
                      <input
                        type="color"
                        value={customColor2}
                        onChange={(e) => {
                          setCustomColor2(e.target.value);
                          setIsUsingCustomColor(true);
                        }}
                        className="w-full h-6 cursor-pointer border border-retro-border-dark p-0 bg-transparent"
                      />
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCustomGradient}
                      onChange={(e) => {
                        setIsCustomGradient(e.target.checked);
                        setIsUsingCustomColor(true);
                      }}
                      className="w-3 h-3 accent-retro-title"
                    />
                    <span className="text-[8px]">GRADIENT_MODE</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Watermark */}
            <section className="space-y-3">
              <label className="text-[10px] font-bold text-retro-title uppercase tracking-wider flex items-center gap-2">
                <Settings2 className="w-3 h-3" /> 5. 浮水印
              </label>

              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWatermarkUpload}
                    className="hidden"
                    id="watermark-upload"
                  />
                  <label
                    htmlFor="watermark-upload"
                    className="flex flex-col items-center justify-center w-full h-20 retro-inset cursor-pointer hover:bg-retro-window transition-colors"
                  >
                    {watermark ? (
                      <img src={watermark} alt="Watermark preview" className="h-12 object-contain" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-retro-title mb-1" />
                        <span className="text-[8px]">UPLOAD_Sticker.png</span>
                      </>
                    )}
                  </label>
                  {watermark && (
                    <button
                      onClick={() => setWatermark(null)}
                      className="absolute top-1 right-1 p-0.5 bg-white border border-retro-border-dark hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {watermark && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => setWatermarkOpacity(0.5)}
                        className={cn(
                          "retro-button text-[8px] py-1",
                          watermarkOpacity === 0.5 ? "bg-retro-title text-white" : ""
                        )}
                      >
                        ALPHA_50
                      </button>
                      <button
                        onClick={() => setWatermarkOpacity(1)}
                        className={cn(
                          "retro-button text-[8px] py-1",
                          watermarkOpacity === 1 ? "bg-retro-title text-white" : ""
                        )}
                      >
                        ALPHA_100
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as WatermarkPosition[]).map(pos => (
                        <button
                          key={pos}
                          onClick={() => setWatermarkPos(pos)}
                          className={cn(
                            "retro-button p-1 flex items-center justify-center",
                            watermarkPos === pos ? "bg-retro-title text-white" : ""
                          )}
                        >
                          {pos === 'top-left' && <MoveUpLeft className="w-3 h-3" />}
                          {pos === 'top-right' && <MoveUpRight className="w-3 h-3" />}
                          {pos === 'bottom-left' && <MoveDownLeft className="w-3 h-3" />}
                          {pos === 'bottom-right' && <MoveDownRight className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </aside>

        {/* Main Preview Area */}
        <main
          ref={containerRef}
          className="flex-1 relative overflow-hidden flex flex-col retro-window"
        >
          <div className="retro-title-bar">
            <div className="flex items-center gap-2">
              <Maximize2 className="w-4 h-4" />
              <span>PREVIEW_WINDOW.SYS</span>
            </div>
            <div className="flex gap-1">
              <button className="w-4 h-4 retro-button p-0 flex items-center justify-center text-[8px] text-black leading-none">_</button>
              <button className="w-4 h-4 retro-button p-0 flex items-center justify-center text-[8px] text-black leading-none">X</button>
            </div>
          </div>

          {/* Floating Export Button */}
          <div className="absolute top-12 right-6 z-[60]">
            <button
              onClick={exportAllPages}
              disabled={isExporting || workImages.length === 0}
              className="retro-button px-4 py-2 bg-retro-title text-white flex items-center gap-2 hover:bg-opacity-90 transition-all disabled:opacity-50 shadow-lg active:scale-95"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="text-xs font-bold">
                {pages.length > 1 ? `EXPORT_ALL (${pages.length})` : 'EXPORT_IMAGE'}
              </span>
            </button>
          </div>

          {/* Canvas Wrapper */}
          <div className="flex-1 flex items-center justify-center min-h-0 p-10">
            <div
              style={{
                transform: `scale(${scale})`,
                width: CANVAS_SIZES[canvasSize].width,
                height: CANVAS_SIZES[canvasSize].height,
              }}
              className="transition-transform duration-300 ease-out origin-center relative flex-shrink-0 shadow-[10px_10px_0_0_rgba(0,0,0,0.2)]"
            >
              {/* Render all pages but only show current one in preview */}
              {pages.map((pageImages, pageIdx) => (
                <div
                  key={pageIdx}
                  ref={el => pageRefs.current[pageIdx] = el}
                  style={{
                    width: CANVAS_SIZES[canvasSize].width,
                    height: CANVAS_SIZES[canvasSize].height,
                    background: bgColor.includes('gradient') ? bgColor : bgColor,
                    backgroundColor: bgColor.includes('gradient') ? undefined : bgColor,
                    display: pageIdx === currentPage ? 'block' : 'none',
                    position: pageIdx === currentPage ? 'relative' : 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: pageIdx === currentPage ? 10 : -1,
                  }}
                  className="shadow-2xl overflow-hidden"
                >
                  {/* Background Content */}
                  <div
                    className="w-full h-full p-24 flex items-center justify-center overflow-hidden relative"
                    style={{ gap: `${spacing}px` }}
                  >
                    {/* Slot Adjustment Controls - Hidden during export */}
                    {!isExporting && pageIdx === currentPage && (
                      <>
                        <button
                          onClick={() => updateSlotCount(pageIdx, -1)}
                          disabled={pageConfigs[pageIdx] <= 1}
                          className="absolute left-8 top-1/2 -translate-y-1/2 w-10 h-10 retro-button flex items-center justify-center z-[70] disabled:opacity-30"
                          title="減少欄位"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => updateSlotCount(pageIdx, 1)}
                          className="absolute right-8 top-1/2 -translate-y-1/2 w-10 h-10 retro-button flex items-center justify-center z-[70]"
                          title="增加欄位"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {Array.from({ length: pageConfigs[pageIdx] }).map((_, idx) => {
                      const img = pageImages[idx];
                      return (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={idx}
                          className="relative"
                          style={{
                            width: imageOrientation === 'landscape' ? `${500 * imageScale}px` : 'auto',
                            height: imageOrientation === 'portrait' ? `${700 * imageScale}px` : 'auto',
                          }}
                        >
                          {img ? (
                            <>
                              {/* Shadow Layer */}
                              <div
                                className="absolute inset-2 bg-black/40 blur-[30px] rounded-lg"
                                style={{
                                  transform: `translate(${15 * imageScale}px, ${15 * imageScale}px)`,
                                  zIndex: 0
                                }}
                              />

                              <div className="relative z-10 w-full h-full rounded-xl overflow-hidden border border-[#D2D2D7]/30">
                                <img
                                  src={img.src}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {showVersionIcon && (
                                <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ bottom: `${-64 * imageScale}px` }}>
                                  <div
                                    className={cn(
                                      "bg-black/45 text-white flex items-center justify-center min-w-[36px] min-h-[36px] px-4 py-1.5 transition-all shadow-lg backdrop-blur-sm",
                                      versionIconShape === 'circle' ? "rounded-full" : "rounded-[12px]"
                                    )}
                                  >
                                    <span className="text-sm font-bold tracking-tight whitespace-nowrap">{img.versionText}</span>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            !isExporting && (
                              <div className="w-full h-full border-2 border-dashed border-[#D2D2D7] rounded-xl flex items-center justify-center bg-white/50 backdrop-blur-sm min-w-[200px] min-h-[200px]">
                                <span className="text-xs text-[#86868B] font-medium">待上傳區塊</span>
                              </div>
                            )
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Watermark Overlay */}
                  {watermark && (
                    <div
                      className={cn(
                        "absolute z-50 pointer-events-none",
                        watermarkPositionClasses[watermarkPos]
                      )}
                      style={{
                        width: `${watermarkSize}px`,
                        opacity: watermarkOpacity
                      }}
                    >
                      <img src={watermark} alt="Watermark" className="w-full h-auto object-contain" />
                    </div>
                  )}

                  {/* Page Number Indicator for Export */}
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50">
                    <input
                      type="text"
                      value={pageLabels[pageIdx] || ''}
                      onChange={(e) => {
                        const newLabels = [...pageLabels];
                        newLabels[pageIdx] = e.target.value;
                        setPageLabels(newLabels);
                      }}
                      className="bg-transparent text-retro-title text-sm font-bold opacity-70 text-center border-none focus:outline-none focus:opacity-100 hover:opacity-100 transition-opacity w-120 font-pixel"
                      placeholder={isExporting ? "" : "在此輸入頁面文字..."}
                    />
                  </div>
                </div>
              ))}

              {workImages.length === 0 && (
                <div
                  style={{
                    width: CANVAS_SIZES[canvasSize].width,
                    height: CANVAS_SIZES[canvasSize].height,
                    backgroundColor: 'white',
                  }}
                  className="flex flex-col items-center justify-center text-retro-title shadow-2xl font-pixel"
                >
                  <div className="w-32 h-32 mb-6 opacity-20 relative">
                    <ImageIcon className="w-full h-full" />
                    <div className="absolute -top-4 -right-4 w-8 h-8 bg-retro-bg border-2 border-retro-border-dark" />
                    <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-retro-bg border-2 border-retro-border-dark" />
                  </div>
                  <p className="text-3xl font-bold uppercase tracking-widest">PLEASE_UPLOAD_IMAGES.EXE</p>
                  <p className="text-sm mt-4 opacity-60">WAITING FOR INPUT...</p>
                </div>
              )}
            </div>
          </div>

          {/* Page Navigation Area */}
          <div className="h-16 flex items-center justify-center mt-4">
            {pages.length > 1 && (
              <div className="flex items-center gap-4 retro-window px-4 py-2 z-20">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className="retro-button p-1 disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {pages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx)}
                      className={cn(
                        "retro-button w-7 h-7 text-[10px] font-bold",
                        currentPage === idx ? "bg-retro-title text-white" : ""
                      )}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
                  disabled={currentPage === pages.length - 1}
                  className="retro-button p-1 disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Scale Info */}
          <div className="absolute bottom-4 right-4 px-2 py-0.5 retro-window text-[8px] font-bold text-retro-title">
            PREVIEW_SCALE: {Math.round(scale * 100)}%
          </div>
        </main>
      </div>

      {/* Global Footer / Taskbar */}
      <footer className="retro-window h-10 flex items-center px-2 gap-2 z-50">
        <button
          onClick={() => window.location.href = '/'}
          className="retro-button retro-start-button px-3 py-1 bg-retro-title text-white flex items-center gap-2 text-[10px] font-bold"
        >
          <LayoutGrid className="w-3 h-3" />
          START
        </button>
        <div className="flex-1" />
        <div className="retro-inset px-4 py-1 flex items-center gap-4">
          <a
            href="https://baybay030.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-retro-title hover:underline flex items-center gap-1"
          >
            ⊹ 𝘽🜁𝙔𝘽🜁𝙔  | https://baybay030.github.io
          </a>
        </div>
        <div className="retro-inset px-3 py-1 text-[10px] font-bold flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin opacity-50" />
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </footer>
    </div>
  );
}

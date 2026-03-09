
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Trash2, 
  LayoutGrid, 
  Settings2, 
  X,
  Move,
  Image as ImageIcon,
  ChevronRight,
  GripHorizontal,
  FlipHorizontal,
  FlipVertical,
  RotateCcw
} from 'lucide-react';
import { ImageFile, CollageSettings, ImageTransform } from './types';
import { loadImage } from './utils/image';

const ASPECT_RATIO_PRESETS = [
  { label: '1:1 正方形', value: 1 },
  { label: '4:5 人肖像', value: 0.8 },
  { label: '3:4 傳統', value: 0.75 },
  { label: '2:3 專業', value: 0.66 },
  { label: '16:9 寬螢幕', value: 1.77 },
];

const App: React.FC = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<CollageSettings>({
    columns: 2,
    rows: 2,
    gap: 15,
    padding: 30,
    backgroundColor: '#ffffff',
    itemAspectRatio: 1, 
    quality: 0.95,
    borderRadius: 12,
    borderWidth: 0,
    borderColor: '#ffffff'
  });

  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [draggedThumbnailIdx, setDraggedThumbnailIdx] = useState<number | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStartRef = useRef<{ x: number, y: number, initialX: number, initialY: number } | null>(null);

  const selectedImage = images.find(img => img.id === selectedId);

  // Core drawing logic separated from state to allow export without highlights
  const renderCollage = async (
    canvas: HTMLCanvasElement, 
    imageList: ImageFile[], 
    config: CollageSettings, 
    highlightId: string | null
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseRes = 1200; 
    const cellWidth = baseRes / config.columns;
    const cellHeight = cellWidth / config.itemAspectRatio;
    
    const totalWidth = (config.columns * cellWidth) + ((config.columns - 1) * config.gap) + (config.padding * 2);
    const totalHeight = (config.rows * cellHeight) + ((config.rows - 1) * config.gap) + (config.padding * 2);

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < imageList.length; i++) {
      const col = i % config.columns;
      const row = Math.floor(i / config.columns);
      const imgObj = imageList[i];

      const x = config.padding + (col * (cellWidth + config.gap));
      const y = config.padding + (row * (cellHeight + config.gap));

      try {
        const img = await loadImage(imgObj.preview);
        ctx.save();
        
        // Draw Frame with Radius (Clipping)
        ctx.beginPath();
        if (config.borderRadius > 0 && (ctx as any).roundRect) {
          (ctx as any).roundRect(x, y, cellWidth, cellHeight, config.borderRadius);
        } else {
          ctx.rect(x, y, cellWidth, cellHeight);
        }
        ctx.clip();

        const cellAspect = cellWidth / cellHeight;
        const imgAspect = img.width / img.height;
        
        let baseScale = imgAspect > cellAspect ? cellHeight / img.height : cellWidth / img.width;
        const finalScale = baseScale * imgObj.transform.scale;
        
        const drawWidth = img.width * finalScale;
        const drawHeight = img.height * finalScale;

        // Image Translation and Mirroring
        const centerX = x + cellWidth / 2 + imgObj.transform.translateX;
        const centerY = y + cellHeight / 2 + imgObj.transform.translateY;

        ctx.translate(centerX, centerY);
        ctx.scale(imgObj.transform.flipX ? -1 : 1, imgObj.transform.flipY ? -1 : 1);
        
        ctx.drawImage(
          img, 
          -drawWidth / 2, 
          -drawHeight / 2, 
          drawWidth, 
          drawHeight
        );

        ctx.restore();

        // Only Draw Highlight if NOT exporting (highlightId is not null)
        if (highlightId === imgObj.id) {
          ctx.save();
          ctx.strokeStyle = '#f472b6'; // Pink highlight
          ctx.lineWidth = 10; 
          if (config.borderRadius > 0 && (ctx as any).roundRect) {
            ctx.beginPath();
            (ctx as any).roundRect(x, y, cellWidth, cellHeight, config.borderRadius);
            ctx.stroke();
          } else {
            ctx.strokeRect(x, y, cellWidth, cellHeight);
          }
          ctx.restore();
        }

      } catch (err) {
        console.error("Failed image draw", i, err);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newImages: ImageFile[] = [];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          file, 
          preview: url, 
          width: img.width, 
          height: img.height, 
          aspectRatio: img.width / img.height,
          transform: { scale: 1, translateX: 0, translateY: 0, flipX: false, flipY: false }
        });
      } catch (err) {
        console.error("Failed to load image", err);
      }
    }

    setImages(prev => {
      const updated = [...prev, ...newImages];
      setSettings(s => ({ ...s, rows: Math.ceil(updated.length / s.columns) }));
      return updated;
    });
  };

  const updateImageTransform = (id: string, updates: Partial<ImageTransform>) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, transform: { ...img.transform, ...updates } } : img
    ));
  };

  const removeImage = (id: string) => {
    if (selectedId === id) setSelectedId(null);
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedThumbnailIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedThumbnailIdx === null || draggedThumbnailIdx === index) return;
    
    const newImages = [...images];
    const item = newImages.splice(draggedThumbnailIdx, 1)[0];
    newImages.splice(index, 0, item);
    
    setDraggedThumbnailIdx(index);
    setImages(newImages);
  };

  const handleDragEnd = () => {
    setDraggedThumbnailIdx(null);
  };

  const drawPreview = useCallback(() => {
    if (!canvasRef.current || images.length === 0) return;
    renderCollage(canvasRef.current, images, settings, selectedId);
  }, [images, settings, selectedId]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  const handleCanvasMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current || images.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const cx = (clientX - rect.left) * scaleX;
    const cy = (clientY - rect.top) * scaleY;

    const baseRes = 1200 / settings.columns;
    const cellWidth = baseRes;
    const cellHeight = cellWidth / settings.itemAspectRatio;

    for (let i = 0; i < images.length; i++) {
      const col = i % settings.columns;
      const row = Math.floor(i / settings.columns);
      const x = settings.padding + (col * (cellWidth + settings.gap));
      const y = settings.padding + (row * (cellHeight + settings.gap));

      if (cx >= x && cx <= x + cellWidth && cy >= y && cy <= y + cellHeight) {
        setSelectedId(images[i].id);
        setIsDraggingCanvas(true);
        dragStartRef.current = { 
          x: cx, 
          y: cy, 
          initialX: images[i].transform.translateX, 
          initialY: images[i].transform.translateY 
        };
        break;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingCanvas || !dragStartRef.current || !selectedId) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    const cx = (clientX - rect.left) * scaleX;
    const cy = (clientY - rect.top) * scaleY;

    updateImageTransform(selectedId, {
      translateX: dragStartRef.current.initialX + (cx - dragStartRef.current.x),
      translateY: dragStartRef.current.initialY + (cy - dragStartRef.current.y)
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
    dragStartRef.current = null;
  };

  const downloadCollage = async () => {
    if (images.length === 0) return;
    
    // Create a temporary canvas for a clean export
    const exportCanvas = document.createElement('canvas');
    await renderCollage(exportCanvas, images, settings, null); // null highlightId means no highlight drawn
    
    const link = document.createElement('a');
    link.download = `collage-studio-${Date.now()}.jpg`;
    link.href = exportCanvas.toDataURL('image/jpeg', settings.quality);
    link.click();
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center font-hand text-black">
      {/* Main Window Container */}
      <div className="w-full max-w-6xl bg-[#cfd8dc] border-[3px] border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col">
        
        {/* Window Title Bar */}
        <header className="bg-white border-b-[3px] border-black px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight uppercase">COLLAGE STUDIO</h1>
            <div className="hidden md:flex items-center gap-2 px-3 py-1 border-2 border-black rounded bg-white text-sm">
              <span className="opacity-50">http://</span>
              <span>collage.studio/create</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-black bg-white flex items-center justify-center text-xs font-bold hover:bg-pink-100 cursor-pointer">_</div>
            <div className="w-6 h-6 border-2 border-black bg-white flex items-center justify-center text-xs font-bold hover:bg-pink-100 cursor-pointer">□</div>
            <div className="w-6 h-6 border-2 border-black bg-pink-400 flex items-center justify-center text-xs font-bold hover:bg-pink-500 cursor-pointer text-white">X</div>
          </div>
        </header>

        {/* Window Content Area */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden h-[80vh]">
          
          {/* Sidebar - Controls */}
          <aside className="w-full lg:w-80 border-r-[3px] border-black overflow-y-auto p-6 space-y-8 bg-[#cfd8dc]">
            <section className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-lg font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 border-black pb-1">
                  <Settings2 className="w-5 h-5" /> LAYOUT
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-bold">COLS:</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={settings.columns} 
                      onChange={e => setSettings(s => ({ ...s, columns: Math.max(1, parseInt(e.target.value) || 1), rows: Math.ceil(images.length / (parseInt(e.target.value) || 1)) }))} 
                      className="w-full border-2 border-black bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-pink-300" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold">ROWS:</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={settings.rows} 
                      onChange={e => setSettings(s => ({ ...s, rows: Math.max(1, parseInt(e.target.value) || 1) }))} 
                      className="w-full border-2 border-black bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-pink-300" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 border-black pb-1">RATIO</h2>
                <div className="grid grid-cols-1 gap-2">
                  {ASPECT_RATIO_PRESETS.map((p) => (
                    <button 
                      key={p.label}
                      onClick={() => setSettings(s => ({ ...s, itemAspectRatio: p.value }))}
                      className={`flex items-center justify-between px-4 py-2 border-2 border-black transition-all text-sm font-bold ${
                        settings.itemAspectRatio === p.value 
                          ? 'bg-pink-400 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' 
                          : 'bg-white text-black hover:bg-pink-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-bold uppercase tracking-wider border-b-2 border-black pb-1">TWEAKS</h2>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span>GAP:</span>
                      <span>{settings.gap}px</span>
                    </div>
                    <input type="range" min="0" max="100" value={settings.gap} onChange={e => setSettings(s => ({ ...s, gap: parseInt(e.target.value) }))} className="w-full accent-pink-500 cursor-pointer" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span>RADIUS:</span>
                      <span>{settings.borderRadius}px</span>
                    </div>
                    <input type="range" min="0" max="100" value={settings.borderRadius} onChange={e => setSettings(s => ({ ...s, borderRadius: parseInt(e.target.value) }))} className="w-full accent-pink-500 cursor-pointer" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span>PADDING:</span>
                      <span>{settings.padding}px</span>
                    </div>
                    <input type="range" min="0" max="150" value={settings.padding} onChange={e => setSettings(s => ({ ...s, padding: parseInt(e.target.value) }))} className="w-full accent-pink-500 cursor-pointer" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-lg font-bold uppercase tracking-wider border-b-2 border-black pb-1 block">BG COLOUR</label>
                <div className="flex gap-3 p-2 border-2 border-black bg-white">
                  <input type="color" value={settings.backgroundColor} onChange={e => setSettings(s => ({ ...s, backgroundColor: e.target.value }))} className="w-10 h-10 bg-transparent border-none cursor-pointer rounded overflow-hidden shrink-0" />
                  <input type="text" value={settings.backgroundColor.toUpperCase()} onChange={e => setSettings(s => ({ ...s, backgroundColor: e.target.value }))} className="flex-1 bg-transparent border-none text-sm font-bold focus:outline-none uppercase" />
                </div>
              </div>
            </section>

            {selectedImage && (
              <section className="p-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Move className="w-4 h-4" /> ADJUST
                  </h2>
                  <button onClick={() => setSelectedId(null)} className="hover:text-pink-500"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => updateImageTransform(selectedImage.id, { flipX: !selectedImage.transform.flipX })}
                    className={`flex items-center justify-center gap-2 py-2 border-2 border-black text-xs font-bold uppercase transition-all ${
                      selectedImage.transform.flipX 
                        ? 'bg-pink-400 text-white shadow-none translate-x-[2px] translate-y-[2px]' 
                        : 'bg-white hover:bg-pink-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    <FlipHorizontal className="w-4 h-4" /> FLIP X
                  </button>
                  <button 
                    onClick={() => updateImageTransform(selectedImage.id, { flipY: !selectedImage.transform.flipY })}
                    className={`flex items-center justify-center gap-2 py-2 border-2 border-black text-xs font-bold uppercase transition-all ${
                      selectedImage.transform.flipY 
                        ? 'bg-pink-400 text-white shadow-none translate-x-[2px] translate-y-[2px]' 
                        : 'bg-white hover:bg-pink-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    <FlipVertical className="w-4 h-4" /> FLIP Y
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-bold">
                    <span>SCALE:</span>
                    <span>x{selectedImage.transform.scale.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0.5" max="4" step="0.01" value={selectedImage.transform.scale} onChange={e => updateImageTransform(selectedImage.id, { scale: parseFloat(e.target.value) })} className="w-full accent-pink-500 cursor-pointer" />
                  <button 
                    onClick={() => updateImageTransform(selectedImage.id, { scale: 1, translateX: 0, translateY: 0, flipX: false, flipY: false })} 
                    className="w-full py-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-pink-50 text-xs uppercase font-bold transition flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> RESET
                  </button>
                </div>
              </section>
            )}
          </aside>

          {/* Main Area */}
          <main className="flex-1 flex flex-col overflow-hidden bg-white">
            <header className="px-6 py-4 border-b-[3px] border-black flex justify-between items-center bg-[#cfd8dc]">
              <div className="flex items-center gap-4">
                <LayoutGrid className="w-6 h-6 lg:hidden" />
                <h2 className="font-bold tracking-tight text-lg uppercase">CANVAS</h2>
                <div className="hidden md:flex items-center gap-2 text-sm font-bold">
                  <span className="bg-white border-2 border-black px-2 py-0.5">{images.length} IMGS</span>
                  <span className="bg-white border-2 border-black px-2 py-0.5">{settings.columns}x{settings.rows}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <label className="cursor-pointer">
                  <input type="file" multiple accept="image/jpeg,image/png" onChange={handleFileUpload} className="hidden" />
                  <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none text-sm font-bold transition-all">
                    <Upload className="w-4 h-4" />
                    <span>ADD ITEMS</span>
                  </div>
                </label>
                <button 
                  onClick={downloadCollage} 
                  disabled={images.length === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-pink-400 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none text-sm font-bold text-white transition-all"
                >
                  <Download className="w-5 h-5" />
                  <span>EXPORT</span>
                </button>
              </div>
            </header>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto p-4 lg:p-8 flex items-center justify-center relative bg-pink-50">
              {images.length === 0 ? (
                <div className="text-center space-y-6 max-w-sm">
                  <div className="w-24 h-24 bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mx-auto">
                    <ImageIcon className="w-12 h-12 text-pink-300" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold uppercase tracking-widest">UPLOAD PHOTOS</h3>
                    <p className="text-sm font-bold px-6 leading-relaxed">Add some images to start collaging! Drag to reorder below.</p>
                  </div>
                </div>
              ) : (
                <div className="relative group max-h-full">
                  <div className="border-[3px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden">
                    <canvas 
                      ref={canvasRef} 
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      onTouchStart={handleCanvasMouseDown}
                      onTouchMove={handleCanvasMouseMove}
                      onTouchEnd={handleCanvasMouseUp}
                      style={{ cursor: isDraggingCanvas ? 'grabbing' : 'crosshair' }}
                      className="max-w-full max-h-[60vh] object-contain mx-auto select-none touch-none"
                    />
                  </div>
                  <div className="absolute -top-12 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setImages([]); setSelectedId(null); }} className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black text-red-500 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all uppercase">
                      <Trash2 className="w-4 h-4" /> CLEAR
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Banner - Reorderable Thumbnails */}
            {images.length > 0 && (
              <div className="h-36 bg-[#cfd8dc] border-t-[3px] border-black px-6 py-4 flex gap-4 overflow-x-auto items-center relative">
                <div className="shrink-0 flex flex-col items-center gap-1 mr-2">
                  <GripHorizontal className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase">ORDER</span>
                </div>
                
                {images.map((img, index) => (
                  <div 
                    key={img.id} 
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative flex-shrink-0 group cursor-grab active:cursor-grabbing transition-all duration-300 ${
                      draggedThumbnailIdx === index ? 'opacity-30 scale-90' : 'opacity-100'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedId(img.id)}
                      className={`relative block h-20 w-20 overflow-hidden border-[3px] transition-all duration-300 ${
                        selectedId === img.id ? 'border-pink-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1' : 'border-black hover:border-pink-400'
                      }`}
                    >
                      <img src={img.preview} alt="Thumb" className="h-full w-full object-cover select-none pointer-events-none" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }} 
                      className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-black text-black flex items-center justify-center transition opacity-0 group-hover:opacity-100 hover:bg-pink-400 hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                <label className="flex-shrink-0 h-20 w-20 flex items-center justify-center border-[3px] border-dashed border-black bg-white hover:bg-pink-50 cursor-pointer transition-all">
                  <input type="file" multiple accept="image/jpeg,image/png" onChange={handleFileUpload} className="hidden" />
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px] font-bold">ADD</span>
                  </div>
                </label>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;

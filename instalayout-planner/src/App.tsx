import React, { useState, useRef } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { Upload, X, Move, Maximize2, Trash2, Plus, GripVertical, Settings2, Download, Loader2, RotateCcw, Check, Copy, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown } from 'lucide-react';
import { GridImage } from './types';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export default function App() {
  const [images, setImages] = useState<GridImage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [copiedColor, setCopiedColor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: GridImage[] = [];
    const fileArray = Array.from(files) as File[];

    for (const file of fileArray) {
      const url = URL.createObjectURL(file);
      
      // Get aspect ratio
      const aspectRatio = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
        img.onerror = () => resolve(1);
        img.src = url;
      });

      newImages.push({
        id: Math.random().toString(36).substr(2, 9),
        url,
        x: 50,
        y: 50,
        scale: 1,
        caption: '',
        aspectRatio,
        backgroundColor: '#ffffff',
      });
    }

    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const updateImage = (id: string, updates: Partial<GridImage>) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...updates } : img))
    );
  };

  const handleReset = (id: string) => {
    updateImage(id, {
      x: 50,
      y: 50,
      scale: 1,
      backgroundColor: '#ffffff',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(true);
    setTimeout(() => setCopiedColor(false), 2000);
  };

  const moveImage = (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index === -1) return prev;
      
      const newImages = [...prev];
      const [item] = newImages.splice(index, 1);
      
      if (direction === 'up') {
        const newIndex = Math.max(0, index - 1);
        newImages.splice(newIndex, 0, item);
      } else if (direction === 'down') {
        const newIndex = Math.min(prev.length - 1, index + 1);
        newImages.splice(newIndex, 0, item);
      } else if (direction === 'top') {
        newImages.unshift(item);
      } else if (direction === 'bottom') {
        newImages.push(item);
      }
      
      return newImages;
    });
  };

  const getImageStyle = (image: GridImage) => {
    if (!image.aspectRatio) return { width: '100%', height: '100%', objectFit: 'cover' as const };
    
    const targetAspect = 4 / 5;
    let baseWidth, baseHeight;
    
    if (image.aspectRatio > targetAspect) {
      // Landscape relative to 4:5 container
      baseHeight = 100;
      baseWidth = 100 * (image.aspectRatio / targetAspect);
    } else {
      // Portrait relative to 4:5 container
      baseWidth = 100;
      baseHeight = 100 / (image.aspectRatio / targetAspect);
    }
    
    const drawWidth = baseWidth * image.scale;
    const drawHeight = baseHeight * image.scale;
    
    // Align P% to P% logic
    const left = (100 - drawWidth) * (image.x / 100);
    const top = (100 - drawHeight) * (image.y / 100);
    
    return {
      width: `${drawWidth}%`,
      height: `${drawHeight}%`,
      left: `${left}%`,
      top: `${top}%`,
      position: 'absolute' as const,
      maxWidth: 'none',
      backgroundColor: image.backgroundColor || '#ffffff',
      objectFit: 'cover' as const, // Safety net to prevent distortion if container is slightly off
    };
  };

  const handleExport = async () => {
    if (images.length === 0) return;
    setIsExporting(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Standard IG 4:5 resolution
      const targetWidth = 1080;
      const targetHeight = 1350;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Process images in reverse order (last one is 01)
      const reversedImages = [...images].reverse();
      const now = new Date();
      const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;

      for (let i = 0; i < reversedImages.length; i++) {
        const imgData = reversedImages[i];
        const img = new Image();
        img.src = imgData.url;
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        // Clear canvas
        ctx.fillStyle = imgData.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Calculate base dimensions (scale = 1)
        const imgAspect = imgData.aspectRatio || (img.width / img.height);
        const targetAspect = targetWidth / targetHeight;

        let baseWidth, baseHeight;
        if (imgAspect > targetAspect) {
          baseHeight = targetHeight;
          baseWidth = baseHeight * imgAspect;
        } else {
          baseWidth = targetWidth;
          baseHeight = baseWidth / imgAspect;
        }

        // Apply scale
        const drawWidth = baseWidth * imgData.scale;
        const drawHeight = baseHeight * imgData.scale;

        // Calculate offset based on "Align P% to P%" logic
        const x = (targetWidth - drawWidth) * (imgData.x / 100);
        const y = (targetHeight - drawHeight) * (imgData.y / 100);

        ctx.drawImage(img, x, y, drawWidth, drawHeight);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        if (blob) {
          const baseName = `${dateStr}${(i + 1).toString().padStart(2, '0')}`;
          const fileName = `${baseName}.jpg`;
          saveAs(blob, fileName);
          
          // Export caption if exists
          if (imgData.caption && imgData.caption.trim()) {
            const textBlob = new Blob([imgData.caption], { type: 'text/plain;charset=utf-8' });
            saveAs(textBlob, `${baseName}.txt`);
          }
          
          // Small delay to help browsers handle multiple downloads
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportZip = async () => {
    if (images.length === 0) return;
    setIsExportingZip(true);

    try {
      const zip = new JSZip();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const targetWidth = 1080;
      const targetHeight = 1350;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const reversedImages = [...images].reverse();
      const now = new Date();
      const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;

      for (let i = 0; i < reversedImages.length; i++) {
        const imgData = reversedImages[i];
        const img = new Image();
        img.src = imgData.url;
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        ctx.fillStyle = imgData.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const imgAspect = imgData.aspectRatio || (img.width / img.height);
        const targetAspect = targetWidth / targetHeight;

        let baseWidth, baseHeight;
        if (imgAspect > targetAspect) {
          baseHeight = targetHeight;
          baseWidth = baseHeight * imgAspect;
        } else {
          baseWidth = targetWidth;
          baseHeight = baseWidth / imgAspect;
        }

        const drawWidth = baseWidth * imgData.scale;
        const drawHeight = baseHeight * imgData.scale;
        const x = (targetWidth - drawWidth) * (imgData.x / 100);
        const y = (targetHeight - drawHeight) * (imgData.y / 100);

        ctx.drawImage(img, x, y, drawWidth, drawHeight);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        if (blob) {
          const baseName = `${dateStr}${(i + 1).toString().padStart(2, '0')}`;
          zip.file(`${baseName}.jpg`, blob);
          
          if (imgData.caption && imgData.caption.trim()) {
            zip.file(`${baseName}.txt`, imgData.caption);
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `InstaLayout_${dateStr}.zip`);
    } catch (error) {
      console.error('ZIP Export failed:', error);
      alert('ZIP 導出失敗，請重試。');
    } finally {
      setIsExportingZip(false);
    }
  };

  const editingImage = images.find((img) => img.id === editingId);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-50 font-sans h-screen overflow-hidden">
      {/* Sidebar - Image List & Reordering */}
      <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-neutral-200 flex flex-col z-10 h-1/2 md:h-full sidebar-grid">
        <header className="p-8 bg-brand-yellow m-4 rounded-[2rem] border-2 border-black/5 shadow-sm">
          <h1 className="text-3xl font-black tracking-tighter text-brand-pink uppercase italic">InstaLayout</h1>
          <p className="text-xs font-bold text-black/40 uppercase tracking-widest mt-1">Creative Feed Tool</p>
          <div className="h-1 w-12 bg-white mt-4 rounded-full" />
        </header>

        <div className="p-4 flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02, rotate: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-4 px-4 bg-brand-cyan text-white rounded-2xl hover:opacity-90 transition-all font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] uppercase tracking-wider"
          >
            <Upload size={18} strokeWidth={3} />
            Add Photos
          </motion.button>
          
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              disabled={images.length === 0 || isExporting}
              className="flex flex-col items-center justify-center gap-1 py-3 px-2 bg-white border-2 border-brand-yellow text-neutral-900 rounded-2xl hover:bg-brand-yellow/10 transition-colors font-bold text-xs shadow-sm disabled:opacity-50"
            >
              <Download size={16} className="text-brand-pink" />
              <span>Export JPG</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportZip}
              disabled={images.length === 0 || isExportingZip}
              className="flex flex-col items-center justify-center gap-1 py-3 px-2 bg-white border-2 border-brand-cyan text-neutral-900 rounded-2xl hover:bg-brand-cyan/10 transition-colors font-bold text-xs shadow-sm disabled:opacity-50"
            >
              <Download size={16} className="text-brand-cyan" />
              <span>Export ZIP</span>
            </motion.button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            multiple
            accept="image/*"
            className="hidden"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.1em] mb-4 px-2">
            Feed Order (Drag to sort)
          </div>
          
          <Reorder.Group
            axis="y"
            values={images}
            onReorder={setImages}
            className="space-y-2"
          >
            {images.map((image) => (
              <Reorder.Item
                key={image.id}
                value={image}
                className="flex flex-col gap-0 bg-white border-2 border-neutral-100 rounded-[1.5rem] shadow-sm cursor-grab active:cursor-grabbing hover:border-brand-yellow transition-all group overflow-hidden"
              >
                <div className="p-4 bg-brand-yellow/5 flex items-center gap-3 border-b border-neutral-50">
                  <div className="w-14 aspect-[4/5] rounded-xl overflow-hidden bg-white flex-shrink-0 border-2 border-brand-yellow shadow-sm">
                    <img src={image.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-brand-pink uppercase tracking-widest">Photo Layer</p>
                    <p className="text-sm font-black text-neutral-900 truncate">Image {image.id.slice(0, 4)}</p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => setEditingId(image.id)}
                      className="p-1.5 text-brand-cyan hover:bg-brand-cyan/10 rounded-lg transition-colors"
                      title="Settings"
                    >
                      <Settings2 size={16} strokeWidth={2.5} />
                    </button>
                    
                    <div className="flex flex-col gap-0.5 bg-neutral-100/50 p-0.5 rounded-md border border-neutral-200/50">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveImage(image.id, 'top'); }}
                        className="p-1 text-neutral-400 hover:text-brand-pink hover:bg-white rounded transition-all"
                        title="Move to Top"
                      >
                        <ChevronsUp size={12} strokeWidth={3} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveImage(image.id, 'up'); }}
                        className="p-1 text-neutral-400 hover:text-brand-pink hover:bg-white rounded transition-all"
                        title="Move Up"
                      >
                        <ChevronUp size={12} strokeWidth={3} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveImage(image.id, 'down'); }}
                        className="p-1 text-neutral-400 hover:text-brand-pink hover:bg-white rounded transition-all"
                        title="Move Down"
                      >
                        <ChevronDown size={12} strokeWidth={3} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveImage(image.id, 'bottom'); }}
                        className="p-1 text-neutral-400 hover:text-brand-pink hover:bg-white rounded transition-all"
                        title="Move to Bottom"
                      >
                        <ChevronsDown size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="relative">
                    <textarea
                      value={image.caption || ''}
                      onChange={(e) => updateImage(image.id, { caption: e.target.value })}
                      placeholder="Write a caption..."
                      className="w-full text-xs p-3 bg-neutral-50 border-2 border-transparent rounded-xl focus:outline-none focus:border-brand-yellow focus:bg-white transition-all resize-none min-h-[70px] cursor-text font-medium"
                      rows={2}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                    <span className="text-neutral-400">Status: Active</span>
                    <button 
                      onClick={() => setEditingId(image.id)}
                      className="text-brand-cyan flex items-center gap-1 hover:underline"
                    >
                      Adjust Crop <Plus size={8} />
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            ))}
            
            {images.length === 0 && (
              <div className="text-center py-12 px-4 border-2 border-dashed border-neutral-100 rounded-2xl">
                <p className="text-sm text-neutral-400">No images uploaded yet</p>
              </div>
            )}
          </Reorder.Group>
        </div>
      </div>

      {/* Main Preview Area */}
      <main className="flex-1 p-4 md:p-8 flex justify-center overflow-y-scroll bg-neutral-50 h-1/2 md:h-full scroll-smooth relative">
        <div 
          className="w-full max-w-[420px] flex flex-col gap-8 py-8 min-h-min bg-neutral-50"
        >
          {/* Profile Header Mockup */}
          <div className="flex items-center gap-6 px-4 flex-shrink-0">
            <div 
              className="w-20 h-20 rounded-full flex-shrink-0 border border-neutral-300 bg-neutral-200"
            />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-neutral-200" />
              <div className="flex gap-4">
                <div className="h-3 w-12 rounded bg-neutral-100" />
                <div className="h-3 w-12 rounded bg-neutral-100" />
                <div className="h-3 w-12 rounded bg-neutral-100" />
              </div>
            </div>
          </div>

          {/* Grid Display (Static Order from Sidebar) */}
          <div 
            className="rounded-2xl shadow-xl overflow-hidden border border-neutral-200 bg-white ring-1 ring-black/5 flex-shrink-0 mb-12"
          >
            <div className="grid grid-cols-3 gap-[1px] bg-neutral-200">
              {images.map((image) => (
                <motion.div
                  key={image.id}
                  whileHover={{ scale: 1.05, zIndex: 10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative aspect-[4/5] overflow-hidden group cursor-pointer shadow-sm hover:shadow-xl bg-white"
                  onClick={() => setEditingId(image.id)}
                >
                  <div className="absolute inset-0" style={{ backgroundColor: image.backgroundColor || '#ffffff' }}>
                    <img
                      src={image.url}
                      alt=""
                      style={getImageStyle(image)}
                      onLoad={(e) => {
                        if (!image.aspectRatio) {
                          updateImage(image.id, { 
                            aspectRatio: e.currentTarget.naturalWidth / e.currentTarget.naturalHeight 
                          });
                        }
                      }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <Settings2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                  </div>
                </motion.div>
              ))}
              
              {/* Ensure at least 9 slots are visible */}
              {images.length < 9 && Array.from({ length: 9 - images.length }).map((_, i) => (
                <div 
                  key={`empty-${i}`} 
                  className="aspect-[4/5] flex items-center justify-center bg-neutral-50"
                >
                  <Plus size={20} className="text-neutral-200" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Extra padding at bottom to ensure scrollability */}
          <div className="h-20" />
        </div>
      </main>

      {/* Floating Editor Modal */}
      <AnimatePresence>
        {editingImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingId(null)}
              className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[800px]"
            >
              {/* Preview Side */}
              <div 
                className="w-full md:w-[440px] flex-shrink-0 aspect-[4/5] flex items-center justify-center overflow-hidden relative border-b md:border-b-0 md:border-r border-neutral-100 cursor-pointer bg-neutral-50"
                style={{ backgroundColor: editingImage.backgroundColor || '#ffffff' }}
                onDoubleClick={() => setShowGrid(!showGrid)}
              >
                <div className="absolute inset-0">
                   <img
                    src={editingImage.url}
                    alt=""
                    style={getImageStyle(editingImage)}
                    onLoad={(e) => {
                      if (!editingImage.aspectRatio) {
                        updateImage(editingImage.id, { 
                          aspectRatio: e.currentTarget.naturalWidth / e.currentTarget.naturalHeight 
                        });
                      }
                    }}
                    referrerPolicy="no-referrer"
                  />
                  {/* Grid Lines Overlay */}
                  <AnimatePresence>
                    {showGrid && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none"
                      >
                        <div className="border-r border-white" />
                        <div className="border-r border-white" />
                        <div />
                        <div className="border-b border-white col-span-3" />
                        <div className="border-b border-white col-span-3" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Hint Overlay */}
                  {!showGrid && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none group">
                      <div className="bg-black/20 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Double click to crop
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls Side */}
              <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xl">Adjust Crop</h3>
                  <button 
                    onClick={() => setEditingId(null)}
                    className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-semibold text-neutral-600">
                      <span>Zoom</span>
                      <span className="bg-neutral-100 px-2 py-0.5 rounded text-xs">{Math.round(editingImage.scale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.01"
                      value={editingImage.scale}
                      onChange={(e) => updateImage(editingImage.id, { scale: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-semibold text-neutral-600">
                      <span>Background Color</span>
                      <button 
                        onClick={() => copyToClipboard(editingImage.backgroundColor || '#FFFFFF')}
                        className="flex items-center gap-1.5 bg-neutral-100 px-2 py-0.5 rounded text-xs uppercase hover:bg-neutral-200 transition-colors group"
                      >
                        {editingImage.backgroundColor || '#FFFFFF'}
                        {copiedColor ? <Check size={10} className="text-green-600" /> : <Copy size={10} className="text-neutral-400 group-hover:text-neutral-600" />}
                        {copiedColor && <span className="text-[8px] font-bold text-green-600">COPIED!</span>}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={editingImage.backgroundColor || '#ffffff'}
                        onChange={(e) => updateImage(editingImage.id, { backgroundColor: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border-none p-0 bg-transparent"
                      />
                      <div className="flex gap-2">
                        {['#ffffff', '#000000', '#f9e100', '#ff66cc', '#00aeef', '#f5f5f5'].map((color) => (
                          <button
                            key={color}
                            onClick={() => updateImage(editingImage.id, { backgroundColor: color })}
                            className="w-6 h-6 rounded-full border border-neutral-200 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-semibold text-neutral-600">
                      <span>Horizontal Position</span>
                      <span className="bg-neutral-100 px-2 py-0.5 rounded text-xs">{editingImage.x}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="300"
                      value={editingImage.x}
                      onChange={(e) => updateImage(editingImage.id, { x: parseInt(e.target.value) })}
                      className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-semibold text-neutral-600">
                      <span>Vertical Position</span>
                      <span className="bg-neutral-100 px-2 py-0.5 rounded text-xs">{editingImage.y}%</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="300"
                      value={editingImage.y}
                      onChange={(e) => updateImage(editingImage.id, { y: parseInt(e.target.value) })}
                      className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                    />
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleReset(editingImage.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-neutral-100 text-neutral-600 rounded-xl hover:bg-neutral-200 transition-colors text-sm font-bold"
                  >
                    <RotateCcw size={18} />
                    Reset to Original
                  </motion.button>
                  
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02, x: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => removeImage(editingImage.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-sm font-bold"
                    >
                      <Trash2 size={18} />
                      Delete
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setEditingId(null)}
                      className="flex-1 py-3 px-4 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors text-sm font-bold hover-shine"
                    >
                      Save Changes
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

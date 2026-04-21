import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Play, Download, Settings2, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Loader2, Video } from 'lucide-react';
import GIF from 'gif.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Slider } from '../../components/ui/slider';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../lib/utils';

interface Frame {
  id: string;
  url: string;
  file: File;
}

export default function GifMaker() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [interval, setIntervalValue] = useState<number>(0.2); // seconds
  const [useTransparency, setUseTransparency] = useState(true);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGif, setGeneratedGif] = useState<string | null>(null);
  const [generatedMp4, setGeneratedMp4] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'webm'>('mp4');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const files = Array.from(fileList) as File[];
    if (files.length === 0) return;

    const newFrames: Frame[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      url: URL.createObjectURL(file),
      file: file,
    }));

    setFrames((prev) => [...prev, ...newFrames]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFrame = (id: string) => {
    setFrames((prev) => {
      const frameToRemove = prev.find((f) => f.id === id);
      if (frameToRemove) URL.revokeObjectURL(frameToRemove.url);
      return prev.filter((f) => f.id !== id);
    });
  };

  const moveFrame = (index: number, direction: 'up' | 'down') => {
    const newFrames = [...frames];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFrames.length) return;

    [newFrames[index], newFrames[targetIndex]] = [newFrames[targetIndex], newFrames[index]];
    setFrames(newFrames);
  };

  const duplicateFrameToEnd = (frame: Frame) => {
    const newFrame: Frame = {
      ...frame,
      id: Math.random().toString(36).substring(7),
    };
    setFrames((prev) => [...prev, newFrame]);
  };

  const generateGif = async () => {
    if (frames.length < 2) {
      setError('請至少上傳兩張圖片來生成 GIF。');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedGif(null);
    setGeneratedMp4(null);

    try {
      const firstImg = new Image();
      firstImg.src = frames[0].url;
      await new Promise((resolve, reject) => {
        firstImg.onload = resolve;
        firstImg.onerror = reject;
      });

      const targetW = firstImg.width;
      const targetH = firstImg.height;

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not get canvas context');

      // Initialize GIF.js
      // Using a Blob URL to bypass same-origin policy for the worker
      const workerCode = `importScripts("https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js");`;
      const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(workerBlob);

      const gif = new GIF({
        workers: 2,
        quality: 1, // Set to 1 for maximum color precision
        width: targetW,
        height: targetH,
        workerScript: workerUrl,
        transparent: useTransparency ? (0x00FF01 as any) : undefined,
        dither: false
      });

      const transKeyHex = '#00FF01';

      for (const frame of frames) {
        const img = new Image();
        img.src = frame.url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        if (useTransparency) {
          // Manual transparency thresholding
          // We scan the pixels and force anything "mostly transparent" to be the exact key color
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            // Loosen the range: if alpha < 160, force it to the transparent key color
            // This effectively "eats" into semi-transparent edges to ensure they become transparent in GIF
            if (data[i + 3] < 160) {
              data[i] = 0;     // R
              data[i + 1] = 255; // G
              data[i + 2] = 1;   // B
              data[i + 3] = 255; // Must be opaque so the GIF encoder sees the color to map it
            }
          }
          ctx.putImageData(imageData, 0, 0);
        } else {
          // Non-transparent mode: draw background behind the image
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalCompositeOperation = 'source-over';
        }
        
        // Add frame to GIF.js using the canvas element directly
        gif.addFrame(canvas, {
          delay: interval * 1000,
          copy: true
        });
      }

      gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        setGeneratedGif(url);
        setIsGenerating(false);
        URL.revokeObjectURL(workerUrl); // Clean up
      });

      gif.render();
    } catch (err) {
      setError('處理圖片時發生錯誤：' + (err instanceof Error ? err.message : '未知錯誤'));
      console.error(err);
      setIsGenerating(false);
    }
  };

  const generateVideo = async () => {
    if (frames.length < 2) {
      setError('請至少上傳兩張圖片來生成影片。');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedGif(null);
    setGeneratedMp4(null);
    setOutputFormat(useTransparency ? 'webm' : 'mp4');

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not found');

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not get canvas context');

      // Determine dimensions from first image
      const firstImg = new Image();
      firstImg.src = frames[0].url;
      await new Promise((resolve, reject) => {
        firstImg.onload = resolve;
        firstImg.onerror = reject;
      });

      const targetW = firstImg.width;
      const targetH = firstImg.height;
      
      canvas.width = targetW;
      canvas.height = targetH;

      // Determine mime type
      let mimeType = 'video/webm;codecs=vp9';
      
      if (!useTransparency) {
        mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') 
          ? 'video/mp4;codecs=avc1' 
          : 'video/webm';
      }

      const fps = 30;
      const stream = canvas.captureStream(0); 
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 12000000 
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      const onStopPromise = new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          setGeneratedMp4(url);
          setIsGenerating(false);
          resolve(true);
        };
      });

      mediaRecorder.start();

      const framesToHold = Math.max(1, Math.floor(interval * fps));

      for (const frame of frames) {
        const img = new Image();
        img.src = frame.url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        for (let i = 0; i < framesToHold; i++) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

          if (useTransparency) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let j = 0; j < data.length; j += 4) {
              if (data[j + 3] < 160) data[j + 3] = 0;
            }
            ctx.putImageData(imageData, 0, 0);
          } else {
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
          }
          
          // Force track request for manual capture control
          (stream.getVideoTracks()[0] as any).requestFrame();
          await new Promise(resolve => setTimeout(resolve, 1000 / fps));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      mediaRecorder.stop();
      await onStopPromise;
    } catch (err) {
      setError('生成影片時發生錯誤：' + (err instanceof Error ? err.message : '未知錯誤'));
      console.error(err);
      setIsGenerating(false);
    }
  };

  const downloadGif = () => {
    if (!generatedGif) return;
    const link = document.createElement('a');
    link.href = generatedGif;
    link.download = `animation-${Date.now()}.gif`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadMp4 = () => {
    if (!generatedMp4) return;
    const extension = outputFormat === 'webm' ? 'webm' : 'mp4';
    const link = document.createElement('a');
    link.href = generatedMp4;
    link.download = `animation-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAll = () => {
    frames.forEach((f) => URL.revokeObjectURL(f.url));
    setFrames([]);
    setGeneratedGif(null);
    setGeneratedMp4(null);
    setError(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
      <header className="text-center space-y-2">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
        >
          GIF 生產機
        </motion.h1>
        <p className="text-muted-foreground text-lg">
          上傳 PNG 圖片，輕鬆製作專屬動畫
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls & Upload */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-2 border-dashed border-muted bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer relative group"
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-medium">點擊或拖拽上傳圖片</p>
                <p className="text-sm text-muted-foreground">支援 PNG, JPG, WebP</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple 
                accept="image/*" 
                className="hidden" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                動畫設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="interval">幀間隔 (秒)</Label>
                </div>
                <Input
                  id="interval"
                  type="number"
                  min={0.01}
                  max={10}
                  step={0.01}
                  value={interval}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setIntervalValue(isNaN(val) ? 0.2 : val);
                  }}
                  onBlur={() => {
                    if (interval < 0.01) setIntervalValue(0.01);
                  }}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  數值越小，動畫速度越快。預設為 0.20s。
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="transparency">保留透明背景</Label>
                  <p className="text-xs text-muted-foreground">
                    僅支援 PNG/WebP 透明圖層
                  </p>
                </div>
                <Button 
                  variant={useTransparency ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setUseTransparency(!useTransparency)}
                >
                  {useTransparency ? "已開啟" : "已關閉"}
                </Button>
              </div>

              {!useTransparency && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 pt-2"
                >
                  <Label>背景顏色</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: '白色', color: '#ffffff' },
                      { name: '黑', color: '#000000' },
                      { name: '綠幕', color: '#00ff00' },
                    ].map((preset) => (
                      <button
                        key={preset.color}
                        className={cn(
                          "w-8 h-8 rounded-full border shadow-sm transition-transform hover:scale-110",
                          bgColor === preset.color && "ring-2 ring-primary ring-offset-2"
                        )}
                        style={{ backgroundColor: preset.color }}
                        onClick={() => setBgColor(preset.color)}
                        title={preset.name}
                      />
                    ))}
                    <div className="relative w-8 h-8 rounded-full border shadow-sm overflow-hidden group">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                      />
                    </div>
                  </div>
                  <Input 
                    value={bgColor} 
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-8 text-xs uppercase"
                    placeholder="#FFFFFF"
                  />
                </motion.div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button 
                  variant="outline"
                  onClick={generateGif}
                  disabled={frames.length < 2 || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      GIF
                    </>
                  )}
                </Button>
                <Button 
                  onClick={generateVideo}
                  disabled={frames.length < 2 || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      {useTransparency ? 'WebM' : 'MP4'}
                    </>
                  )}
                </Button>
              </div>
              {frames.length > 0 && (
                <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={clearAll}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  清空所有圖片
                </Button>
              )}
            </CardFooter>
          </Card>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* Middle Column: Frames */}
        <div className={cn(
          "space-y-6",
          (generatedGif || generatedMp4) ? "lg:col-span-5" : "lg:col-span-9"
        )}>
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>圖片序列</CardTitle>
                <CardDescription>
                  共 {frames.length} 張圖片。您可以調整順序或刪除圖片。
                </CardDescription>
              </div>
              {frames.length > 0 && (
                <Badge variant="outline">{frames.length} 幀</Badge>
              )}
            </CardHeader>
            <CardContent className="flex-1">
              {frames.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                  <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p>尚未上傳任何圖片</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                      {frames.map((frame, index) => (
                        <motion.div
                          key={frame.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="group relative aspect-square rounded-md overflow-hidden border bg-muted"
                        >
                          <img 
                            src={frame.url} 
                            alt={`Frame ${index + 1}`} 
                            className={cn(
                              "w-full h-full object-contain",
                              useTransparency ? "bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYV2NkYGD4z8DAwMgABXgKIvHIAgD6WwoDBH769QAAAABJRU5ErkJggg==')]" : ""
                            )}
                            style={!useTransparency ? { backgroundColor: bgColor } : {}}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <div className="flex gap-1">
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className="h-8 w-8"
                                onClick={() => moveFrame(index, 'up')}
                                disabled={index === 0}
                                title="向前移"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className="h-8 w-8"
                                onClick={() => moveFrame(index, 'down')}
                                disabled={index === frames.length - 1}
                                title="向後移"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className="h-8 w-8"
                                onClick={() => duplicateFrameToEnd(frame)}
                                title="複製到最後"
                              >
                                <Play className="h-4 w-4 rotate-90" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="destructive" 
                                className="h-8 w-8"
                                onClick={() => removeFrame(frame.id)}
                                title="刪除"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="absolute bottom-1 left-1">
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 min-w-4 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Preview Section */}
        <AnimatePresence mode="wait">
          {(generatedGif || generatedMp4) && (
            <motion.div
              key={generatedGif ? 'gif' : 'mp4'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-4 space-y-6"
            >
              <Card className="overflow-hidden border-primary/20 bg-primary/5 sticky top-8">
                <CardHeader>
                  <CardTitle>生成結果預覽</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-6">
                  <div className="relative group w-full">
                    {generatedGif && (
                      <div className={cn(
                        "relative rounded-lg overflow-hidden border-4 border-white shadow-2xl mx-auto",
                        useTransparency && "bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYV2NkYGD4z8DAwMgABXgKIvHIAgD6WwoDBH769QAAAABJRU5ErkJggg==')]"
                      )}
                      style={!useTransparency ? { backgroundColor: bgColor } : {}}
                      >
                        <img 
                          src={generatedGif} 
                          alt="Generated GIF" 
                          className="max-w-full h-auto mx-auto"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-primary text-primary-foreground">GIF</Badge>
                        </div>
                      </div>
                    )}
                    {generatedMp4 && (
                      <div className={cn(
                        "relative rounded-lg overflow-hidden border-4 border-white shadow-2xl mx-auto",
                        useTransparency && "bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYV2NkYGD4z8DAwMgABXgKIvHIAgD6WwoDBH769QAAAABJRU5ErkJggg==')]"
                      )}
                      style={!useTransparency ? { backgroundColor: bgColor } : {}}
                      >
                        <video 
                          src={generatedMp4} 
                          controls 
                          autoPlay 
                          loop 
                          className="max-w-full h-auto mx-auto"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-primary text-primary-foreground">
                            {outputFormat === 'webm' ? 'WebM (Alpha)' : 'MP4'}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button size="lg" className="w-full" onClick={generatedGif ? downloadGif : downloadMp4}>
                    <Download className="mr-2 h-4 w-4" />
                    下載 {generatedGif ? 'GIF' : (outputFormat === 'webm' ? 'WebM' : 'MP4')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Hidden Canvas for MP4 Generation */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

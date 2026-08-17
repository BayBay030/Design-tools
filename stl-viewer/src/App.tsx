import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { 
  RenderMode, 
  MaterialColor, 
  LightingPreset, 
  ModelStats, 
  DEMO_MODELS, 
  DEMO_MODELS as demoConf 
} from './types';
import { calculateGeometryStats, createDemoGeometry, exportToStlAscii } from './utils/geometryUtils';
import { loadStlFile } from './utils/stlLoaderHelper';
import { ThreeViewer } from './components/ThreeViewer';
import { ControlPanel } from './components/ControlPanel';
import { Instructions } from './components/Instructions';
import { Box, Sparkles, Cpu, Hammer, RefreshCw, Zap, XCircle, Ruler, ShieldCheck, Instagram, Mail, Home } from 'lucide-react';

export default function App() {
  // 3D parameters state managers
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);
  
  const [selectedDemoId, setSelectedDemoId] = useState<string>('torus-knot');
  const [renderMode, setRenderMode] = useState<RenderMode>('solid');
  const [materialColor, setMaterialColor] = useState<string>('silver');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [rotationSpeed, setRotationSpeed] = useState<number>(1.2);
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [axesVisible, setAxesVisible] = useState<boolean>(true);
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('studio');
  const [canvasBg, setCanvasBg] = useState<'dark' | 'blueprint' | 'light' | 'greenscreen'>('blueprint');
  const [cameraAngle, setCameraAngle] = useState<'front' | 'top' | 'side' | 'isometric' | null>(null);

  // Custom manual coordinate aligns
  const [axisXOffset, setAxisXOffset] = useState<number>(0);
  const [axisYOffset, setAxisYOffset] = useState<number>(0);
  const [axisZOffset, setAxisZOffset] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize with Torus Knot demo on mount
  useEffect(() => {
    handleSelectDemo('torus-knot');
  }, []);

  // Handle demo state switcher
  const handleSelectDemo = (demoId: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const demo = DEMO_MODELS.find(d => d.id === demoId);
      if (!demo) return;

      const geo = createDemoGeometry(demo.type);
      setGeometry(geo);

      // Estimate placeholder sizes for demos
      let mockSize = 35000; // ~35KB
      if (demoId === 'torus-knot') mockSize = 142000;
      if (demoId === 'tech-cube') mockSize = 24000;
      if (demoId === 'cone-pyramid') mockSize = 18000;
      if (demoId === 'heart-pendant') mockSize = 78000;

      const info = calculateGeometryStats(geo, `${demo.name.split(' ')[0]}.stl`, mockSize);
      setStats(info);
      setSelectedDemoId(demoId);
      setAxisXOffset(0);
      setAxisYOffset(0);
      setAxisZOffset(0);
    } catch (err) {
      setErrorMsg('載入內建展示模型時出錯！');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle custom user drag-and-drop or file upload
  const handleUploadFile = async (file: File) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const isStep = file.name.toLowerCase().endsWith('.step') || file.name.toLowerCase().endsWith('.stp');
      let geo: THREE.BufferGeometry;

      if (isStep) {
        const { loadStepFile } = await import('./utils/stepLoaderHelper');
        geo = await loadStepFile(file);
      } else {
        geo = await loadStlFile(file);
      }

      setGeometry(geo);

      const info = calculateGeometryStats(geo, file.name, file.size);
      setStats(info);

      setSelectedDemoId(''); // Clear selected demo to show it's custom
      setRenderMode('solid'); // Default to solid for clean upload preview
      setAxisXOffset(0);
      setAxisYOffset(0);
      setAxisZOffset(0);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '解析檔案出錯，請確認此為標準 ASCII/Binary 格式之 .stl 模型，或是標準之 .step/.stp CAD 實體。');
    } finally {
      setLoading(false);
    }
  };

  // Trigger 3D rotating visual recording
  const handleRecordVideo = () => {
    if (!geometry) {
      alert('無可用的網格結構引發錄影功能。');
      return;
    }
    setRecordingProgress(0);
    setIsRecording(true);
  };

  const handleRecordingComplete = (blob: Blob) => {
    setIsRecording(false);
    setRecordingProgress(0);

    if (blob.size === 0) {
      setErrorMsg('生成 3D 旋轉影片失敗，可能您的瀏覽器安全沙盒限制了 WebGL 緩衝串流擷取。');
      return;
    }

    const clearName = stats?.name ? stats.name.split('.')[0] : 'custom-model';
    const filename = `${clearName}-360-spin.mp4`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export and download active 3D geometry as an ASCII STL file
  const handleDownloadStl = () => {
    if (!geometry) {
      alert('無可用的網格結構進行導出。');
      return;
    }
    
    setLoading(true);
    try {
      const originalName = stats?.name ? stats.name : 'model';
      let filename = originalName;
      
      // If the file was a STEP/STP file, replace the extension with .stl
      if (filename.toLowerCase().endsWith('.step') || filename.toLowerCase().endsWith('.stp')) {
        filename = filename.replace(/\.(step|stp)$/i, '') + '_converted.stl';
      } else if (!filename.toLowerCase().endsWith('.stl')) {
        filename = filename + '.stl';
      }

      const stlContent = exportToStlAscii(geometry, filename.replace(/\.stl$/i, ''));
      const blob = new Blob([stlContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg('匯出並轉換為 STL 檔案時發生錯誤。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reset all values back to beautiful vanilla state
  const handleResetAll = () => {
    setRenderMode('solid');
    setMaterialColor('silver');
    setAutoRotate(true);
    setRotationSpeed(1.2);
    setGridVisible(true);
    setAxesVisible(true);
    setLightingPreset('studio');
    setCanvasBg('blueprint');
    setCameraAngle(null);
    setAxisXOffset(0);
    setAxisYOffset(0);
    setAxisZOffset(0);
    handleSelectDemo('torus-knot');
  };

  return (
    <div id="main-applet" className="min-h-screen bg-graph-grid text-slate-900 flex flex-col font-sans transition-all selection:bg-[#CAFF04] selection:text-black pb-12">
      
      {/* Visual Navigation Bar */}
      <header className="sticky top-0 z-50 bg-black text-[#CAFF04] border-b-4 border-black px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 border-2 border-[#CAFF04] bg-neutral-900 flex items-center justify-center transform rotate-3 shadow-[2px_2px_0px_#CAFF04]">
            <Cpu className="w-5.5 h-5.5 text-[#CAFF04] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest uppercase text-[#CAFF04] text-left">3D_SPECTRAL_ENGINE</span>
              <span className="text-[9px] bg-[#ef4444] text-white border border-black font-mono px-2 py-0.5 rounded-none font-black tracking-wider">CLIENT_BOUNDED v2.5</span>
            </div>
            <h1 className="text-xs font-bold text-white tracking-widest text-left uppercase">HYPER 3-DIMENSIONAL GRAPHIC PROCESSOR</h1>
          </div>
        </div>

        {/* Indicator badges */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {/* Back to the Design Gadgets hub — matches the START button the other tools have */}
          <a
            href="/"
            className="flex items-center gap-1.5 py-1 px-3 bg-[#CAFF04] border-2 border-black text-black shrink-0 font-extrabold shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase tracking-wider no-underline hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span>HOME</span>
          </a>
          <div className="flex items-center gap-1.5 py-1 px-3 bg-[#2563eb] border-2 border-[#CAFF04] text-white shrink-0 font-extrabold shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <Hammer className="w-3.5 h-3.5 text-white" />
            <span>3D_WEBGL_2.0</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 py-1 px-3 bg-neutral-950 border-2 border-[#CAFF04] text-[#CAFF04] font-extrabold shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <span className="w-2 h-2 bg-lime-400 rounded-full animate-ping"></span>
            <span>3D_REACTOR_LIVE</span>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-8">
        
        {/* Giant Poster-like Headers! */}
        {/* overflow-hidden keeps the decorative glows from pushing the page wider than the viewport */}
        <div className="relative mt-2 mb-4 overflow-hidden">
          {/* Neon/spray color backdrops */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-spray-red opacity-25 pointer-events-none rounded-full blur-xl animate-pulse" />
          <div className="absolute top-12 -right-12 w-60 h-60 bg-spray-lime opacity-30 pointer-events-none rounded-full blur-xl animate-bounce" />
          
          <div className="bg-[#ef4444] text-white text-[10px] font-mono font-black tracking-widest px-4 py-1.5 border-3 border-black inline-flex items-center gap-1.5 uppercase transform -rotate-1 shadow-[3px_3px_0px_#000000] mb-4">
            <Zap className="w-3 h-3 shrink-0" />
            3D ENGINE CORE // STEREOLITHOGRAPHY ANALYZER DECK
            <Zap className="w-3 h-3 shrink-0" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-neutral-900 text-left select-none relative z-10 leading-none">
            <span className="bg-[#CAFF04] text-black border-4 border-black px-6 py-2.5 inline-block skew-x-[-6deg] shadow-[6px_6px_0px_#000000] transform hover:scale-103 transition-transform">
              DOUJIMA 3D
            </span>
            <span className="block mt-2 bg-white text-black border-4 border-black px-6 py-2 inline-block skew-x-[3deg] shadow-[6px_6px_0px_#000000] transform hover:scale-103 transition-transform">
              STL CATALOG LAB
            </span>
          </h1>
          
          {/* Interactive English technical tags */}
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <span className="text-[10px] bg-black text-[#CAFF04] border-2 border-black px-3 py-1 font-mono font-black tracking-widest rotate-1 shadow-[2px_2px_0px_#000000]">
              [VERTEX_MATRIX_RESOLVER]
            </span>
            <span className="text-[10px] bg-[#ef4444] text-white border-2 border-black px-3 py-1 font-mono font-black tracking-widest -rotate-1 shadow-[2px_2px_0px_#000000]">
              [3D_MESH_DENSE: EXTREME]
            </span>
            <span className="text-[10px] bg-[#0055ff] text-white border-2 border-black px-3 py-1 font-mono font-black tracking-widest rotate-2 shadow-[2px_2px_0px_#000000]">
              [3D_SPECTRAL_LIGHTING_TRUE]
            </span>
          </div>
        </div>

        {/* Loading and Error Overlays */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-none bg-rose-100 border-4 border-black text-rose-800 text-xs text-left font-black tracking-wide brutalist-shadow-sm flex items-start gap-2"
          >
            <XCircle className="w-4 h-4 shrink-0 mt-px" />
            <span><b className="uppercase">[SYSTEM ERROR ENCOUNTERED]:</b> {errorMsg}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: 3D Visual Stage (Main Area) - spans 8 columns */}
          <div className="lg:col-span-8 flex flex-col gap-6 w-full">
            <div className="aspect-[16/10] min-h-[460px] md:min-h-[520px] relative border-4 border-black brutalist-shadow-lg p-1 bg-black">
              
              {/* Spinner */}
              {loading && (
                <div className="absolute inset-0 bg-neutral-900/90 z-30 flex flex-col items-center justify-center gap-4 rounded-none border-2 border-[#CAFF04]">
                  <RefreshCw className="w-12 h-12 text-[#CAFF04] animate-spin" />
                  <p className="text-xs font-mono text-[#CAFF04] font-black tracking-widest uppercase flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 shrink-0" />
                    RESOLVING 3D_TESS_VERTICES & TOPOLOGY_MAT...
                  </p>
                </div>
              )}

              {/* Three.js Viewer Component */}
              <ThreeViewer
                geometry={geometry}
                renderMode={renderMode}
                materialColor={materialColor}
                autoRotate={autoRotate}
                rotationSpeed={rotationSpeed}
                gridVisible={gridVisible}
                axesVisible={axesVisible}
                lightingPreset={lightingPreset}
                cameraAngle={cameraAngle}
                onCameraAngleReset={() => setCameraAngle(null)}
                canvasBg={canvasBg}
                isRecording={isRecording}
                onRecordingComplete={handleRecordingComplete}
                onRecordingProgress={setRecordingProgress}
                recordingProgress={recordingProgress}
                axisXOffset={axisXOffset}
                axisYOffset={axisYOffset}
                axisZOffset={axisZOffset}
              />
            </div>

            {/* Quick Helper Tips Panel below the canvas */}
            <div className="flex flex-col sm:flex-row p-5 rounded-none bg-[#0055ff] text-white border-4 border-black gap-4 text-left items-start sm:items-center brutalist-shadow-sm relative">
              <span className="flex items-center gap-2 text-xs bg-black text-[#CAFF04] border-2 border-[#CAFF04] px-4 py-1.5 font-mono font-black shrink-0 uppercase tracking-widest rotate-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                3D_SECURITY:
              </span>
              <p className="text-xs font-black tracking-wide leading-relaxed">
                100% OFF-LINE PRIVATE ARCHITECTURE • STL PARSER IS BOUNDED WITHIN YOUR BROWSER RUNTIME. NO DATA WILL EVER TOUCH REMOTE SERVERS. MAX SECURITY COMPLIANT!
              </p>
            </div>
          </div>

          {/* RIGHT: System Control Deck & Stats - spans 4 columns */}
          <div className="lg:col-span-4 w-full">
            <ControlPanel
              stats={stats}
              selectedDemoId={selectedDemoId}
              renderMode={renderMode}
              materialColor={materialColor}
              autoRotate={autoRotate}
              rotationSpeed={rotationSpeed}
              gridVisible={gridVisible}
              axesVisible={axesVisible}
              lightingPreset={lightingPreset}
              canvasBg={canvasBg}
              isRecording={isRecording}
              recordingProgress={recordingProgress}
              axisXOffset={axisXOffset}
              axisYOffset={axisYOffset}
              axisZOffset={axisZOffset}
              
              onUploadFile={handleUploadFile}
              onSelectDemo={handleSelectDemo}
              onRenderModeChange={setRenderMode}
              onMaterialColorChange={setMaterialColor}
              onAutoRotateToggle={() => setAutoRotate(!autoRotate)}
              onRotationSpeedChange={setRotationSpeed}
              onGridToggle={() => setGridVisible(!gridVisible)}
              onAxesToggle={() => setAxesVisible(!axesVisible)}
              onLightingPresetChange={setLightingPreset}
              onCameraAngleChange={setCameraAngle}
              onCanvasBgChange={setCanvasBg}
              onDownloadStl={handleDownloadStl}
              onRecordVideo={handleRecordVideo}
              onResetAll={handleResetAll}
              onAxisXOffsetChange={setAxisXOffset}
              onAxisYOffsetChange={setAxisYOffset}
              onAxisZOffsetChange={setAxisZOffset}
            />
          </div>

        </div>

        {/* BOTTOM: Educational FAQ instructions panel */}
        <div className="w-full text-left mt-4">
          <Instructions />
        </div>

      </main>

      {/* Footer credits and information */}
      <footer className="border-t-4 border-black bg-black text-white py-12 px-6 text-center mt-12 flex flex-col gap-3 relative select-none">
        <div className="flex justify-center gap-1 text-[11px] font-mono tracking-widest text-[#ef4444] font-black uppercase mb-1">
          <span>//</span> <span>3D_MODEL_LAB_TERMINAL</span> <span>//</span>
        </div>
        {/* Author credit — same contact details as the Design Gadgets hub footer */}
        <p className="text-sm text-[#CAFF04] font-mono font-black tracking-wider">
          ⊹ 𝘽🜁𝙔𝘽🜁𝙔 (蓓蓓)
        </p>
        <p className="text-[11px] text-neutral-300 font-bold tracking-wide max-w-2xl mx-auto leading-relaxed">
          讓每一個創作更輕鬆。本工具由藝術家自行開發建置，無後端資料庫，檔案不會上傳，全程在你的瀏覽器內運算。
        </p>

        <div className="flex flex-wrap justify-center items-center gap-3 mt-2">
          <a
            href="https://www.instagram.com/blahbay____"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#CAFF04] text-black border-2 border-white px-4 py-2 font-mono font-black text-xs normal-case tracking-wider shadow-[3px_3px_0px_#ffffff] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#ffffff] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <Instagram className="w-4 h-4 shrink-0" />
            @blahbay____
          </a>
          <a
            href="mailto:brenda.suitcase@gmail.com"
            className="flex items-center gap-2 bg-white text-black border-2 border-white px-4 py-2 font-mono font-black text-xs normal-case tracking-wider shadow-[3px_3px_0px_#CAFF04] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#CAFF04] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            <Mail className="w-4 h-4 shrink-0" />
            brenda.suitcase@gmail.com
          </a>
        </div>

        <p className="text-[11px] text-neutral-400 font-mono font-bold tracking-wider mt-3">
          © 2026 ⊹ 𝘽🜁𝙔𝘽🜁𝙔 版權所有 | 2026 (c) All Rights Reserved
        </p>
      </footer>

    </div>
  );
}

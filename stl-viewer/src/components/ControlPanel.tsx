import React, { useRef, useState } from 'react';
import { 
  Box, 
  Upload, 
  Settings, 
  Layers, 
  RotateCw, 
  Activity, 
  Eye, 
  Download, 
  Sliders,
  Scale,
  RefreshCw,
  Sun,
  Grid,
  MapPin,
  Cpu,
  Bookmark,
  FileUp,
  Boxes,
  Gauge,
  Weight,
  Ruler,
  Palette,
  Camera,
  Monitor
} from 'lucide-react';
import { 
  RenderMode, 
  MaterialColor, 
  LightingPreset, 
  ModelStats, 
  DemoModel, 
  DEMO_MODELS, 
  MATERIAL_COLORS 
} from '../types';

interface ControlPanelProps {
  stats: ModelStats | null;
  selectedDemoId: string;
  renderMode: RenderMode;
  materialColor: MaterialColor | string;
  autoRotate: boolean;
  rotationSpeed: number;
  gridVisible: boolean;
  axesVisible: boolean;
  lightingPreset: LightingPreset;
  canvasBg: 'dark' | 'blueprint' | 'light' | 'greenscreen';
  isRecording?: boolean;
  recordingProgress?: number;
  axisXOffset: number;
  axisYOffset: number;
  axisZOffset: number;
  
  onUploadFile: (file: File) => void;
  onSelectDemo: (demoId: string) => void;
  onRenderModeChange: (mode: RenderMode) => void;
  onMaterialColorChange: (color: string) => void;
  onAutoRotateToggle: () => void;
  onRotationSpeedChange: (speed: number) => void;
  onGridToggle: () => void;
  onAxesToggle: () => void;
  onLightingPresetChange: (preset: LightingPreset) => void;
  onCameraAngleChange: (angle: 'front' | 'top' | 'side' | 'isometric') => void;
  onCanvasBgChange: (bg: 'dark' | 'blueprint' | 'light' | 'greenscreen') => void;
  onDownloadStl?: () => void;
  onRecordVideo: () => void;
  onResetAll: () => void;
  onAxisXOffsetChange: (val: number) => void;
  onAxisYOffsetChange: (val: number) => void;
  onAxisZOffsetChange: (val: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  stats,
  selectedDemoId,
  renderMode,
  materialColor,
  autoRotate,
  rotationSpeed,
  gridVisible,
  axesVisible,
  lightingPreset,
  canvasBg,
  isRecording = false,
  recordingProgress = 0,
  axisXOffset,
  axisYOffset,
  axisZOffset,
  
  onUploadFile,
  onSelectDemo,
  onRenderModeChange,
  onMaterialColorChange,
  onAutoRotateToggle,
  onRotationSpeedChange,
  onGridToggle,
  onAxesToggle,
  onLightingPresetChange,
  onDownloadStl,
  onCameraAngleChange,
  onCanvasBgChange,
  onRecordVideo,
  onResetAll,
  onAxisXOffsetChange,
  onAxisYOffsetChange,
  onAxisZOffsetChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const wrapAngle = (deg: number) => {
    let a = deg % 360;
    if (a > 180) a -= 360;
    if (a <= -180) a += 360;
    return a;
  };
  
  // Density slider for estimating weight (e.g., PLA is ~1.24 g/cm3, Alum is 2.7 g/cm3)
  const [materialDensity, setMaterialDensity] = useState<number>(1.24); // g / cm^3 (PLA setting)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const nameLower = files[0].name.toLowerCase();
      if (nameLower.endsWith('.stl') || nameLower.endsWith('.stp') || nameLower.endsWith('.step')) {
        onUploadFile(files[0]);
      } else {
        alert('請上傳 STL (.stl) 或是 STEP (.stp / .step) 格式的 3D 檔案！');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadFile(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Convert File size to readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Estimated physical weight based on volume and density
  // Volume is in mm^3, convert to cm^3 by dividing by 1000
  const estimatedWeightG = stats ? (stats.volume / 1000) * materialDensity : 0;

  // Material selector options
  const densityPresets = [
    { name: 'PLA 塑料 (1.24 g/cm³)', val: 1.24 },
    { name: 'ABS 塑料 (1.04 g/cm³)', val: 1.04 },
    { name: '尼龍 Nylon (1.14 g/cm³)', val: 1.14 },
    { name: '鋁合金 Aluminum (2.70 g/cm³)', val: 2.70 },
    { name: '不鏽鋼 Stainless Steel (7.85 g/cm³)', val: 7.85 },
  ];

  return (
    <div id="stl-control-panel" className="flex flex-col gap-6 w-full bg-white border-4 border-black p-6 rounded-none brutalist-shadow-lg overflow-y-auto max-h-[92vh]">
      
      {/* SECTION 1: Header */}
      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-none bg-[#CAFF04] border-2 border-black text-black shadow-[2px_2px_0px_#000000] rotate-2">
            <Box className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-left">
            <h1 className="text-sm font-black text-black tracking-widest uppercase">3D_CONTROL_DECK</h1>
            <p className="text-[10px] font-mono text-neutral-500 font-extrabold uppercase">MEASURE_ANALYSER_v2.5</p>
          </div>
        </div>
        <button 
          onClick={onResetAll}
          title="RESET 3D CONSTANTS"
          className="p-2 border-2 border-black bg-[#ef4444] text-white hover:bg-[#ef4444]/90 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer font-black text-xs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* SECTION 2: Drag & Drop STL Upload */}
      <div className="flex flex-col gap-2 text-left">
        <label className="text-[11px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
          <FileUp className="w-3.5 h-3.5 shrink-0" />
          LOAD_EXTERNAL_3D_MODEL
        </label>
        
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`relative border-3 border-dashed rounded-none p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all select-none
            ${isDragging 
              ? 'border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444] scale-98 shadow-none' 
              : 'border-black bg-white hover:bg-[#CAFF04]/15 text-neutral-800 shadow-[3px_3px_0px_rgba(0,0,0,1)]'
            }`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".stl,.step,.stp"
            className="hidden"
          />
          <Upload className={`w-8 h-8 ${isDragging ? 'text-[#ef4444] scale-110 animate-bounce' : 'text-black'} transition-transform`} />
          <span className="text-xs font-black uppercase tracking-wide text-center">拖曳 STL 或 STEP (.stp/.step) 檔案至此，或點擊上傳</span>
          <span className="text-[10px] text-neutral-500 font-mono font-bold uppercase text-center">支持 STL 網格與 STEP 實體轉換 (.step / .stp)</span>
        </div>
      </div>

      {/* SECTION 3: Built-in Demos */}
      <div className="flex flex-col gap-2 text-left">
        <label className="text-[11px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
          <Boxes className="w-3.5 h-3.5 shrink-0" />
          DETAILED_3D_TEMPLATES
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {DEMO_MODELS.map((demo) => {
            const isSelected = selectedDemoId === demo.id;
            return (
              <button
                key={demo.id}
                onClick={() => onSelectDemo(demo.id)}
                className={`text-left p-3.5 rounded-none border-2 transition-all flex flex-col gap-1 cursor-pointer group relative
                  ${isSelected 
                    ? 'bg-[#CAFF04] border-black text-black font-black shadow-[3px_3px_0px_#000000] translate-x-[-1px] translate-y-[-1px]' 
                    : 'bg-white border-black text-neutral-800 hover:bg-neutral-50 shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none'
                  }`}
              >
                <div className="absolute top-1 right-2 text-[8px] font-mono font-black opacity-40">3D_RAW</div>
                <span className="font-black text-xs uppercase tracking-tight">{demo.name.split(' ')[0]}</span>
                <span className="text-[9px] font-mono leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity font-semibold line-clamp-1">{demo.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: Model Statistics */}
      {stats && (
        <div className="flex flex-col gap-3 bg-[#f8f9fa] border-4 border-black rounded-none p-4 text-left shadow-[5px_5px_0px_#000000] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#ef4444] text-white text-[8px] font-mono font-black uppercase px-2 py-0.5 border-l-2 border-b-2 border-black">
            3D_SPECTRUM_OK
          </div>
          
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <span className="text-xs font-black text-black flex items-center gap-1.5 font-mono uppercase tracking-widest">
              <Gauge className="w-3.5 h-3.5 shrink-0" />
              3D_PHYSICAL_METRICS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
            <div className="flex flex-col">
              <span className="text-[9px] text-[#ef4444] font-black font-mono uppercase">[3D_FILE_NAME]</span>
              <span className="text-[11px] font-black font-mono truncate" title={stats.name}>
                {stats.name}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-500 font-extrabold uppercase">[3D_SIZE]</span>
              <span className="text-xs font-black font-mono">
                {formatBytes(stats.size)}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] text-indigo-600 font-black font-mono uppercase">[3D_TRIANGLES]</span>
              <span className="text-xs font-black font-mono text-indigo-700">
                {stats.triangles.toLocaleString()} TRIS
              </span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-500 font-extrabold uppercase">[3D_SURFACE_AREA]</span>
              <span className="text-xs font-black font-mono">
                {stats.surfaceArea.toLocaleString()} mm²
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] text-neutral-500 font-extrabold uppercase">[3D_EST_VOLUME]</span>
              <span className="text-xs font-black font-mono">
                {stats.volume.toLocaleString()} mm³
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] text-emerald-600 font-black font-mono uppercase">[3D_EST_WEIGHT]</span>
              <span className="text-xs font-black font-mono text-emerald-600 animate-pulse">
                ~ {estimatedWeightG >= 1000 ? `${(estimatedWeightG / 1000).toFixed(2)} KG` : `${estimatedWeightG.toFixed(2)} G`}
              </span>
            </div>
          </div>

          {/* Density preset dropdown */}
          <div className="flex flex-col gap-1.5 mt-2 border-t-2 border-black pt-3">
            <span className="text-[9px] font-mono font-black text-black uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1"><Weight className="w-3 h-3 shrink-0" /> 3D_MATERIAL_DENSITY</span>
              <span className="text-indigo-600 font-mono text-[9px] font-black">{materialDensity.toFixed(2)} G/CM³</span>
            </span>
            <select
              value={materialDensity}
              onChange={(e) => setMaterialDensity(Number(e.target.value))}
              className="bg-white border-2 border-black text-black text-[11px] rounded-none p-2 outline-none focus:bg-[#CAFF04] hover:bg-neutral-50 transition-colors cursor-pointer font-black font-mono uppercase"
            >
              {densityPresets.map((p) => (
                <option key={p.val} value={p.val}>{p.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Dimensions box */}
          <div className="flex flex-col gap-1.5 border-t-2 border-black pt-3 mt-1.5">
            <span className="text-[9px] text-neutral-800 font-black font-mono uppercase tracking-widest flex items-center gap-1">
              <Ruler className="w-3 h-3 shrink-0" />
              3D_BOUNDING_BOX_LIMITS (MM)
            </span>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
              <div className="bg-white border-2 border-black p-2 rounded-none shadow-[2px_2px_0px_#000000]">
                <div className="text-[8px] text-rose-500 font-black uppercase">X_WIDTH</div>
                <div className="text-xs font-black text-black">{stats.width}</div>
              </div>
              <div className="bg-white border-2 border-black p-2 rounded-none shadow-[2px_2px_0px_#000000]">
                <div className="text-[8px] text-emerald-600 font-black uppercase">Y_DEPTH</div>
                <div className="text-xs font-black text-black">{stats.depth}</div>
              </div>
              <div className="bg-white border-2 border-black p-2 rounded-none shadow-[2px_2px_0px_#000000]">
                <div className="text-[8px] text-sky-600 font-black uppercase">Z_HEIGHT</div>
                <div className="text-xs font-black text-black">{stats.height}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: Controls & Material Settings */}
      <div className="flex flex-col gap-5 text-left">
        
        {/* Render Type & Material Shading */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            3D_SHADING_RENDER_TYPE
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'solid', label: '啞光磨砂 (SOLID)' },
              { id: 'metal', label: '亮面金屬 (METALLIC)' },
              { id: 'wireframe', label: '幾何線框 (WIREFRAME)' },
              { id: 'points', label: '點雲粒子 (POINT_CLOUD)' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => onRenderModeChange(mode.id as RenderMode)}
                className={`py-2 px-1 text-center border-2 transition-all text-[10px] font-black font-mono uppercase cursor-pointer
                  ${renderMode === mode.id 
                    ? 'bg-black border-black text-[#CAFF04] shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
                    : 'bg-white border-black text-neutral-800 hover:bg-neutral-50 shadow-[2px_2px_0px_#000000]'
                  }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Material Color Pickers */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <Palette className="w-3.5 h-3.5 shrink-0" />
            3D_MATERIAL_HEX_COLOR
          </label>
          <div className="flex flex-wrap gap-2.5 items-center bg-white border-2 border-black p-3 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            {Object.entries(MATERIAL_COLORS).map(([colorKey, config]) => {
              const isSelected = materialColor === colorKey;
              return (
                <button
                  key={colorKey}
                  onClick={() => onMaterialColorChange(colorKey)}
                  title={config.name}
                  style={{ backgroundColor: config.hex }}
                  className={`w-7 h-7 rounded-none border-2 border-black transition-transform cursor-pointer relative flex items-center justify-center
                    ${isSelected 
                      ? 'scale-115 ring-2 ring-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' 
                      : 'hover:scale-105'
                    }`}
                >
                  {isSelected && (
                    <span className="w-2.5 h-2.5 bg-[#CAFF04] border border-black transform rotate-45 inline-block"></span>
                  )}
                </button>
              );
            })}

            {/* Custom Palette input */}
            <div 
              title="自訂調色盤 (Custom Color Palette)"
              className={`w-7 h-7 rounded-none border-2 border-dashed border-black transition-transform cursor-pointer relative flex items-center justify-center bg-neutral-100 hover:scale-105
                ${materialColor.startsWith('#') ? 'scale-115 ring-2 ring-black bg-[#CAFF04]' : ''}`}
            >
              <input
                type="color"
                value={materialColor.startsWith('#') ? materialColor : '#ffffff'}
                onChange={(e) => onMaterialColorChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Palette className="w-3.5 h-3.5 text-black shrink-0" />
              {materialColor.startsWith('#') && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#CAFF04] border border-black rounded-full"></span>
              )}
            </div>

            <div className="ml-auto text-[9px] text-[#ef4444] font-mono font-black uppercase max-w-[120px] text-right truncate">
              {MATERIAL_COLORS[materialColor as any] 
                ? MATERIAL_COLORS[materialColor as any].name.split(' (')[0]
                : `自訂顏色 (${materialColor.toUpperCase()})`}
            </div>
          </div>
        </div>

        {/* Manual Axis Alignment Calibration sliders */}
        <div className="flex flex-col gap-3.5 border-t-2 border-black pt-4">
          <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest flex items-center justify-between font-mono">
            <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5" /> 自訂模型軸向與角度校正</span>
            <button
              onClick={() => {
                onAxisXOffsetChange(0);
                onAxisYOffsetChange(0);
                onAxisZOffsetChange(0);
              }}
              className="px-2 py-0.5 border border-black bg-neutral-100 hover:bg-[#CAFF04] text-[9.5px] font-mono font-bold tracking-tight rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_#000000] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
            >
              歸零重置 (RESET)
            </button>
          </div>
          <div className="flex flex-col gap-3 bg-neutral-50 border-2 border-black p-3 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            
            {/* X Axis correction */}
            <div className="flex flex-col gap-1.5 border-b border-black/10 pb-2.5 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-rose-600 font-mono">X 軸翻轉 (Pitch - 前後)</span>
                <span className="font-mono font-black text-black bg-rose-100 px-1.5 py-0.5 border border-black text-[10px] min-w-[50px] text-center">{axisXOffset}°</span>
              </div>
              <div className="grid grid-cols-4 gap-1 ml-0.5">
                <button
                  type="button"
                  onClick={() => onAxisXOffsetChange(wrapAngle(axisXOffset - 90))}
                  className="py-1 bg-white hover:bg-rose-500 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  -90°
                </button>
                <button
                  type="button"
                  onClick={() => onAxisXOffsetChange(wrapAngle(axisXOffset - 45))}
                  className="py-1 bg-white hover:bg-rose-400 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  -45°
                </button>
                <button
                  type="button"
                  onClick={() => onAxisXOffsetChange(wrapAngle(axisXOffset + 45))}
                  className="py-1 bg-white hover:bg-rose-400 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  +45°
                </button>
                <button
                  type="button"
                  onClick={() => onAxisXOffsetChange(wrapAngle(axisXOffset + 90))}
                  className="py-1 bg-white hover:bg-rose-500 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  +90°
                </button>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={axisXOffset}
                onChange={(e) => onAxisXOffsetChange(Number(e.target.value))}
                className="w-full accent-rose-500 h-1 bg-neutral-200 border border-neutral-300 rounded-none cursor-ew-resize appearance-none mt-1"
              />
            </div>

            {/* Vertical spin — rotates about three.js Y, which the user sees as Z (height) */}
            <div className="flex flex-col gap-1.5 border-b border-black/10 pb-2.5 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-sky-600 font-mono">Z 軸翻轉 (Yaw - 水平旋轉)</span>
                <span className="font-mono font-black text-black bg-sky-100 px-1.5 py-0.5 border border-black text-[10px] min-w-[50px] text-center">{axisYOffset}°</span>
              </div>
              <div className="grid grid-cols-4 gap-1 ml-0.5">
                <button
                  type="button"
                  onClick={() => onAxisYOffsetChange(wrapAngle(axisYOffset - 90))}
                  className="py-1 bg-white hover:bg-sky-500 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  -90°
                </button>
                <button
                  type="button"
                  onClick={() => onAxisYOffsetChange(wrapAngle(axisYOffset - 45))}
                  className="py-1 bg-white hover:bg-sky-400 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  -45°
                </button>
                <button
                  type="button"
                  onClick={() => onAxisYOffsetChange(wrapAngle(axisYOffset + 45))}
                  className="py-1 bg-white hover:bg-sky-400 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  +45°
                </button>
                <button
                  type="button"
                  onClick={() => onAxisYOffsetChange(wrapAngle(axisYOffset + 90))}
                  className="py-1 bg-white hover:bg-sky-500 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  +90°
                </button>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={axisYOffset}
                onChange={(e) => onAxisYOffsetChange(Number(e.target.value))}
                className="w-full accent-sky-500 h-1 bg-neutral-200 border border-neutral-300 rounded-none cursor-ew-resize appearance-none mt-1"
              />
            </div>

            {/* Side tilt — rotates about three.js Z, which the user sees as Y (depth) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-emerald-600 font-mono">Y 軸翻轉 (Roll - 側傾)</span>
                <span className="font-mono font-black text-black bg-emerald-100 px-1.5 py-0.5 border border-black text-[10px] min-w-[50px] text-center">{axisZOffset}°</span>
              </div>
              <div className="grid grid-cols-4 gap-1 ml-0.5">
                <button
                  type="button"
                  onClick={() => onAxisZOffsetChange(wrapAngle(axisZOffset - 90))}
                  className="py-1 bg-white hover:bg-emerald-500 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  -90°
                </button>
                <button
                  type="button"
                  onClick={() => onAxisZOffsetChange(wrapAngle(axisZOffset - 45))}
                  className="py-1 bg-white hover:bg-emerald-400 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  -45°
                </button>
                <button
                  type="button"
                  onClick={() => onAxisZOffsetChange(wrapAngle(axisZOffset + 45))}
                  className="py-1 bg-white hover:bg-emerald-400 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  +45°
                </button>
                <button
                  type="button"
                  onClick={() => onAxisZOffsetChange(wrapAngle(axisZOffset + 90))}
                  className="py-1 bg-white hover:bg-emerald-500 hover:text-white text-black border border-black text-[9.5px] font-black font-mono rounded-none transition-all cursor-pointer shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none"
                >
                  +90°
                </button>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={axisZOffset}
                onChange={(e) => onAxisZOffsetChange(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1 bg-neutral-200 border border-neutral-300 rounded-none cursor-ew-resize appearance-none mt-1"
              />
            </div>

          </div>
          <p className="text-[9px] text-neutral-500 italic mt-0.5 font-bold leading-normal">
            * 說明：CAD/切片定義不同可點擊 ±90°/±45° 疊加旋轉。模型會依您設定的基準在轉盤上完美 360° 水平旋轉，完全不偏軸！
          </p>
        </div>

        {/* Studio Lights Toggle */}
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-black text-neutral-800 uppercase tracking-widest flex items-center justify-between font-mono">
            <span className="flex items-center gap-1.5"><Sun className="w-3.5 h-3.5" /> 3D_LIGHTING_SCENE</span>
            <span className="font-mono text-[9px] text-indigo-600 font-extrabold capitalize">{lightingPreset}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'studio', label: '棚拍柔光 (STUDIO)' },
              { id: 'dramatic', label: '劇院強光 (CONTRAST)' },
              { id: 'ambient', label: '純淨環境 (FLAT)' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => onLightingPresetChange(preset.id as LightingPreset)}
                className={`py-2 px-1 text-center border-2 transition-all text-[9.5px] font-black font-mono uppercase cursor-pointer
                  ${lightingPreset === preset.id 
                    ? 'bg-black border-black text-[#CAFF04] shadow-[2px_2px_0px_#000000]' 
                    : 'bg-white border-black text-neutral-700 hover:bg-neutral-50 shadow-[2px_2px_0px_#000000]'
                  }`}
              >
                {preset.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* View Angles Trigger */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <Camera className="w-3.5 h-3.5 shrink-0" />
            3D_CAMERA_ANGLE_PRESETS
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'isometric', label: '角視 (ISOMETRIC)' },
              { id: 'front', label: '正面 (FRONT)' },
              { id: 'top', label: '頂視 (TOP)' },
              { id: 'side', label: '側視 (SIDE)' },
            ].map((angle) => (
              <button
                key={angle.id}
                onClick={() => onCameraAngleChange(angle.id as any)}
                className="py-2 px-1 bg-white border-2 border-black text-[9px] font-black font-mono uppercase rounded-none transition-all hover:bg-[#CAFF04] active:scale-95 cursor-pointer text-center shadow-[2px_2px_0px_#000000]"
              >
                {angle.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Grid and Axes toggles */}
        <div className="flex flex-col gap-2.5 border-t-2 border-black pt-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Auto rotate toggle */}
            <div className="flex items-center justify-between bg-white border-2 border-black p-2.5 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <span className="text-xs font-black text-black flex items-center gap-1 font-mono uppercase">
                <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin text-[#ef4444]' : 'text-black'}`} /> 
                自轉展示
              </span>
              <button
                onClick={onAutoRotateToggle}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-black transition-colors duration-200 ease-in-out focus:outline-none
                  ${autoRotate ? 'bg-[#CAFF04]' : 'bg-neutral-300'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out
                  ${autoRotate ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Grid Toggle */}
            <div className="flex items-center justify-between bg-white border-2 border-black p-2.5 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <span className="text-xs font-black text-black flex items-center gap-1 font-mono uppercase">
                <Grid className="w-3.5 h-3.5" />
                地面網格
              </span>
              <button
                onClick={onGridToggle}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-black transition-colors duration-200 ease-in-out focus:outline-none
                  ${gridVisible ? 'bg-[#CAFF04]' : 'bg-neutral-300'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out
                  ${gridVisible ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Axes Toggle */}
            <div className="flex items-center justify-between bg-white border-2 border-black p-2.5 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <span className="text-xs font-black text-black flex items-center gap-1 font-mono uppercase">
                <MapPin className="w-3.5 h-3.5" />
                三軸坐標
              </span>
              <button
                onClick={onAxesToggle}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-black transition-colors duration-200 ease-in-out focus:outline-none
                  ${axesVisible ? 'bg-[#CAFF04]' : 'bg-neutral-300'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out
                  ${axesVisible ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* BG theme setting */}
            <div className="flex flex-col gap-1 bg-white border-2 border-black p-2 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <span className="text-[8px] font-black text-black font-mono uppercase flex items-center gap-1">
                <Monitor className="w-2.5 h-2.5 shrink-0" />
                CANVAS_BG_THEME
              </span>
              <div className="flex rounded-none bg-neutral-100 border border-black p-0.5 mt-0.5">
                {[
                  { id: 'dark', label: '極黑' },
                  { id: 'blueprint', label: '藍圖' },
                  { id: 'light', label: '高亮' },
                  { id: 'greenscreen', label: '綠幕' }
                ].map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => onCanvasBgChange(bg.id as any)}
                    className={`flex-1 py-1 text-[8px] rounded-none font-black font-mono cursor-pointer transition-all uppercase
                      ${canvasBg === bg.id 
                        ? (bg.id === 'greenscreen' ? 'bg-[#00d000] text-white border border-black' : 'bg-black text-[#CAFF04] border border-black')
                        : 'text-neutral-500 hover:text-black'
                      }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Speed slider is visible if auto rotation is true */}
          {autoRotate && (
            <div className="flex flex-col gap-1.5 bg-white border-2 border-black p-3 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)] mt-1">
              <div className="flex items-center justify-between text-xs font-black text-black font-mono">
                <span className="flex items-center gap-1"><RotateCw className="w-3 h-3 shrink-0" /> 3D_ROTATION_SPEED</span>
                <span className="text-indigo-600 font-mono text-xs font-black">{rotationSpeed}X</span>
              </div>
              <input 
                type="range"
                min="0.2"
                max="5"
                step="0.1"
                value={rotationSpeed}
                onChange={(e) => onRotationSpeedChange(Number(e.target.value))}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black h-2"
              />
            </div>
          )}
        </div>

      </div>

      {/* SECTION 6: Standard Download and Export Action */}
      {stats && (
        <div className="flex flex-col gap-3 border-t-2 border-black pt-5 mt-auto">
          {/* If the model is a converted STEP file, show a special status alert! */}
          {(stats.name.toLowerCase().endsWith('.step') || stats.name.toLowerCase().endsWith('.stp')) && (
            <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-800 text-[10px] py-2 px-3 rounded-none flex items-center gap-1.5 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span>STEP/STP CAD 結構已即時解析，可立即匯出！</span>
            </div>
          )}
          
          <button
            onClick={onDownloadStl}
            className="w-full flex items-center justify-center gap-2 border-3 border-black font-black py-3 px-4 rounded-none shadow-[4px_4px_0px_#000000] bg-[#0055ff] text-white hover:bg-[#0055ff]/90 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-xs cursor-pointer uppercase tracking-wider"
          >
            <Download className="w-4 h-4 text-white" />
            <span>匯出並下載為 STL 檔案 (.STL)</span>
          </button>

          <button
            disabled={isRecording}
            onClick={onRecordVideo}
            className={`w-full flex items-center justify-center gap-2 border-3 border-black font-black py-3 px-4 rounded-none shadow-[4px_4px_0px_#000000] transition-all text-xs cursor-pointer uppercase tracking-wider
              ${isRecording 
                ? 'bg-red-500 text-white cursor-not-allowed' 
                : 'bg-[#CAFF04] hover:bg-[#CAFF04]/90 text-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
              }`}
          >
            <span className={`w-2.3 h-2.3 rounded-full bg-red-600 ${isRecording ? 'animate-ping' : ''}`} />
            {isRecording 
              ? `錄影中 (RECORDING_SPIN) ${recordingProgress}%`
              : '錄製並下載 360° 旋轉展示影片 (.MP4)'
            }
          </button>
          
          <p className="text-[10px] text-neutral-500 leading-relaxed text-center font-bold uppercase font-mono">
            * 系統直接三角化幾何頂點，轉換後的 STL 可直接導入 Cura / Prusa 等切片軟體進行 3D 列印。
          </p>
        </div>
      )}

    </div>
  );
};

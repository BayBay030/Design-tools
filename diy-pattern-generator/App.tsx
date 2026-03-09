import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  RefreshCw, 
  Download, 
  Settings2, 
  Layers,
  Trash2,
  FolderOpen,
  X,
  Minus,
  Maximize2,
  HelpCircle
} from 'lucide-react';
import { GeneratorSettings, PatternElement } from './types';
import { generateElements, drawSeamlessElement } from './utils/patternUtils';

const PRIMARY_PINK = "#edbbc9"; 
const BORDER_COLOR = "#d4bbed"; 
const TEXT_DARK = "#4a3a5a"; 

const RetroColorPicker: React.FC<{
  color: string;
  isTransparent: boolean;
  onChangeColor: (hex: string) => void;
  onChangeTransparent: (val: boolean) => void;
}> = ({ color, isTransparent, onChangeColor, onChangeTransparent }) => {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);

  const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const handlePickerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const s = ((e.clientX - rect.left) / rect.width) * 100;
    const l = 100 - (((e.clientY - rect.top) / rect.height) * 100);
    setSaturation(s);
    setLightness(l);
    onChangeColor(hslToHex(hue, s, l));
  };

  const handleHueClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const h = (1 - (e.clientY - rect.top) / rect.height) * 360;
    setHue(h);
    onChangeColor(hslToHex(h, saturation, lightness));
  };

  return (
    <div className="flex flex-col gap-3 p-2 win95-window">
      <div className={`flex gap-2 h-40 ${isTransparent ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
        <div 
          className="relative flex-1 win95-inset overflow-hidden cursor-crosshair"
          style={{ 
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${hue}, 100%, 50%)`,
            borderColor: BORDER_COLOR
          }}
          onClick={handlePickerClick}
        >
          <div 
            className="absolute w-4 h-4 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ 
              left: `${saturation}%`, 
              top: `${100 - lightness}%`, 
              boxShadow: `0 0 0 2px ${BORDER_COLOR}`,
              backgroundColor: 'transparent'
            }}
          />
        </div>

        <div 
          className="w-10 win95-inset relative cursor-pointer"
          style={{ 
            background: 'linear-gradient(to top, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
            borderColor: BORDER_COLOR
          }}
          onClick={handleHueClick}
        >
          <div 
            className="absolute w-full h-1.5 bg-white border-2 left-0 transform -translate-y-1/2"
            style={{ top: `${100 - (hue / 360) * 100}%`, borderColor: BORDER_COLOR }}
          />
        </div>
      </div>

      <div className="win95-inset p-2 flex items-center gap-3" style={{ borderColor: BORDER_COLOR }}>
        <div 
          className="w-10 h-10 border-2 shadow-inner flex items-center justify-center overflow-hidden"
          style={{ 
            backgroundColor: isTransparent ? 'transparent' : color, 
            borderColor: BORDER_COLOR,
            backgroundImage: isTransparent ? 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAACFJREFUGFdjZEACDAwM/8GAAEjAABMEY4BIICsgS8AAUgMA4v8XAQ46Yg8AAAAASUVORK5CYII=")' : 'none' 
          }}
        />
        <div className="flex-1">
          <label className="text-[9px] font-bold text-[#6b21a8] block mb-1 pixel-text">HEX_CODE</label>
          <input 
            type="text" 
            value={isTransparent ? 'TRANSPARENT' : color.toUpperCase()} 
            readOnly
            className="w-full bg-[#fdf2f8] border-2 px-2 py-1 text-xs font-mono outline-none text-[#581c87]"
            style={{ borderColor: BORDER_COLOR }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-1 py-1">
        <input 
          type="checkbox" 
          id="transparency-toggle" 
          checked={isTransparent}
          onChange={(e) => onChangeTransparent(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
          style={{ accentColor: PRIMARY_PINK }}
        />
        <label htmlFor="transparency-toggle" className="text-[10px] font-bold text-[#6b21a8] cursor-pointer pixel-text uppercase">
          Transparent Canvas
        </label>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [elements, setElements] = useState<PatternElement[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [settings, setSettings] = useState<GeneratorSettings>({
    tileSize: 512,
    density: 1.5,
    minScale: 0.15,
    maxScale: 1.0,
    rotationRange: 180, 
    seed: Math.random(),
    backgroundColor: '#ffffff',
    isTransparent: false
  });
  const [showPreviewGrid, setShowPreviewGrid] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImagePromises = Array.from(files).map((file: File) => {
      return new Promise<HTMLImageElement>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(newImagePromises).then((loadedImages) => {
      setImages(prev => [...prev, ...loadedImages].slice(0, 8));
    });
  };

  const handleGenerate = useCallback(() => {
    if (images.length === 0) return;
    const newElements = generateElements(images, settings);
    setElements(newElements);
  }, [images, settings.density, settings.minScale, settings.maxScale, settings.rotationRange, settings.seed]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `seamless_pattern_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const updatePreviewGrid = useCallback(() => {
    const source = canvasRef.current;
    const target = previewRef.current;
    if (!source || !target) return;
    const ctx = target.getContext('2d');
    if (!ctx) return;
    const size = settings.tileSize;
    const previewTileWidth = target.width / 3;
    const previewTileHeight = target.height / 2;
    ctx.clearRect(0, 0, target.width, target.height);
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 2; y++) {
        ctx.drawImage(source, 0, 0, size, size, x * previewTileWidth, y * previewTileHeight, previewTileWidth, previewTileHeight);
      }
    }
  }, [settings.tileSize]);

  useEffect(() => {
    if (images.length > 0) {
      handleGenerate();
    }
  }, [
    images, 
    settings.density, 
    settings.minScale, 
    settings.maxScale, 
    settings.rotationRange, 
    settings.seed,
    handleGenerate
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!settings.isTransparent) {
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    elements.forEach(el => drawSeamlessElement(ctx, el, settings.tileSize));
    
    if (showPreviewGrid) {
      updatePreviewGrid();
    }
  }, [elements, settings.tileSize, settings.backgroundColor, settings.isTransparent, showPreviewGrid, updatePreviewGrid]);

  return (
    <div className="h-screen w-screen flex flex-col p-4 gap-4 overflow-hidden">
      <div className="win95-window flex items-center gap-4 px-2 py-1" style={{ borderColor: BORDER_COLOR, borderWidth: '2px' }}>
        <div className="win95-button cursor-default select-none pointer-events-none opacity-90 active:transform-none">
          <FolderOpen size={14} /> <span className="pixel-text">FILE</span>
        </div>
        <div className="win95-button cursor-default select-none pointer-events-none opacity-90 active:transform-none">
          <Settings2 size={14} /> <span className="pixel-text">CONFIG</span>
        </div>
        <div className="flex-1" />
        <div className="pixel-text text-xl font-bold tracking-widest drop-shadow-md" style={{ color: TEXT_DARK }}>
          PATTERN _MAKER +.exe
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="w-80 flex flex-col gap-4">
          <div className="win95-window flex-1 flex flex-col overflow-hidden" style={{ borderColor: BORDER_COLOR, borderWidth: '2px' }}>
            <div className="win95-title" style={{ borderColor: BORDER_COLOR, color: TEXT_DARK }}>
              <span>TOOLBOX.EXE</span>
              <div className="flex gap-1">
                <div className="win95-icon-btn"><Minus size={10} /></div>
                {/* 關閉按鈕改為 #d4bbed */}
                <div className="win95-icon-btn text-white" style={{ backgroundColor: BORDER_COLOR }}><X size={10} /></div>
              </div>
            </div>
            
            <div className="p-3 space-y-6 overflow-y-auto flex-1">
              <section className="space-y-2">
                <div className="flex items-center gap-2 relative">
                  <h2 className="text-[10px] font-bold text-[#8a7fb9] uppercase pixel-text">Source Graphics</h2>
                  <button 
                    onMouseEnter={() => setShowHelp(true)}
                    onMouseLeave={() => setShowHelp(false)}
                    onClick={() => setShowHelp(!showHelp)}
                    style={{ color: PRIMARY_PINK }}
                  >
                    <HelpCircle size={15} />
                  </button>
                  {showHelp && (
                    <div className="absolute top-7 left-0 z-50 win95-window p-3 w-60 shadow-2xl animate-in fade-in zoom-in duration-200 border-2" style={{ borderColor: BORDER_COLOR }}>
                      <p className="text-[11px] leading-relaxed text-[#6b21a8] font-bold">
                        請上傳圖片 2～5 張 PNG，<br/>建議最佳數量為三張。<br/>
                        <span style={{ color: PRIMARY_PINK }}>System Ready!</span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="win95-inset p-2 grid grid-cols-4 gap-2 min-h-[64px]" style={{ borderColor: BORDER_COLOR }}>
                  {images.map((img, i) => (
                    <div key={i} className="aspect-square border-2 p-1 bg-white hover:bg-pink-50 transition-colors shadow-sm" style={{ borderColor: BORDER_COLOR }}>
                      <img src={img.src} className="w-full h-full object-contain" />
                    </div>
                  ))}
                  {images.length < 8 && (
                    <label className="aspect-square border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-pink-50" style={{ borderColor: BORDER_COLOR }}>
                      <Upload size={14} style={{ color: PRIMARY_PINK }} />
                      <input type="file" multiple accept="image/png" className="hidden" onChange={handleFileUpload} />
                    </label>
                  )}
                </div>
                {images.length > 0 && (
                  <button onClick={() => setImages([])} className="win95-button w-full justify-center text-red-600 bg-red-50" style={{ borderColor: BORDER_COLOR }}>
                    <Trash2 size={12} /> <span className="pixel-text">CLEAR_GRAPHICS</span>
                  </button>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-[10px] font-bold text-[#8a7fb9] uppercase pixel-text">Surface Tint</h2>
                <RetroColorPicker 
                  color={settings.backgroundColor} 
                  isTransparent={settings.isTransparent}
                  onChangeColor={(hex) => setSettings({...settings, backgroundColor: hex})} 
                  onChangeTransparent={(val) => setSettings({...settings, isTransparent: val})}
                />
              </section>

              <section className="space-y-4">
                <h2 className="text-[10px] font-bold text-[#8a7fb9] uppercase pixel-text">Entropy Matrix</h2>
                <div className="space-y-4 px-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold">
                      <span className="pixel-text">DENSITY</span>
                      <span className="pixel-text" style={{ color: PRIMARY_PINK }}>{settings.density.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="8" step="0.1"
                      value={settings.density}
                      onChange={(e) => setSettings({...settings, density: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold">
                      <span className="pixel-text">CHAOS_FACTOR</span>
                      <span className="pixel-text" style={{ color: PRIMARY_PINK }}>{Math.round((settings.rotationRange / 360) * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-gray-400 pixel-text">LO</span>
                      <input 
                        type="range" min="0" max="360" step="1"
                        value={settings.rotationRange}
                        onChange={(e) => setSettings({...settings, rotationRange: parseInt(e.target.value)})}
                        className="w-full flex-1"
                      />
                      <span className="text-[8px] text-gray-400 pixel-text">HI</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold pixel-text">MIN_SCALE</label>
                      <input 
                        type="number" step="0.05"
                        value={settings.minScale}
                        onChange={(e) => setSettings({...settings, minScale: parseFloat(e.target.value)})}
                        className="w-full win95-inset px-2 py-1 text-xs text-[#581c87] font-mono"
                        style={{ borderColor: BORDER_COLOR }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold pixel-text">MAX_SCALE</label>
                      <input 
                        type="number" step="0.05"
                        value={settings.maxScale}
                        onChange={(e) => setSettings({...settings, maxScale: parseFloat(e.target.value)})}
                        className="w-full win95-inset px-2 py-1 text-xs text-[#581c87] font-mono"
                        style={{ borderColor: BORDER_COLOR }}
                      />
                    </div>
                  </div>
                </div>
              </section>
              
              <button 
                onClick={() => setSettings({...settings, seed: Math.random()})}
                disabled={images.length === 0}
                className="win95-button w-full justify-center bg-white font-bold py-3 text-sm"
                style={{ borderColor: BORDER_COLOR, color: PRIMARY_PINK }}
              >
                <RefreshCw size={14} /> <span className="pixel-text uppercase">Matrix_Sync()</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="win95-window flex-1 flex flex-col overflow-hidden" style={{ borderColor: BORDER_COLOR, borderWidth: '2px' }}>
            <div className="win95-title" style={{ borderColor: BORDER_COLOR, color: TEXT_DARK }}>
              <div className="flex items-center gap-2">
                <Layers size={14} />
                <span className="pixel-text uppercase">Output_Canvas.bmp</span>
              </div>
              <div className="flex gap-1 items-center">
                <div className="flex border-2 bg-[#dfdfdf] p-[1px] mr-2" style={{ borderColor: BORDER_COLOR }}>
                  <button 
                    onClick={() => setShowPreviewGrid(false)} 
                    className={`px-3 py-1 text-[9px] uppercase font-bold pixel-text ${!showPreviewGrid ? 'text-white' : 'hover:bg-white'}`}
                    style={{ backgroundColor: !showPreviewGrid ? BORDER_COLOR : 'transparent' }}
                  >
                    Single
                  </button>
                  <button 
                    onClick={() => setShowPreviewGrid(true)} 
                    className={`px-3 py-1 text-[9px] uppercase font-bold pixel-text ${showPreviewGrid ? 'text-white' : 'hover:bg-white'}`}
                    style={{ backgroundColor: showPreviewGrid ? BORDER_COLOR : 'transparent' }}
                  >
                    Preview
                  </button>
                </div>
                <div className="win95-icon-btn"><Maximize2 size={10} /></div>
                {/* 關閉按鈕改為 #d4bbed */}
                <div className="win95-icon-btn text-white" style={{ backgroundColor: BORDER_COLOR }}><X size={10} /></div>
              </div>
            </div>

            <div className="flex-1 bg-[#d8d1e3] relative overflow-hidden flex items-center justify-center p-6">
              <div className="win95-window p-1 bg-white shadow-2xl overflow-hidden ring-4" style={{ ringColor: PRIMARY_PINK + '33', borderColor: BORDER_COLOR }}>
                <canvas ref={canvasRef} width={settings.tileSize} height={settings.tileSize} className="hidden" />
                
                <div className="win95-inset border-none overflow-hidden relative" 
                     style={{ 
                       width: showPreviewGrid ? 600 : 512, 
                       height: showPreviewGrid ? 400 : 512,
                       backgroundImage: settings.isTransparent ? 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAACFJREFUGFdjZEACDAwM/8GAAEjAABMEY4BIICsgS8AAUgMA4v8XAQ46Yg8AAAAASUVORK5CYII=")' : 'none'
                     }}>
                  {showPreviewGrid ? (
                    <canvas ref={previewRef} width={600} height={400} className="w-full h-full block" />
                  ) : (
                    <canvas 
                      width={512} height={512} className="w-full h-full"
                      ref={(node) => {
                        if (node && canvasRef.current) {
                          const ctx = node.getContext('2d');
                          if (ctx) {
                            ctx.clearRect(0,0,512,512);
                            ctx.drawImage(canvasRef.current, 0,0,512,512);
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              {images.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#d8d1e3]/70 backdrop-blur-sm">
                  <div className="win95-window p-10 max-w-sm text-center space-y-4 border-dashed bg-white/90" style={{ borderColor: BORDER_COLOR }}>
                    <p className="pixel-text text-4xl animate-pulse" style={{ color: PRIMARY_PINK }}>DISK_EMPTY</p>
                    <p className="text-[13px] text-[#4a3a5a] leading-tight font-bold uppercase tracking-widest pixel-text">
                      Please mount PNG assets<br/>to begin render sequence.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#f5f0f9] border-t-2 p-3 flex justify-between items-center px-4" style={{ borderColor: BORDER_COLOR }}>
              <div className="flex gap-6 text-[10px] font-mono font-bold pixel-text" style={{ color: PRIMARY_PINK }}>
                <span className="bg-white px-2 border-2 shadow-[1px_1px_0_white]" style={{ borderColor: BORDER_COLOR }}>RES: 512x512</span>
                <span className="bg-white px-2 border-2 shadow-[1px_1px_0_white]" style={{ borderColor: BORDER_COLOR }}>STATUS: OK</span>
              </div>
              {/* DOWNLOAD 按鈕放大約兩倍 (px 加倍, py 加倍, font-size 加大) */}
              <button 
                onClick={handleDownload} 
                className="win95-button bg-white font-bold px-12 py-4 border-4" 
                style={{ color: TEXT_DARK, borderColor: BORDER_COLOR }}
              >
                <Download size={24} /> <span className="pixel-text text-xl">DOWNLOAD</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="win95-window h-14 flex items-center px-1 bg-[#f5f0f9]" style={{ borderColor: BORDER_COLOR, borderWidth: '2px' }}>
        <button 
          className="win95-button font-bold px-5 h-11 gap-2 border-2 text-white" 
          style={{ background: `linear-gradient(135deg, ${PRIMARY_PINK}, #d8b4fe)`, borderColor: 'white' }}
        >
           <span className="pixel-text text-md tracking-widest">START</span>
        </button>
        <div className="w-[3px] h-9 bg-[#b8a9c9] mx-3 shadow-[1px_0_0_white]" style={{ backgroundColor: BORDER_COLOR }} />
        <div className="flex gap-2">
          {/* Tile_Previewer -> 𝙲𝚈𝙱𝙴𝚁 ⌁ 𝙳𝚁𝙸𝙵𝚃𝙴𝚁 */}
          <div className="win95-button h-11 px-8 bg-white pixel-text" style={{ color: PRIMARY_PINK, borderColor: BORDER_COLOR }}>𝙲𝚈𝙱𝙴𝚁 ⌁ 𝙳𝚁𝙸𝙵𝚃𝙴𝚁</div>
          {/* Debugger.log -> ⊹ 𝘽🜁𝙔𝘽🜁𝙔 */}
          <div className="win95-button h-11 px-8 bg-white pixel-text" style={{ color: TEXT_DARK, borderColor: BORDER_COLOR }}>⊹ 𝘽🜁𝙔𝘽🜁𝙔</div>
        </div>
        <div className="flex-1" />
        <div className="win95-inset px-6 py-1 flex items-center gap-3 text-[12px] font-bold h-11 bg-white pixel-text" style={{ color: PRIMARY_PINK, borderColor: BORDER_COLOR }}>
          <div className="w-3 h-3 rounded-full animate-pulse shadow-sm" style={{ backgroundColor: PRIMARY_PINK }} />
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};

export default App;
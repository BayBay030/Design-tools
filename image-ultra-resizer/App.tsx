
import React, { useState, useCallback, useRef } from 'react';
import { processImageFile, createZipPackage } from './services/imageProcessor';
import { ConversionResult, ProcessingState, TargetOrientation } from './types';
import ResultCard from './components/ResultCard';

const App: React.FC = () => {
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [targetOrientation, setTargetOrientation] = useState<TargetOrientation>('landscape');
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
  });
  const [zipping, setZipping] = useState({
    isZipping: false,
    progress: 0
  });
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)) {
        setProcessing(prev => ({ ...prev, error: '請上傳 JPG 或 PNG 格式的圖片檔案' }));
        return;
      }
      startProcessing(file);
    }
  };

  const startProcessing = async (file: File) => {
    setSourceFile(file);
    setResults([]);
    setProcessing({ isProcessing: true, progress: 0, error: null });

    try {
      const conversionResults = await processImageFile(file, targetOrientation, (p) => {
        setProcessing(prev => ({ ...prev, progress: p }));
      });
      setResults(conversionResults);
      setProcessing(prev => ({ ...prev, isProcessing: false, progress: 100 }));
    } catch (err: any) {
      console.error(err);
      setProcessing({ 
        isProcessing: false, 
        progress: 0, 
        error: err.message || '處理圖片時發生未知錯誤。' 
      });
    }
  };

  const downloadAll = async () => {
    if (results.length === 0 || !sourceFile) return;
    setZipping({ isZipping: true, progress: 0 });
    try {
      const zipBlob = await createZipPackage(results, (p) => {
        setZipping(prev => ({ ...prev, progress: p }));
      });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sourceFile.name.replace(/\.[^/.]+$/, "")}_all_assets.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('生成 ZIP 檔案時出錯');
    } finally {
      setTimeout(() => setZipping({ isZipping: false, progress: 0 }), 500);
    }
  };

  const reset = () => {
    setResults([]);
    setSourceFile(null);
    setProcessing({ isProcessing: false, progress: 0, error: null });
    setZipping({ isZipping: false, progress: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto flex-grow w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-brand-primary rounded-2xl mb-4 shadow-lg shadow-brand-primary/20">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">圖片快捷縮放工具</h1>
          <p className="mt-3 text-lg text-slate-500">
            依照色票設計優化：支援 JPG/PNG 一鍵快速輸出
          </p>
        </div>

        {/* Orientation Selector */}
        {!sourceFile && !processing.isProcessing && (
          <div className="max-w-xs mx-auto mb-8 bg-brand-white p-1 rounded-xl border border-brand-secondary shadow-sm flex">
            <button 
              onClick={() => setTargetOrientation('landscape')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${targetOrientation === 'landscape' ? 'bg-brand-primary text-white shadow-md' : 'text-brand-muted hover:text-slate-700'}`}
            >
              橫式導向
            </button>
            <button 
              onClick={() => setTargetOrientation('portrait')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${targetOrientation === 'portrait' ? 'bg-brand-primary text-white shadow-md' : 'text-brand-muted hover:text-slate-700'}`}
            >
              直式導向
            </button>
          </div>
        )}

        {/* Main Interface */}
        <div className="glass-panel p-8 rounded-3xl shadow-xl border border-brand-secondary/50 relative">
          
          {/* Uploader Section */}
          {!sourceFile && !processing.isProcessing && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-brand-muted rounded-2xl p-12 text-center cursor-pointer hover:border-brand-primary hover:bg-brand-secondary/20 transition-all group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/jpeg,image/png,image/webp" 
                className="hidden" 
              />
              <div className="flex flex-col items-center">
                <svg className="w-16 h-16 text-brand-secondary group-hover:text-brand-primary mb-4 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xl font-semibold text-slate-700">上傳圖片開始縮放</p>
                <p className="text-sm text-brand-muted mt-2">點擊此區域選取檔案</p>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {processing.isProcessing && (
            <div className="py-12 text-center">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <svg className="w-full h-full rotate-[-90deg]">
                  <circle cx="64" cy="64" r="60" fill="transparent" stroke="#e6dde8" strokeWidth="8" />
                  <circle
                    cx="64" cy="64" r="60" fill="transparent" stroke="#554dd7" strokeWidth="8"
                    strokeDasharray={377}
                    strokeDashoffset={377 - (377 * processing.progress) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-brand-primary">{processing.progress}%</span>
                </div>
              </div>
              <p className="text-xl font-medium text-slate-800 animate-pulse">處理中...</p>
            </div>
          )}

          {/* Error Message */}
          {processing.error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-xl text-center">
              <p className="font-medium mb-4">{processing.error}</p>
              <button onClick={reset} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">重新上傳</button>
            </div>
          )}

          {/* Results Section */}
          {results.length > 0 && !processing.isProcessing && (
            <div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-secondary/30 rounded-full flex items-center justify-center text-brand-primary">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">轉換完成</h2>
                    <p className="text-xs text-brand-muted uppercase font-mono tracking-wider">模式：{targetOrientation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={reset} className="px-4 py-2 text-sm text-brand-muted font-medium hover:text-brand-primary transition-colors" disabled={zipping.isZipping}>重新開始</button>
                  <div className="flex flex-col items-end">
                    <button 
                      onClick={downloadAll}
                      disabled={zipping.isZipping}
                      className={`px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 ${
                        zipping.isZipping 
                          ? 'bg-slate-100 text-brand-muted cursor-not-allowed' 
                          : 'bg-brand-primary hover:bg-brand-primary/90 text-white shadow-brand-primary/20'
                      }`}
                    >
                      {zipping.isZipping ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          打包中 {zipping.progress}%
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          一鍵下載全部
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Zip Progress Bar Overlay */}
              {zipping.isZipping && (
                <div className="mb-6 w-full bg-brand-secondary/30 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-brand-primary h-full transition-all duration-300 ease-out"
                    style={{ width: `${zipping.progress}%` }}
                  ></div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {results.map((res) => (
                  <ResultCard key={res.id} result={res} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Requirements Info */}
        <div className="mt-12 text-center">
          <p className="text-xs text-brand-muted mb-6 uppercase tracking-widest font-bold">轉換規格參考</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white p-5 rounded-2xl border border-brand-secondary shadow-sm hover:border-brand-primary/30 transition-colors">
              <p className="text-sm font-bold text-brand-primary mb-1">XL JPG (3200px)</p>
              <p className="text-xs text-brand-muted leading-relaxed">提供最高精細度，適合大尺寸輸出或收藏。</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-brand-secondary shadow-sm hover:border-brand-primary/30 transition-colors">
              <p className="text-sm font-bold text-brand-primary mb-1">S JPG (1200px)</p>
              <p className="text-xs text-brand-muted leading-relaxed">平衡體積與畫質，適合一般社群分享。</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-brand-secondary shadow-sm hover:border-brand-primary/30 transition-colors">
              <p className="text-sm font-bold text-brand-primary mb-1">WebP (920px)</p>
              <p className="text-xs text-brand-muted leading-relaxed">網路專用極速加載格式，極低體積占用。</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full mt-12 pt-6 border-t border-brand-secondary/30 text-[13.33px] text-brand-muted flex justify-between items-center">
        <a 
          href="https://baybay030.github.io" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-brand-primary transition-colors font-medium"
        >
          https://baybay030.github.io
        </a>
        <span className="font-semibold tracking-wide">𝙲𝚈𝙱𝙴𝚁 ⌁ 𝙳𝚁𝙸𝙵𝚃𝙴𝚁 ▲ BAY BAY</span>
      </footer>
    </div>
  );
};

export default App;

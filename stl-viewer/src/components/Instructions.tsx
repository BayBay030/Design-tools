import React from 'react';
import { HelpCircle, Layers, ShieldCheck, Cpu, Database } from 'lucide-react';

export const Instructions: React.FC = () => {
  return (
    <div id="stl-faq-panel" className="bg-white border-4 border-black p-6 rounded-none brutalist-shadow-lg flex flex-col gap-6 text-left relative mt-4">
      {/* Visual Splash Backdrops */}
      <div className="absolute top-0 right-4 bg-black text-[#CAFF04] text-[9px] font-mono font-black uppercase px-3 py-1 border-b-2 border-l-2 border-r-2 border-black tracking-wider">
        3D_GUIDE_TERMINAL
      </div>

      {/* FAQ Header */}
      <div className="flex items-center gap-2 border-b-3 border-black pb-3">
        <HelpCircle className="w-5 h-5 text-black" />
        <h2 className="text-sm font-black text-black uppercase tracking-widest font-mono">
          3D_GEOMETRY_TECHNICAL_STANDARDS
        </h2>
      </div>

      {/* Grid structure for FAQ terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1 */}
        <div className="flex gap-4 p-4.5 bg-white border-2 border-black shadow-[3px_3px_0px_#000000]">
          <div className="p-2.5 h-fit rounded-none bg-[#ef4444] border-2 border-black text-white shrink-0 shadow-[1px_1px_0px_#000000]">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-black text-black uppercase tracking-wider font-mono">
              [01_STL_FORMAT]
            </h3>
            <p className="text-[11px] text-neutral-600 leading-relaxed font-bold">
              STL 是 <b>Stereolithography（立體光刻技術）</b> 的簡稱，源自 1987 年，是目前 3D 列印與計算機輔助製造（CAM）最廣泛使用的標準格式。它僅描繪 3D 三角網格的外表幾何（Tessellation），不包含顏色、貼圖材質或其他常見的 CAD 複雜裝配屬性。
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="flex gap-4 p-4.5 bg-white border-2 border-black shadow-[3px_3px_0px_#000000]">
          <div className="p-2.5 h-fit rounded-none bg-[#CAFF04] border-2 border-black text-black shrink-0 shadow-[1px_1px_0px_#000000]">
            <Database className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-black text-black uppercase tracking-wider font-mono">
              [02_ASCII_VS_BINARY]
            </h3>
            <p className="text-[11px] text-neutral-600 leading-relaxed font-bold">
              STL 支援兩種編碼。<b>ASCII 格式</b>為純文字，可被記事本直觀閱讀，適合調試，但容量極大；<b>Binary 二進位格式</b>則以特定 80-byte 檔頭與緊湊的 32-bit 浮點數記錄頂點坐標，其容量通常比文字格式小 6 ~ 10 倍，因此成爲業界傳輸標準。
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex gap-4 p-4.5 bg-white border-2 border-black shadow-[3px_3px_0px_#000000]">
          <div className="p-2.5 h-fit rounded-none bg-[#0055ff] border-2 border-black text-white shrink-0 shadow-[1px_1px_0px_#000000]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-black text-black uppercase tracking-wider font-mono">
              [03_WATERTIGHT_3D]
            </h3>
            <p className="text-[11px] text-neutral-600 leading-relaxed font-bold">
              為了能在 3D 印表機完美進行切片與多層堆疊，模型必須是「密閉（Watertight）的無縫網格」。意即網格面之間不能有物理破洞、不能有懸空的面，本系統提供精準的<b>體積 (Volume) 折算</b>與<b>表面積</b>，供列印前預檢。
            </p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="flex gap-4 p-4.5 bg-emerald-50/70 border-2 border-emerald-500 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          <div className="p-2.5 h-fit rounded-none bg-emerald-600 border-2 border-black text-white shrink-0 shadow-[1px_1px_0px_#000000]">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider font-mono">
              [04_STEP_STP_CONVERTER]
            </h3>
            <p className="text-[11px] text-zinc-700 leading-relaxed font-bold">
              STEP / STP 規格是高精度 CAD 實體格式。本平台內建 <b>WASM-OCCT 轉換核心</b>，完全在本機將實體 CAD 曲面高精度離散化，免上傳、高隱私，還能直接一鍵 3D 預覽、手動調軸、調整角度再<b>匯出標準 STL 網格</b>！
            </p>
          </div>
        </div>

      </div>

      {/* CAD Exporting steps */}
      <div className="border-t-3 border-black pt-5 flex flex-col gap-3">
        <h4 className="text-xs font-black text-black uppercase tracking-widest flex items-center gap-1.5 font-mono">
          <Cpu className="w-4 h-4 text-black" /> EXPORTING_3D_STL_FROM_OTHER_CAD
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <div className="bg-[#f8f9fa] border-2 border-black p-3.5 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <div className="text-[10px] font-black text-[#ef4444] mb-1 font-mono uppercase">01. Fusion 360 //</div>
            <p className="text-[10px] text-neutral-600 font-bold leading-relaxed uppercase">
              在瀏覽器或實體上點選右鍵，點擊「另存為網格 (Save as Mesh)」，並在選項內選擇 STL 格式 (Binary) 及精度。
            </p>
          </div>
          <div className="bg-[#f8f9fa] border-2 border-black p-3.5 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <div className="text-[10px] font-black text-indigo-600 mb-1 font-mono uppercase">02. Blender 3D //</div>
            <p className="text-[10px] text-neutral-600 font-bold leading-relaxed uppercase">
              選取您的網格物件，使用頂部選單 <b>File &gt; Export &gt; Stl (.stl)</b>，並勾選「僅匯出選取物件 (Selection Only)」以免背景光源被一併寫入。
            </p>
          </div>
          <div className="bg-[#f8f9fa] border-2 border-black p-3.5 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <div className="text-[10px] font-black text-emerald-600 mb-1 font-mono uppercase">03. Tinkercad //</div>
            <p className="text-[10px] text-neutral-600 font-bold leading-relaxed uppercase">
              右上角點選「匯出 (Export)」，點選並儲存 <b>.STL</b>，系統將會打包所有群組物件並下載至瀏覽器。
            </p>
          </div>
          <div className="bg-[#f8f9fa] border-2 border-black p-3.5 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <div className="text-[10px] font-black text-neutral-900 mb-1 font-mono uppercase">04. SolidWorks 3D //</div>
            <p className="text-[10px] text-neutral-600 font-bold leading-relaxed uppercase">
              使用選單「另存新檔」，將檔案類型變更為 <b>STL (*.stl)</b>，點擊「選項」調整解析度與弦高精度，保存以獲得毫米尺寸。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

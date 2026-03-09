
import React from 'react';
import { ConversionResult } from '../types';

interface ResultCardProps {
  result: ConversionResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = result.previewUrl;
    link.download = result.name;
    link.click();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-secondary overflow-hidden flex flex-col hover:shadow-lg hover:shadow-brand-primary/5 transition-all duration-300">
      <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden group">
        <img 
          src={result.previewUrl} 
          alt={result.name} 
          className="object-contain w-full h-full p-4 transition-transform group-hover:scale-105"
        />
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary bg-brand-secondary/40 px-2 py-1 rounded-md">
            {result.format}
          </span>
          <span className="text-[10px] font-bold text-brand-muted font-mono">
            {result.dimensions.width} x {result.dimensions.height}
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-800 truncate mb-1" title={result.name}>
          {result.name}
        </h3>
        <p className="text-xs text-brand-muted mb-5 font-medium">{formatSize(result.size)}</p>
        
        <button
          onClick={handleDownload}
          className="mt-auto w-full py-2.5 bg-slate-800 hover:bg-brand-primary text-white rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          單獨下載
        </button>
      </div>
    </div>
  );
};

export default ResultCard;

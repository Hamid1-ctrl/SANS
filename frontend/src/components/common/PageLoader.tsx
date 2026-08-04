import React from 'react';

interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = "Loading SANS Workspace...", 
  fullScreen = true 
}) => {
  return (
    <div className={`${fullScreen ? 'h-screen w-screen fixed inset-0 z-[9999]' : 'h-64 w-full'} flex flex-col items-center justify-center bg-[#f7f6fb]/90 dark:bg-[#0F172A]/90 backdrop-blur-md transition-all duration-300 select-none`}>
      <div className="relative flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl space-y-4 max-w-xs w-full text-center">
        
        {/* Pulsating Glowing Ring Loader */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Outer spinning gradient ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#1e7a34] border-r-[#3ea556] animate-spin" />
          
          {/* Inner pulsating brand badge */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e7a34] to-[#3ea556] text-white font-black text-xs flex items-center justify-center shadow-md animate-pulse">
            SANS
          </div>
        </div>

        {/* Message & Status */}
        <div className="space-y-1">
          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
            SANS Portal
          </h4>
          <p className="text-[11px] text-[#1e7a34] dark:text-emerald-400 font-bold animate-pulse">
            {message}
          </p>
        </div>

        {/* Skeleton loading bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-[#1e7a34] to-[#3ea556] h-full w-1/2 rounded-full animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>
    </div>
  );
};

export default PageLoader;

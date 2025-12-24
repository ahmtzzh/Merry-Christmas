import React, { useState } from 'react';
import { TreeCanvas } from './components/TreeCanvas';

const App: React.FC = () => {
  const [isLetterVisible, setIsLetterVisible] = useState(false);

  // CSS class for the Gold Foil Text Effect
  const goldTextClass = "bg-clip-text text-transparent bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#b38728] drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]";

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden text-white font-serif">
      {/* 3D Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <TreeCanvas onLetterOpen={setIsLetterVisible} />
      </div>

      {/* Love Letter Overlay */}
      <div 
        className={`absolute inset-0 z-20 flex items-center justify-center transition-all duration-1000 ease-in-out px-4 perspective-1000 ${
          isLetterVisible ? 'opacity-100 bg-black/60 backdrop-blur-[4px]' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Card Container */}
        <div 
            className={`
                relative bg-[#fffaf0] text-black max-w-lg w-full rounded-sm 
                shadow-[0_20px_50px_rgba(0,0,0,0.5)] 
                transform transition-all duration-1000 origin-center
                ${isLetterVisible ? 'translate-y-0 scale-100 rotate-0 opacity-100' : 'translate-y-32 scale-90 rotate-x-12 opacity-0'}
            `}
            style={{
                // Subtle paper grain texture + vignette
                backgroundImage: `
                    radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, rgba(240,230,210,0.5) 100%),
                    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")
                `,
                backgroundBlendMode: 'multiply'
            }}
        >
          {/* Ornamental Inner Border Frame */}
          <div className="absolute inset-2 border border-[#D4AF37]/30 pointer-events-none">
             <div className="absolute inset-1 border border-[#D4AF37]/60 pointer-events-none"></div>
             
             {/* Corner Flourishes (CSS Shapes) */}
             <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#D4AF37] opacity-80"></div>
             <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#D4AF37] opacity-80"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#D4AF37] opacity-80"></div>
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#D4AF37] opacity-80"></div>
          </div>

          <div className="relative z-10 p-10 md:p-14 flex flex-col items-center h-full">
            
            {/* Recipient Header */}
            <div className="text-center mb-6 w-full">
                <p className="text-[#8B0000] text-xs md:text-sm tracking-[0.3em] uppercase mb-2 font-bold opacity-70" style={{fontFamily: 'Cinzel, serif'}}>To My Dearest</p>
                <h2 className="text-[#5e0a0a] text-3xl md:text-4xl font-medium tracking-wide" style={{fontFamily: '"Noto Serif SC", serif'}}>
                    思莹宝宝亲启
                </h2>
                {/* Gold Divider */}
                <div className="flex items-center justify-center gap-4 mt-4 opacity-80">
                    <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
                    <span className="text-[#D4AF37] text-xs">✦</span>
                    <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"></div>
                </div>
            </div>

            {/* Main Greeting */}
            <div className="text-center mb-8 relative">
                 <h1 className={`${goldTextClass} text-5xl md:text-7xl leading-tight transform -rotate-2 origin-center`} 
                     style={{ fontFamily: '"Great Vibes", cursive' }}>
                     Merry <br/> Christmas
                 </h1>
            </div>

            {/* Poem Content */}
            <div className="space-y-4 text-lg md:text-xl text-[#2a2a2a] leading-loose text-center opacity-90" 
                 style={{ fontFamily: '"Noto Serif SC", serif', fontWeight: 300 }}>
                <p>这一夜叫平安。</p>
                <p>可我在想——</p>
                <div className="py-2">
                    <p>如果温暖有方向，</p>
                    <p>大概是你看过来的地方。</p>
                </div>
            </div>

            {/* Signature Area - Repositioned to prevent overlap */}
            <div className="mt-10 w-full flex justify-end items-center gap-4">
                <div className="text-right text-[#555] text-lg italic" style={{fontFamily: '"Great Vibes", cursive'}}>
                    Yours forever
                </div>

                {/* Wax Seal - Inline to avoid overlap */}
                <div className="relative group cursor-default">
                    <div className="relative w-16 h-16 rounded-full bg-[#8B0000] shadow-[0_4px_6px_rgba(0,0,0,0.4),inset_0_-4px_8px_rgba(0,0,0,0.3),inset_0_2px_10px_rgba(255,255,255,0.2)] flex items-center justify-center border-4 border-[#700000]/50">
                        {/* Wax Inner Ring */}
                        <div className="w-10 h-10 rounded-full border border-[#500000]/30 flex items-center justify-center opacity-80">
                             <span className="text-[#4a0404] text-2xl font-bold" style={{fontFamily: 'Cinzel, serif'}}>L</span>
                        </div>
                        {/* Wax Highlight */}
                        <div className="absolute top-2 left-3 w-3 h-1.5 bg-white/20 rounded-full blur-[2px] transform -rotate-45"></div>
                    </div>
                </div>
            </div>

          </div>
        </div>
      </div>

      {/* UI Overlay - Instructions */}
      <div className={`absolute top-0 left-0 p-8 z-10 pointer-events-none transition-all duration-700 ${isLetterVisible ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
        <h1 className="text-4xl md:text-5xl font-light text-[#fcf6ba] mb-2 tracking-widest drop-shadow-md" style={{fontFamily: 'Cinzel, serif'}}>
          NOËL LUXE
        </h1>
        <p className="text-[#D4AF37] text-xs md:text-sm tracking-[0.4em] uppercase mb-8 border-l-2 border-[#D4AF37] pl-3 opacity-80">
          Immersive Experience
        </p>
        
        <div className="space-y-2">
            <div className="flex items-center gap-3 text-white/70 bg-black/30 backdrop-blur-sm p-2 rounded-full pr-6 w-fit border border-white/10">
                <span className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center text-lg">🖐️</span>
                <span className="text-xs tracking-wider uppercase font-light">Open Hand to Reveal</span>
            </div>
            <div className="flex items-center gap-3 text-white/70 bg-black/30 backdrop-blur-sm p-2 rounded-full pr-6 w-fit border border-white/10">
                <span className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center text-lg">✊</span>
                <span className="text-xs tracking-wider uppercase font-light">Fist to Reset</span>
            </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none transition-opacity duration-500 ${isLetterVisible ? 'opacity-0' : 'opacity-60'}`}>
        <p className="text-[10px] text-[#D4AF37] uppercase tracking-[0.3em]" style={{fontFamily: 'Cinzel, serif'}}>Created with Three.js & MediaPipe</p>
      </div>
    </div>
  );
};

export default App;
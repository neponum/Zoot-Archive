import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Terminal, 
  FileText, 
  BookOpen, 
  Camera, 
  Compass, 
  Layers, 
  Rotate3d, 
  Volume2, 
  VolumeX,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { PRTSCinematicAuth } from './PRTSCinematicAuth';
import { PRTSClassifiedIntelView } from './PRTSClassifiedIntelView';
import { PRTSLoreVaultView } from './PRTSLoreVaultView';
import { PRTSVisualCGView } from './PRTSVisualCGView';
import { PRTSTerraMapView } from './PRTSTerraMapView';

interface PRTSArchiveLayoutProps {
  onBackToHome: () => void;
}

type ArchiveTab = 'auth' | 'intel' | 'lore' | 'visual' | 'radar';

export const PRTSArchiveLayout: React.FC<PRTSArchiveLayoutProps> = ({ onBackToHome }) => {
  const [activeTab, setActiveTab] = useState<ArchiveTab>('auth');
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const tabs: { id: ArchiveTab; number: string; label: string; icon: any }[] = [
    { id: 'auth', number: '01', label: 'TERMINAL AUTH', icon: Terminal },
    { id: 'intel', number: '02', label: 'CLASSIFIED INTEL', icon: FileText },
    { id: 'lore', number: '03', label: 'LORE VAULT', icon: BookOpen },
    { id: 'visual', number: '04', label: 'VISUAL CG', icon: Camera },
    { id: 'radar', number: '05', label: 'TERRA RADAR', icon: Compass },
  ];

  return (
    <div 
      className="w-full h-full bg-[#08080a] flex flex-col items-center justify-center p-2 sm:p-4 select-none font-sans relative overflow-hidden"
      style={{
        perspective: is3DMode ? '1300px' : 'none',
        perspectiveOrigin: '50% 45%'
      }}
    >
      
      {/* Outer Floating Control Header */}
      <div className="w-full max-w-[1440px] flex items-center justify-between px-3 sm:px-6 py-2 z-40 bg-black/70 backdrop-blur-md border border-white/10 mb-2 shadow-2xl shrink-0">
        
        {/* Left: Back Button & Terminal ID */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1 bg-lime-400 hover:bg-lime-300 text-black font-mono text-[9px] font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_#fff] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO HUB</span>
          </button>

          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/20">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            <span className="text-white/80 font-mono text-[9px] font-bold tracking-widest uppercase">
              PRTS ARCHIVE SUITE // REL 4.8
            </span>
          </div>
        </div>

        {/* Center: Interactive Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-[50vw] sm:max-w-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[8.5px] sm:text-[9.5px] font-mono font-black tracking-wider uppercase transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black shadow-[2px_2px_0px_#a3e635]'
                    : 'bg-white/5 hover:bg-white/15 text-white/70 border border-white/10'
                }`}
              >
                <span className={isActive ? 'text-lime-600 font-black' : 'text-white/40'}>
                  [{tab.number}]
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: 3D Angle Toggle & Audio */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            title="Toggle 3D Cinematic Perspective"
            className={`flex items-center gap-1 px-2.5 py-1 text-[8.5px] font-mono font-bold uppercase transition-all cursor-pointer ${
              is3DMode 
                ? 'bg-lime-400/20 text-lime-400 border border-lime-400/60' 
                : 'bg-white/10 text-white/80 border border-white/20'
            }`}
          >
            <Rotate3d className="w-3 h-3" />
            <span className="hidden sm:inline">{is3DMode ? '3D VIEW' : 'FLAT 2D'}</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 text-white/70 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 cursor-pointer"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-lime-400" /> : <VolumeX className="w-3.5 h-3.5 text-white/40" />}
          </button>
        </div>

      </div>

      {/* Main 3D Canvas Board */}
      <motion.div
        className="w-full flex-1 max-w-[1440px] max-h-[850px] aspect-[16/9] bg-[#f5f6ed] text-black relative shadow-[0_40px_140px_rgba(0,0,0,0.98)] overflow-hidden flex flex-col justify-between p-4 sm:p-8 md:p-10 border-2 border-black/80"
        style={{
          transformStyle: 'preserve-3d',
          transform: is3DMode 
            ? 'rotateX(11.5deg) rotateY(-3.5deg) rotateZ(0.4deg)' 
            : 'none',
          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Large green gradient aura in the top-right / upper quadrant matching snapshot */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 65% 55% at 82% 20%, rgba(188, 240, 68, 0.65) 0%, rgba(215, 248, 120, 0.35) 45%, transparent 75%),
              radial-gradient(circle at 15% 95%, rgba(200, 235, 90, 0.25) 0%, transparent 45%)
            `
          }}
        />

        {/* Faint subtle grid and perspective guide lines */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Organic curved topographic accent lines at bottom left as seen in snapshot */}
        <svg 
          className="absolute bottom-0 left-0 w-80 h-40 pointer-events-none opacity-40" 
          viewBox="0 0 320 160" 
          fill="none"
        >
          <path 
            d="M-20,160 C60,130 110,155 170,110 C210,80 230,20 280,10" 
            stroke="#a3e635" 
            strokeWidth="1.5"
          />
          <path 
            d="M-40,160 C40,140 90,160 140,125 C180,95 200,45 250,25" 
            stroke="#d9f99d" 
            strokeWidth="1"
          />
        </svg>

        {/* --- TOP ROW: OPERATING... on Left, POWERED BY RHODES ISLAND on Right (matching snapshot) --- */}
        <div className="w-full flex items-start justify-between relative z-20 shrink-0">
          {/* Top Left: ● OPERATING... */}
          <div className="flex items-start gap-2 text-black select-none pl-2">
            <span className="w-2 h-2 rounded-full bg-black mt-1 shrink-0" />
            <div className="flex flex-col leading-none">
              <span className="text-[10px] sm:text-[11px] font-mono font-black tracking-widest text-black uppercase">
                OPERATING...
              </span>
              <span className="text-[7.5px] sm:text-[8px] font-mono font-bold tracking-wider text-black/50 uppercase mt-0.5">
                // SYSTEM 04 ACTIVE • {activeTab.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Top Right: POWERED BY [■] / RHODES ISLAND */}
          <div className="flex items-center gap-2 pr-2 select-none">
            <div className="flex flex-col items-end leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] sm:text-[9px] font-mono font-black tracking-[0.16em] text-black uppercase">
                  POWERED BY
                </span>
                <div className="w-3.5 h-2 bg-black shrink-0" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono font-black tracking-[0.12em] text-black uppercase mt-0.5">
                RHODES ISLAND
              </span>
            </div>
          </div>
        </div>

        {/* --- DYNAMIC STAGE CONTENT BASED ON TAB --- */}
        <div className="w-full flex-1 relative z-20 my-2 overflow-hidden flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {activeTab === 'auth' && (
              <motion.div
                key="auth"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex items-center justify-center"
              >
                <PRTSCinematicAuth />
              </motion.div>
            )}

            {activeTab === 'intel' && (
              <motion.div
                key="intel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <PRTSClassifiedIntelView />
              </motion.div>
            )}

            {activeTab === 'lore' && (
              <motion.div
                key="lore"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <PRTSLoreVaultView />
              </motion.div>
            )}

            {activeTab === 'visual' && (
              <motion.div
                key="visual"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <PRTSVisualCGView />
              </motion.div>
            )}

            {activeTab === 'radar' && (
              <motion.div
                key="radar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                <PRTSTerraMapView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- BOTTOM ROW: [ 04 ] in Center, and Corner Brackets --- */}
        <div className="w-full flex items-center justify-between relative z-20 px-2 shrink-0">
          {/* Bottom Left Corner Bracket */}
          <div className="font-mono text-xs font-black text-black/40">
            [
          </div>

          {/* Bottom Center [ 04 ] Indicator */}
          <div className="font-mono text-[10px] sm:text-[11px] font-black tracking-widest text-black border border-black/20 px-2.5 py-0.5 bg-black/5 flex items-center gap-2">
            <span>[ 04 ]</span>
            <span className="text-[8px] text-black/50">PRTS CORE LINK OK</span>
          </div>

          {/* Bottom Right Corner Bracket */}
          <div className="font-mono text-xs font-black text-black/40">
            ]
          </div>
        </div>

      </motion.div>
    </div>
  );
};

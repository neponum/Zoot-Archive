import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Image as ImageIcon, Box, Database, Lock, X, Minus, Square, 
  Maximize2, ExternalLink, RefreshCw, ZoomIn, Info, Compass, Sparkles, Layers,
  ChevronRight, ArrowLeft
} from 'lucide-react';
import { ObsidianArchiveViewer } from '../ObsidianArchiveViewer';
import { PRTSClassifiedIntel } from './PRTSClassifiedIntel';

interface PRTSCRTWorkspaceProps {
  username: string;
  onLockTerminal: () => void;
  onBackToHome: () => void;
}

interface ArchivalWindow {
  id: 'cg_viewer' | 'diorama' | 'classified_docs' | 'obsidian_vault';
  title: string;
  icon: any;
  isOpen: boolean;
  isMaximized: boolean;
  zIndex: number;
}

const ARCHIVAL_CGS = [
  {
    id: 'cg_1',
    title: 'The Great Silence & Abyssal Beacon',
    code: 'REC-0994-A',
    category: 'AEGIR / IBERIA',
    date: '1097.08.30',
    url: 'https://raw.githubusercontent.com/Aceship/AN-EN-Tags/master/img/avg/images/22_avg_1.png',
    fallbackUrl: 'https://torappu.prts.wiki/assets/char_portrait/char_003_kalts_1.png',
    desc: 'Observation log: Deep sea sonar resonance recorded during the Stultifera Navis expedition.'
  },
  {
    id: 'cg_2',
    title: 'Trimounts Starpod Rupture Event',
    code: 'REC-0412-B',
    category: 'COLUMBIA / RHINE LAB',
    date: '1099.03.11',
    url: 'https://raw.githubusercontent.com/Aceship/AN-EN-Tags/master/img/avg/images/23_avg_2.png',
    fallbackUrl: 'https://torappu.prts.wiki/assets/char_portrait/char_1001_amiya2_1.png',
    desc: 'Project Diαbol: Kirsten Wright breakthrough piercing the false ceiling above Terra.'
  },
  {
    id: 'cg_3',
    title: 'Londinium Locomotive & Babel Core',
    code: 'REC-0771-C',
    category: 'VICTORIA / KAZDEL',
    date: '1098.11.04',
    url: 'https://raw.githubusercontent.com/Aceship/AN-EN-Tags/master/img/avg/images/24_avg_3.png',
    fallbackUrl: 'https://torappu.prts.wiki/assets/char_portrait/char_4228_closur_1.png',
    desc: 'Babel architectural remnants uncovered during the Shard cannon assault in Victoria.'
  }
];

export const PRTSCRTWorkspace: React.FC<PRTSCRTWorkspaceProps> = ({
  username,
  onLockTerminal,
  onBackToHome
}) => {
  const [activeWindows, setActiveWindows] = useState<ArchivalWindow[]>([
    { id: 'cg_viewer', title: 'ARCHIVAL_RECORDS_CG.RAW', icon: ImageIcon, isOpen: true, isMaximized: false, zIndex: 10 },
    { id: 'diorama', title: 'TERRA_DIORAMA_SLICE.V3D', icon: Box, isOpen: true, isMaximized: false, zIndex: 5 },
    { id: 'classified_docs', title: 'CLASSIFIED_INTEL.SYS', icon: FileText, isOpen: false, isMaximized: false, zIndex: 1 },
    { id: 'obsidian_vault', title: 'LORE_KNOWLEDGE_VAULT.PRTS', icon: Database, isOpen: false, isMaximized: false, zIndex: 2 }
  ]);

  const [selectedCG, setSelectedCG] = useState<number>(0);
  const [zoomCGModal, setZoomCGModal] = useState<boolean>(false);
  const [topZ, setTopZ] = useState<number>(20);

  const bringToFront = (id: string) => {
    setTopZ(prev => prev + 1);
    setActiveWindows(windows =>
      windows.map(w => (w.id === id ? { ...w, zIndex: topZ + 1 } : w))
    );
  };

  const toggleWindow = (id: string) => {
    setActiveWindows(windows =>
      windows.map(w => {
        if (w.id === id) {
          const nextOpen = !w.isOpen;
          return { ...w, isOpen: nextOpen, zIndex: nextOpen ? topZ + 1 : w.zIndex };
        }
        return w;
      })
    );
    if (!activeWindows.find(w => w.id === id)?.isOpen) {
      setTopZ(prev => prev + 1);
    }
  };

  const toggleMaximize = (id: string) => {
    setActiveWindows(windows =>
      windows.map(w => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  };

  const closeWindow = (id: string) => {
    setActiveWindows(windows =>
      windows.map(w => (w.id === id ? { ...w, isOpen: false } : w))
    );
  };

  const currentCG = ARCHIVAL_CGS[selectedCG];

  return (
    <div className="w-full h-full bg-[#050507] flex items-center justify-center p-2 sm:p-4 md:p-6 select-none font-mono relative overflow-hidden">
      
      {/* Outer Curved CRT Monitor Bezel Frame */}
      <div className="relative w-full max-w-6xl h-full max-h-[820px] bg-[#1a1b1e] rounded-[1.75rem] sm:rounded-[2.5rem] p-3 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-8px_16px_rgba(0,0,0,0.8)] border-4 border-[#28292d] flex flex-col justify-between overflow-hidden">
        
        {/* Top Glare Light Reflection */}
        <div className="absolute top-0 left-1/4 right-1/4 h-2 bg-gradient-to-b from-white/20 to-transparent rounded-full blur-[1px] pointer-events-none z-30" />

        {/* Inner Curved CRT Display Screen */}
        <div className="relative flex-1 w-full bg-[#0d0f12] rounded-[1.25rem] sm:rounded-[2rem] overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.95)] border-2 border-[#121316] flex flex-col justify-between">
          
          {/* CRT Scanline Filter Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none z-30 opacity-30"
            style={{
              backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.8) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
              backgroundSize: '100% 3px, 6px 100%'
            }}
          />

          {/* CRT Phosphor Glow */}
          <div className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_90px_rgba(0,0,0,0.85)]" />

          {/* --- TOP CRT WORKSPACE HEADER (Frame 00:18 - 00:22) --- */}
          <div className="relative z-20 w-full px-5 py-2.5 bg-[#14161a] border-b border-white/10 flex items-center justify-between text-[9px] text-white/70">
            {/* Top Left Code: 0007802422034 // BOOT: OK */}
            <div className="flex items-center gap-4">
              <span className="font-bold tracking-widest text-white/90">
                0007802422034
              </span>
              <span className="px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 rounded-[1px] font-black tracking-wider">
                BOOT: OK
              </span>
              <span className="hidden sm:inline text-white/40 uppercase">
                // USER: {username.toUpperCase()}
              </span>
            </div>

            {/* Quick Window Launch Bar */}
            <div className="flex items-center gap-1 sm:gap-2">
              {activeWindows.map(w => {
                const Icon = w.icon;
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWindow(w.id)}
                    className={`px-2 py-1 rounded-[1px] border text-[8px] sm:text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      w.isOpen
                        ? 'bg-white text-black border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                        : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden md:inline">{w.title.split('.')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Lock / Exit Terminal */}
            <div className="flex items-center gap-2">
              <button
                onClick={onLockTerminal}
                className="px-2 py-1 bg-red-950/60 hover:bg-red-950 border border-red-500/30 text-red-300 hover:text-white rounded-[1px] text-[8.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Lock Terminal"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">LOCK</span>
              </button>
            </div>
          </div>

          {/* --- MAIN CRT DESKTOP AREA (Draggable & Layered Windows) --- */}
          <div className="relative z-10 flex-1 w-full p-3 sm:p-5 overflow-hidden flex flex-col lg:flex-row gap-4">

            {/* WINDOW 1: ARCHIVAL RECONSTRUCTION CG (Frame 00:18) */}
            {activeWindows.find(w => w.id === 'cg_viewer')?.isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ zIndex: activeWindows.find(w => w.id === 'cg_viewer')?.zIndex }}
                onClick={() => bringToFront('cg_viewer')}
                className="flex-1 bg-[#14161a] border-2 border-white/40 rounded-[2px] shadow-2xl flex flex-col overflow-hidden max-h-full"
              >
                {/* Window Title Bar */}
                <div className="px-3 py-1.5 bg-[#202329] border-b border-white/20 flex items-center justify-between text-[9px] text-white select-none">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-white/70" />
                    <span className="font-bold tracking-widest uppercase">ARCHIVAL_RECORDS_CG.RAW</span>
                    <span className="text-[7.5px] text-white/40">// {currentCG.code}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => closeWindow('cg_viewer')} className="hover:text-red-400 p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* CG Display Area */}
                <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden bg-black/40">
                  <div className="relative flex-1 bg-black rounded-[1px] border border-white/20 overflow-hidden flex items-center justify-center group">
                    <img
                      src={currentCG.url}
                      alt={currentCG.title}
                      className="w-full h-full object-contain filter contrast-110 brightness-95"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = currentCG.fallbackUrl;
                      }}
                    />

                    {/* Corner Target Bracket Marks */}
                    <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-white/80" />
                    <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-white/80" />
                    <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-white/80" />
                    <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-white/80" />

                    {/* Quick Expand Button */}
                    <button
                      onClick={() => setZoomCGModal(true)}
                      className="absolute bottom-3 right-3 p-1.5 bg-black/80 hover:bg-black text-white border border-white/40 rounded-[1px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1 text-[8px] font-bold uppercase"
                    >
                      <ZoomIn className="w-3 h-3" />
                      <span>INSPECT</span>
                    </button>
                  </div>

                  {/* CG Meta & Switcher */}
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[8.5px]">
                    <div className="flex flex-col">
                      <span className="font-bold text-white uppercase">{currentCG.title}</span>
                      <span className="text-white/40 text-[7.5px]">{currentCG.desc}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {ARCHIVAL_CGS.map((cg, idx) => (
                        <button
                          key={cg.id}
                          onClick={() => setSelectedCG(idx)}
                          className={`w-5 h-5 rounded-[1px] border text-[8px] font-bold flex items-center justify-center transition-colors cursor-pointer ${
                            selectedCG === idx ? 'bg-white text-black border-white' : 'bg-black/60 text-white/50 border-white/20 hover:border-white'
                          }`}
                        >
                          0{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* WINDOW 2: TERRA DIORAMA / GEOLOGICAL SLICE (Frame 00:22) */}
            {activeWindows.find(w => w.id === 'diorama')?.isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ zIndex: activeWindows.find(w => w.id === 'diorama')?.zIndex }}
                onClick={() => bringToFront('diorama')}
                className="w-full lg:w-96 bg-[#14161a] border-2 border-white/40 rounded-[2px] shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Title Bar */}
                <div className="px-3 py-1.5 bg-[#202329] border-b border-white/20 flex items-center justify-between text-[9px] text-white select-none">
                  <div className="flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-white/70" />
                    <span className="font-bold tracking-widest uppercase">TERRA_DIORAMA_SLICE.V3D</span>
                  </div>
                  <button onClick={() => closeWindow('diorama')} className="hover:text-red-400 p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Diorama 3D Isometric View */}
                <div className="p-4 flex-1 flex flex-col justify-between bg-black/40">
                  <div className="relative w-full h-44 bg-gradient-to-b from-[#181b20] to-[#0d0e11] border border-white/20 rounded-[1px] flex items-center justify-center overflow-hidden">
                    
                    {/* Isometric Grid Surface */}
                    <div 
                      className="w-48 h-32 border border-white/40 bg-zinc-900/60 shadow-2xl transform rotate-x-60 rotate-z-45 flex flex-col items-center justify-center relative"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* Stylized Originium Crystal Spikes */}
                      <div className="w-6 h-12 bg-gradient-to-t from-black via-zinc-800 to-white/90 border border-white transform -rotate-12 translate-z-10 shadow-lg" />
                      <div className="w-4 h-8 bg-gradient-to-t from-black to-white/70 border border-white transform rotate-45 translate-x-4 -translate-y-2" />
                      
                      {/* Topographic Lines */}
                      <div className="absolute inset-0 border-dashed border-white/20" />
                    </div>

                    <div className="absolute bottom-2 left-2 text-[7.5px] font-mono text-white/50 uppercase">
                      TERRAIN: SARKAZ WASTELAND // SECTOR 04
                    </div>
                  </div>

                  {/* Diorama Data Info */}
                  <div className="mt-3 pt-2 border-t border-white/10 flex flex-col gap-1 text-[8px] text-white/70">
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">CRYSTAL DENSITY:</span>
                      <span className="font-bold text-emerald-400">84.2% ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/40">CATASTROPHE RISK:</span>
                      <span className="font-bold text-amber-400">CLASS 4 PROXIMITY</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* WINDOW 3: CLASSIFIED INTEL */}
            {activeWindows.find(w => w.id === 'classified_docs')?.isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ zIndex: activeWindows.find(w => w.id === 'classified_docs')?.zIndex }}
                onClick={() => bringToFront('classified_docs')}
                className="absolute inset-4 sm:inset-8 bg-[#101215] border-2 border-white/60 rounded-[2px] shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="px-4 py-2 bg-[#202329] border-b border-white/20 flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2 font-bold tracking-widest uppercase">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>CLASSIFIED_INTEL.SYS // RHODES ISLAND DATABASE</span>
                  </div>
                  <button onClick={() => closeWindow('classified_docs')} className="hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <PRTSClassifiedIntel />
                </div>
              </motion.div>
            )}

            {/* WINDOW 4: OBSIDIAN KNOWLEDGE VAULT */}
            {activeWindows.find(w => w.id === 'obsidian_vault')?.isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ zIndex: activeWindows.find(w => w.id === 'obsidian_vault')?.zIndex }}
                onClick={() => bringToFront('obsidian_vault')}
                className="absolute inset-4 sm:inset-8 bg-[#101215] border-2 border-white/60 rounded-[2px] shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="px-4 py-2 bg-[#202329] border-b border-white/20 flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2 font-bold tracking-widest uppercase">
                    <Database className="w-4 h-4 text-lime-400" />
                    <span>LORE_KNOWLEDGE_VAULT.PRTS // OBSIDIAN GRAPH & CANVAS</span>
                  </div>
                  <button onClick={() => closeWindow('obsidian_vault')} className="hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ObsidianArchiveViewer />
                </div>
              </motion.div>
            )}

          </div>

          {/* --- BOTTOM SYSTEM DOCK --- */}
          <div className="relative z-20 w-full px-5 py-2 bg-[#14161a] border-t border-white/10 flex items-center justify-between text-[9px] text-white/50">
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 hover:text-white transition-colors uppercase cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN TO MAIN TERMINAL</span>
            </button>

            <div className="flex items-center gap-4">
              <span>RHODES ISLAND BIOS V1.21</span>
              <span>MEMORY: 64TB // OK</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

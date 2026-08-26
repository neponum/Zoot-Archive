import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Power, RotateCcw, ArrowRight, CornerDownLeft, Shield, Terminal, CheckCircle2, User, KeyRound, Sparkles } from 'lucide-react';

interface PRTSCRTAuthProps {
  onAuthorize: (username: string) => void;
  defaultUser?: string;
  onPowerOff?: () => void;
}

const PRESET_OPERATORS = [
  {
    id: 'kaltsit',
    name: "Kal'tsit",
    title: 'Chief Medical Officer',
    avatar: 'https://raw.githubusercontent.com/Aceship/AN-EN-Tags/master/img/avatars/char_003_kalts.png',
    fallbackAvatar: 'https://torappu.prts.wiki/assets/char_portrait/char_003_kalts_1.png',
    code: 'RM-001'
  },
  {
    id: 'doctor',
    name: 'Doctor',
    title: 'Tactical Commander',
    avatar: 'https://raw.githubusercontent.com/Aceship/AN-EN-Tags/master/img/avatars/char_002_amiya.png',
    fallbackAvatar: 'https://torappu.prts.wiki/assets/char_portrait/char_002_amiya_1.png',
    code: 'DOC-000'
  },
  {
    id: 'amiya',
    name: 'Amiya',
    title: 'Rhodes Island CEO',
    avatar: 'https://raw.githubusercontent.com/Aceship/AN-EN-Tags/master/img/avatars/char_002_amiya.png',
    fallbackAvatar: 'https://torappu.prts.wiki/assets/char_portrait/char_002_amiya_1.png',
    code: 'RI-CEO'
  },
  {
    id: 'closure',
    name: 'Closure',
    title: 'Chief Systems Administrator',
    avatar: 'https://raw.githubusercontent.com/Aceship/AN-EN-Tags/master/img/avatars/char_4228_closur.png',
    fallbackAvatar: 'https://torappu.prts.wiki/assets/char_portrait/char_4228_closur_1.png',
    code: 'SYS-ROOT'
  }
];

export const PRTSCRTAuth: React.FC<PRTSCRTAuthProps> = ({ onAuthorize, defaultUser = "Kal'tsit", onPowerOff }) => {
  const [selectedUserIndex, setSelectedUserIndex] = useState<number>(0);
  const [password, setPassword] = useState<string>('••••••••');
  const [stage, setStage] = useState<'booting' | 'login' | 'authorizing' | 'glitch' | 'complete'>('booting');
  const [bootProgress, setBootProgress] = useState<number>(0);
  const [dialogueText, setDialogueText] = useState<string>('');
  const [isGlitching, setIsGlitching] = useState<boolean>(false);

  const currentUser = PRESET_OPERATORS[selectedUserIndex];

  // Synthesize realistic retro CRT sounds via Web Audio API
  const playTerminalSound = (type: 'boot' | 'beep' | 'keystroke' | 'granted' | 'glitch' | 'dud') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'boot') {
        // CRT power on high frequency whistle & degauss hum
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(15625, ctx.currentTime); // Standard 15kHz CRT horizontal flyback
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);

        // Low degauss thud
        const thud = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thud.type = 'triangle';
        thud.frequency.setValueAtTime(120, ctx.currentTime);
        thud.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);
        thudGain.gain.setValueAtTime(0.15, ctx.currentTime);
        thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        thud.connect(thudGain);
        thudGain.connect(ctx.destination);
        thud.start();
        thud.stop(ctx.currentTime + 0.5);
      } else if (type === 'keystroke') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1400 + Math.random() * 200, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      } else if (type === 'granted') {
        const now = ctx.currentTime;
        [880, 1174.66, 1760].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0.08, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.3);
        });
      } else if (type === 'glitch') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(60, ctx.currentTime + 0.05);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Audio context blocked
    }
  };

  // Boot sequence animation on mount
  useEffect(() => {
    playTerminalSound('boot');
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 25) + 15;
      if (current >= 100) {
        current = 100;
        setBootProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          setStage('login');
        }, 500);
      } else {
        setBootProgress(current);
      }
    }, 120);

    return () => clearInterval(interval);
  }, []);

  // Enter key press listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (stage === 'login') {
          handleExecuteLogin();
        } else if (stage === 'complete') {
          setStage('login');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, selectedUserIndex]);



  const handleRestart = () => {
    playTerminalSound('boot');
    setStage('booting');
    setBootProgress(0);
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 30) + 20;
      if (current >= 100) {
        current = 100;
        setBootProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          setStage('login');
        }, 400);
      } else {
        setBootProgress(current);
      }
    }, 100);
  };

  const handleExecuteLogin = () => {
    if (stage !== 'login' && stage !== 'complete') return;
    setStage('authorizing');
    playTerminalSound('granted');

    // Step 1: Animate cascading white boxes & glitch (Exact video 00:11-00:17)
    setTimeout(() => {
      setDialogueText('可露希尔?');
      setIsGlitching(true);
      playTerminalSound('glitch');

      setTimeout(() => {
        setDialogueText('...可露希尔!');
        
        setTimeout(() => {
          setStage('complete');
          setIsGlitching(false);
          playTerminalSound('granted');
          onAuthorize(currentUser.name);
        }, 900);
      }, 700);
    }, 800);
  };


  return (
    <div className="w-full h-full bg-[#050507] flex items-center justify-center p-2 sm:p-4 md:p-8 select-none font-mono relative overflow-hidden">
      
      {/* Outer Curved CRT Monitor Bezel Frame (Exact shape from video) */}
      <div className="relative w-full max-w-5xl h-full max-h-[640px] bg-[#1a1b1e] rounded-[1.75rem] sm:rounded-[2.5rem] p-3 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-8px_16px_rgba(0,0,0,0.8)] border-4 border-[#28292d] flex flex-col justify-between overflow-hidden">
        
        {/* Top Monitor Bezel Reflection / Overhead Spotlight Glare */}
        <div className="absolute top-0 left-1/4 right-1/4 h-2 bg-gradient-to-b from-white/20 to-transparent rounded-full blur-[1px] pointer-events-none z-30" />
        
        {/* Inner Curved CRT Display Screen */}
        <div className="relative flex-1 w-full bg-[#0f1114] rounded-[1.25rem] sm:rounded-[2rem] overflow-hidden shadow-[inset_0_0_80px_rgba(0,0,0,0.95)] border-2 border-[#121316] flex flex-col justify-between">
          
          {/* CRT Scanline Filter Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none z-20 opacity-35"
            style={{
              backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.8) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
              backgroundSize: '100% 3px, 6px 100%'
            }}
          />

          {/* CRT Phosphor Glow & Screen Curvature Vignette */}
          <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_100px_rgba(0,0,0,0.85)]" />

          {/* Glitch Scanline Sweep Effect */}
          {isGlitching && (
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: '200%' }}
              transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
              className="absolute left-0 right-0 h-16 bg-white/10 blur-sm pointer-events-none z-30"
            />
          )}

          {/* --- TOP STATUS BAR --- */}
          <div className="relative z-10 w-full px-6 pt-4 flex items-center justify-between opacity-40 text-[9px]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>TERMINAL ID: PRTS-0994</span>
            </div>
            <span>RHODES ISLAND TERMINAL BIOS V1.21</span>
          </div>

          {/* --- CENTER DISPLAY AREA --- */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
            <AnimatePresence mode="wait">

              {/* 1. BOOTING SCREEN (Frame 00:06 - 00:08) */}
              {stage === 'booting' && (
                <motion.div
                  key="booting"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center gap-4 text-center"
                >
                  {/* Glowing White Rhodes Island Rook / Castle Insignia */}
                  <div className="relative flex flex-col items-center">
                    <svg className="w-16 h-20 sm:w-20 sm:h-24 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]" viewBox="0 0 100 120" fill="currentColor">
                      {/* Stylized Rhodes Island Castle Rook */}
                      <path d="M20,110 L80,110 L75,85 L70,85 L70,55 L78,55 L78,25 L68,25 L68,35 L60,35 L60,25 L52,25 L52,35 L48,35 L48,25 L40,25 L40,35 L32,25 L22,25 L22,55 L30,55 L30,85 L25,85 Z" />
                      <rect x="42" y="60" width="16" height="25" fill="#0f1114" />
                    </svg>

                    {/* ZOOT V1.21 */}
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-xl sm:text-2xl font-black tracking-widest text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                        ZOOT
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-white/80 tracking-wider">
                        ® V1.21
                      </span>
                    </div>
                  </div>

                  {/* Loading Progress Bar Blocks */}
                  <div className="w-48 sm:w-64 h-3 bg-black/80 border border-white/30 p-0.5 flex items-center gap-0.5 rounded-[1px]">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const isFilled = (i / 16) * 100 <= bootProgress;
                      return (
                        <div
                          key={i}
                          className={`flex-1 h-full transition-colors duration-100 ${
                            isFilled ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]' : 'bg-transparent'
                          }`}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* 2. MAIN LOGIN TERMINAL SCREEN (Frame 00:09 - 00:10) */}
              {stage === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16 px-4 sm:px-12 max-w-4xl"
                >
                  {/* Left Side: Glowing Rhodes Island Castle Logo & ZOOT V1.21 */}
                  <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <svg className="w-20 h-24 sm:w-24 sm:h-28 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]" viewBox="0 0 100 120" fill="currentColor">
                      <path d="M20,110 L80,110 L75,85 L70,85 L70,55 L78,55 L78,25 L68,25 L68,35 L60,35 L60,25 L52,25 L52,35 L48,35 L48,25 L40,25 L40,35 L32,25 L22,25 L22,55 L30,55 L30,85 L25,85 Z" />
                      <rect x="42" y="60" width="16" height="25" fill="#0f1114" />
                    </svg>

                    <div className="flex items-baseline gap-1.5 mt-3">
                      <span className="text-2xl sm:text-3xl font-black tracking-widest text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                        ZOOT
                      </span>
                      <span className="text-xs font-bold text-white/70 tracking-wider">
                        ® V1.21
                      </span>
                    </div>

                    <span className="text-[8px] text-white/40 tracking-[0.25em] uppercase mt-1">
                      RHODES ISLAND SECURE REPOSITORY
                    </span>
                  </div>

                  {/* Right Side: Exact Arknights CRT Login Box */}
                  <div className="w-full max-w-sm flex flex-col gap-3 relative">
                    
                    {/* Background Dot Matrix Accents */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                        backgroundSize: '8px 8px'
                      }}
                    />

                    {/* Main Login Card with Avatar + Inputs */}
                    <div className="bg-[#181a1f]/90 border border-white/30 p-3 sm:p-4 rounded-[2px] shadow-2xl flex gap-3 sm:gap-4 relative backdrop-blur-sm">
                      
                      {/* Left: Operator Avatar Thumbnail */}
                      <div 
                        onClick={() => {
                          setSelectedUserIndex((prev) => (prev + 1) % PRESET_OPERATORS.length);
                          playTerminalSound('keystroke');
                        }}
                        className="w-16 h-20 sm:w-20 sm:h-24 bg-black/80 border border-white/40 rounded-[1px] relative overflow-hidden shrink-0 cursor-pointer hover:border-white transition-colors group"
                        title="Click to cycle operator identity"
                      >
                        <img 
                          src={currentUser.avatar} 
                          alt={currentUser.name}
                          className="w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = currentUser.fallbackAvatar;
                          }}
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-center text-white/70 uppercase py-0.5">
                          {currentUser.code}
                        </div>
                      </div>

                      {/* Right: Username & Password Inputs */}
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        
                        {/* Username Row */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[8px] text-white/60 uppercase tracking-widest">
                            <span>USERNAME:</span>
                            <button
                              onClick={() => {
                                setSelectedUserIndex((prev) => (prev + 1) % PRESET_OPERATORS.length);
                                playTerminalSound('keystroke');
                              }}
                              className="text-[7.5px] text-emerald-400/80 hover:text-emerald-300 transition-colors uppercase"
                            >
                              [SWITCH]
                            </button>
                          </div>
                          
                          <div className="px-2.5 py-1.5 bg-white/10 border border-white/20 text-xs font-bold text-white tracking-wider flex items-center justify-between">
                            <span>{currentUser.name}</span>
                            <span className="text-[8px] text-white/40 uppercase">{currentUser.title.split(' ')[0]}</span>
                          </div>
                        </div>

                        {/* Password & Submit Arrow Row */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 px-2.5 py-1.5 bg-black/70 border border-white/30 text-xs text-white tracking-[0.3em] font-bold">
                            {password}
                          </div>

                          <button
                            onClick={handleExecuteLogin}
                            className="px-3 py-2 bg-white hover:bg-white/90 text-black font-black text-xs rounded-[1px] flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(255,255,255,0.7)] active:scale-95"
                            title="Execute Authorization"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    </div>

                    {/* Bottom Helper text */}
                    <div className="flex items-center justify-between px-1 text-[8px] text-white/40 tracking-wider">
                      <span>BIOMETRIC OVERRIDE: READY</span>
                      <button 
                        onClick={handleExecuteLogin}
                        className="hover:text-white transition-colors uppercase cursor-pointer"
                      >
                        [ PRESS ENTER ↵ ]
                      </button>
                    </div>

                  </div>
                </motion.div>
              )}

              {/* 3. AUTHORIZING & CASCADING RECTANGLES ANIMATION (Frame 00:11 - 00:17) */}
              {stage === 'authorizing' && (
                <motion.div
                  key="authorizing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center relative w-full h-full"
                >
                  {/* Cascading rectangular wireframes matching video */}
                  <div className="relative w-64 h-40 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [0.8, 1.2, 1], opacity: [0.3, 0.9, 0.6] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="absolute inset-0 border-2 border-white/60 rounded-[1px]"
                    />
                    <motion.div
                      animate={{ scale: [0.9, 1.3, 1.1], opacity: [0.5, 1, 0.7], x: [-10, 10, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.1 }}
                      className="absolute inset-4 border border-white/80 rounded-[1px]"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.4, 1.2], opacity: [0.7, 1, 0.9], y: [-5, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                      className="absolute inset-8 border-2 border-white drop-shadow-[0_0_10px_white]"
                    />
                  </div>

                  {/* Subtitle Prompts matching the video ("可露希尔?" / "...可露希尔!") */}
                  {dialogueText && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 text-sm font-bold text-white tracking-widest text-center"
                    >
                      {dialogueText}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* 4. ACCESS GRANTED / TERMINAL CONNECTED SCREEN */}
              {stage === 'complete' && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-4 text-center max-w-lg"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-emerald-400 bg-emerald-950/60 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]">
                    <CheckCircle2 className="w-7 h-7 animate-pulse" />
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl sm:text-2xl font-black text-white tracking-widest uppercase drop-shadow-[0_0_10px_white]">
                      AUTHORIZATION GRANTED
                    </span>
                    <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
                      // OPERATOR: {currentUser.name.toUpperCase()} [{currentUser.code}]
                    </span>
                    <span className="text-[9px] text-white/50 uppercase tracking-wider mt-1">
                      {currentUser.title} • CLEARANCE LEVEL 5
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => {
                        playTerminalSound('keystroke');
                        setStage('login');
                      }}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-[10px] font-bold tracking-widest uppercase transition-all rounded-[1px] cursor-pointer"
                    >
                      [ RETURN TO LOGIN ↵ ]
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUserIndex((prev) => (prev + 1) % PRESET_OPERATORS.length);
                        playTerminalSound('keystroke');
                        setStage('login');
                      }}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black tracking-widest uppercase transition-all rounded-[1px] cursor-pointer shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                    >
                      [ SWITCH OPERATOR ]
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

          {/* --- BOTTOM TERMINAL CONTROLS ROW (Frame 00:09) --- */}
          <div className="relative z-10 w-full px-6 pb-4 flex items-center justify-between text-[9px] font-bold text-white/50 border-t border-white/5 pt-2">
            
            {/* Left: POWER OFF & RESTART BUTTONS */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  playTerminalSound('keystroke');
                  if (onPowerOff) onPowerOff();
                }}
                className="flex items-center gap-1.5 hover:text-red-400 transition-colors uppercase cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                <span>POWER OFF</span>
              </button>

              <button
                onClick={handleRestart}
                className="flex items-center gap-1.5 hover:text-white transition-colors uppercase cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESTART</span>
              </button>
            </div>

            {/* Right: WELCOME TO LOG IN */}
            <div className="tracking-[0.25em] uppercase text-white/60">
              WELCOME TO LOG IN
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, ShieldCheck, ChevronRight, Lock, User, Sparkles, ArrowRight, CornerDownLeft } from 'lucide-react';

interface PRTSArchiveAuthProps {
  onAuthorize: (username: string) => void;
  defaultUser?: string;
}

const PRESET_USERS = [
  { id: 'kaltsit', name: "Kal'tsit", title: 'Chief Medical Officer / Rhodes Island Leader' },
  { id: 'doctor', name: 'Doctor', title: 'Tactical Commander / Rhodes Island' },
  { id: 'amiya', name: 'Amiya', title: 'Lord of Fiends / CEO of Rhodes Island' },
  { id: 'closure', name: 'Closure', title: 'Chief Systems Administrator' }
];

export const PRTSArchiveAuth: React.FC<PRTSArchiveAuthProps> = ({ onAuthorize, defaultUser = "Kal'tsit" }) => {
  const [username, setUsername] = useState<string>(defaultUser);
  const [password, setPassword] = useState<string>('••••••••');
  const [isTypingPassword, setIsTypingPassword] = useState<boolean>(false);
  const [rawPassword, setRawPassword] = useState<string>('rhodes1099');
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [authStep, setAuthStep] = useState<'idle' | 'badge' | 'authority' | 'flash' | 'complete'>('idle');
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [showForgotHint, setShowForgotHint] = useState<boolean>(false);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Synthesize PRTS UI sound effects via Web Audio API
  const playSound = (type: 'beep' | 'type' | 'granted' | 'flash') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'type') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200 + Math.random() * 400, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'granted') {
        // Futuristic double chime
        const now = ctx.currentTime;
        [1046.5, 1318.5, 1567.98].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.1, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.35);
        });
      } else if (type === 'flash') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // AudioContext blocked or not supported
    }
  };

  const handleStartAuth = () => {
    if (isAuthorizing) return;
    setIsAuthorizing(true);
    playSound('beep');

    // Step 1: Black square credential token appears
    setAuthStep('badge');

    setTimeout(() => {
      // Step 2: Expands to show ADMINISTRATOR / AUTHORITY / WELCOME
      setAuthStep('authority');
      playSound('granted');

      setTimeout(() => {
        // Step 3: White screen flash transition
        setAuthStep('flash');
        playSound('flash');

        setTimeout(() => {
          setAuthStep('complete');
          onAuthorize(username || "Kal'tsit");
        }, 400);
      }, 1600);
    }, 900);
  };

  const handleResetAuth = () => {
    setIsAuthorizing(false);
    setAuthStep('idle');
    playSound('beep');
  };

  const handleQuickBypass = () => {
    setUsername("Kal'tsit");
    setRawPassword('PRTS_ROOT_ACCESS');
    setPassword('••••••••••••');
    setShowForgotHint(true);
    playSound('type');
  };

  return (
    <div className="relative w-full h-full bg-[#f6f8f6] text-[#111] select-none overflow-hidden font-mono flex flex-col justify-between">
      {/* Background Ambience: Subtle grid lines & Neon Lime Glow matching the video */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40" 
        style={{
          backgroundImage: `
            radial-gradient(circle at 85% 15%, rgba(190, 242, 100, 0.45) 0%, rgba(163, 230, 53, 0.15) 35%, transparent 65%),
            radial-gradient(circle at 10% 90%, rgba(190, 242, 100, 0.25) 0%, transparent 45%),
            linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 40px 40px, 40px 40px'
        }}
      />

      {/* Subtle organic green flare in top right */}
      <div className="absolute -top-32 -right-32 w-[550px] h-[550px] bg-[#d9f99d]/30 rounded-full blur-3xl pointer-events-none animate-pulse duration-[4000ms]" />

      {/* --- TOP HEADER ROW --- */}
      <div className="relative z-10 w-full px-6 sm:px-12 pt-6 flex items-center justify-between">
        {/* Top Left Marker */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-[2px] bg-black/80" />
          <span className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] text-black/60 uppercase">
            [SYS.04] // PROTOCOL: ARCHIVE
          </span>
        </div>

        {/* Top Right: POWERED BY RHODES ISLAND (as in video) */}
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-end">
            <span className="text-[7.5px] sm:text-[8.5px] font-bold text-black/50 tracking-[0.3em] uppercase leading-none">
              POWERED BY
            </span>
            <span className="text-[10px] sm:text-[11px] font-black text-black tracking-[0.15em] uppercase mt-0.5">
              RHODES ISLAND
            </span>
          </div>
          <div className="w-5 h-5 border-2 border-black flex items-center justify-center rotate-45">
            <div className="w-2 h-2 bg-black" />
          </div>
        </div>
      </div>

      {/* --- MAIN CENTER SECTION --- */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-20 px-6 sm:px-12 py-4">
        
        {/* Left Side: PRTS Logo & Analysis Box (Identical to Video) */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex items-stretch gap-4 sm:gap-5 shrink-0"
        >
          {/* Green accent parallelogram/bar */}
          <div className="w-3.5 sm:w-4.5 bg-gradient-to-b from-[#a3e635] via-[#84cc16] to-[#4d7c0f] rounded-[1px] transform -skew-x-12 shadow-[0_0_15px_rgba(163,230,53,0.5)]" />

          <div className="flex flex-col justify-center">
            {/* PRTS Big Logo */}
            <div className="relative">
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-black leading-none font-sans font-black uppercase">
                PRTS
              </h1>
            </div>

            {/* Synthesize Information */}
            <span className="text-[8px] sm:text-[9.5px] font-bold tracking-[0.32em] text-black/70 uppercase mt-1">
              SYNTHESIZE INFORMATION
            </span>

            {/* ANALYSIS [ 05 ] Box with sleek underline */}
            <div className="flex items-center gap-2 mt-1.5 border-b border-black/80 pb-1">
              <span className="text-[11px] sm:text-[13px] font-black tracking-[0.25em] text-black uppercase">
                ANALYSIS
              </span>
              <div className="px-2 py-0.5 border border-black/90 text-[10px] sm:text-[11px] font-black tracking-widest bg-white/60">
                05
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center Chevron Arrow (as in video: ») */}
        <div className="hidden lg:flex items-center text-black/40 text-xl font-bold tracking-widest">
          <span>»</span>
        </div>

        {/* Right Side: Interactive Login / Auth Section OR Success Transition */}
        <div className="relative w-full max-w-md min-h-[220px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            
            {/* 1. IDLE LOGIN FORM (Matches Video Frame 00:07 - 00:08) */}
            {authStep === 'idle' && (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full flex flex-col gap-3.5"
              >
                {/* Row 1: [ USERNAME ] [ Kal'tsit. ] */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="shrink-0 px-2.5 py-1.5 bg-black text-white text-[8px] sm:text-[9px] font-black tracking-[0.2em] uppercase rounded-[2px] shadow-sm">
                    [ USERNAME ]
                  </div>
                  <div className="relative flex-1">
                    <div 
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="w-full px-3 py-1.5 bg-white border border-black/80 hover:border-black text-[11px] sm:text-xs font-bold text-black flex items-center justify-between cursor-pointer transition-colors shadow-sm"
                    >
                      <span className="truncate">[ {username} ]</span>
                      <span className="text-[9px] text-black/40">▼</span>
                    </div>

                    {/* Quick user selector popup */}
                    {showUserDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-black z-30 shadow-xl py-1">
                        {PRESET_USERS.map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setUsername(u.name);
                              setShowUserDropdown(false);
                              playSound('type');
                            }}
                            className="w-full px-3 py-1.5 text-left text-[11px] font-bold hover:bg-black hover:text-white transition-colors flex items-center justify-between"
                          >
                            <span>[ {u.name} ]</span>
                            <span className="text-[8px] opacity-50 uppercase">{u.title.split('/')[0]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: [ PASSWORD ] [ •••••••• ] */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="shrink-0 px-2.5 py-1.5 bg-black text-white text-[8px] sm:text-[9px] font-black tracking-[0.2em] uppercase rounded-[2px] shadow-sm">
                    [ PASSWORD ]
                  </div>
                  <div className="relative flex-1 flex items-center">
                    <input
                      ref={passwordInputRef}
                      type="password"
                      value={rawPassword}
                      onChange={(e) => {
                        setRawPassword(e.target.value);
                        setPassword('•'.repeat(e.target.value.length || 8));
                        playSound('type');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleStartAuth();
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-black/80 focus:border-black focus:ring-1 focus:ring-black text-[11px] sm:text-xs font-bold text-black tracking-widest outline-none shadow-sm"
                      placeholder="••••••••"
                    />
                    <button
                      onClick={handleStartAuth}
                      className="absolute right-1 px-2.5 py-1 bg-black hover:bg-zinc-800 text-white text-[9px] font-black uppercase tracking-wider rounded-[1px] transition-colors cursor-pointer flex items-center gap-1"
                      title="Authorize"
                    >
                      <span>ENTER</span>
                      <CornerDownLeft className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Sub row: • FORGOT YOUR PASSWORD ? (as in video) */}
                <div className="flex items-center justify-between pt-1 px-1">
                  <button
                    onClick={handleQuickBypass}
                    className="text-[8px] sm:text-[9px] font-black tracking-[0.2em] text-black/60 hover:text-black uppercase cursor-pointer transition-colors flex items-center gap-1.5 text-left"
                  >
                    <span>• FORGOT YOUR PASSWORD ?</span>
                  </button>

                  <button
                    onClick={handleStartAuth}
                    className="text-[8px] sm:text-[9px] font-black tracking-[0.25em] text-[#4d7c0f] hover:text-black uppercase cursor-pointer flex items-center gap-1 group font-bold"
                  >
                    <span>DIRECT ACCESS</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {showForgotHint && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 bg-[#d9f99d]/50 border border-[#84cc16] text-[8.5px] font-mono text-black leading-tight rounded-sm"
                  >
                    <span className="font-black text-[#365314]">[SYSTEM OVERRIDE]</span> Biometric bypass loaded for Chief Medical Officer (Kal'tsit). Click <strong>ENTER</strong> to execute.
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* 2. BADGE ONLY ANIMATION (Matches Video Frame 00:09 - 00:10) */}
            {authStep === 'badge' && (
              <motion.div
                key="auth-badge"
                initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, ease: 'backOut' }}
                className="flex items-center justify-center"
              >
                {/* The Solid Black Square with the 4 Slashes */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-black shadow-2xl flex flex-col items-center justify-center p-3 border border-black relative">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-white font-mono text-xl sm:text-2xl font-black italic tracking-tighter">
                    <span className="animate-pulse">//</span>
                    <span className="animate-pulse" style={{ animationDelay: '100ms' }}>//</span>
                    <span className="animate-pulse" style={{ animationDelay: '200ms' }}>//</span>
                    <span className="animate-pulse" style={{ animationDelay: '300ms' }}>//</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. AUTHORITY / WELCOME LOCK-IN (Matches Video Frame 00:11 - 00:13) */}
            {authStep === 'authority' && (
              <motion.div
                key="auth-welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-4 sm:gap-6 bg-white/80 backdrop-blur-md p-4 sm:p-6 border-2 border-black shadow-2xl"
              >
                {/* Left Credential Square */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black flex flex-col items-center justify-center p-2 shrink-0 border border-black">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-white font-mono text-lg sm:text-xl font-black italic tracking-tighter">
                    <span>//</span>
                    <span>//</span>
                    <span>//</span>
                    <span>//</span>
                  </div>
                </div>

                {/* Right Authority Welcome Text (Identical to Video) */}
                <div className="flex flex-col">
                  <span className="text-[13px] sm:text-base font-black tracking-[0.25em] text-black font-sans uppercase leading-none">
                    ADMINISTRATOR
                  </span>
                  <span className="text-[13px] sm:text-base font-black tracking-[0.25em] text-black font-sans uppercase leading-none mt-1">
                    AUTHORITY
                  </span>
                  <span className="text-xl sm:text-2xl font-black tracking-[0.18em] text-black font-sans uppercase leading-none mt-1.5 text-black">
                    WELCOME
                  </span>
                </div>
              </motion.div>
            )}

            {/* 4. COMPLETE / ACCESS LOGGED STATE */}
            {authStep === 'complete' && (
              <motion.div
                key="auth-complete"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 p-6 bg-white border-2 border-black shadow-2xl text-center"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-lime-500 rounded-full animate-ping" />
                  <span className="text-sm sm:text-base font-black tracking-[0.2em] text-black uppercase">
                    [ SESSION ACTIVE // {username.toUpperCase()} ]
                  </span>
                </div>
                <div className="text-[10px] tracking-widest text-black/60 uppercase">
                  CLEARANCE LEVEL 5 • PRTS ACCESS GRANTED
                </div>
                <button
                  onClick={handleResetAuth}
                  className="mt-2 px-4 py-2 bg-black hover:bg-zinc-800 text-white text-[9px] font-mono font-bold tracking-widest uppercase rounded-[1px] transition-colors cursor-pointer"
                >
                  [ RETURN TO LOGIN FORM ↵ ]
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

      {/* --- BOTTOM FOOTER ROW --- */}
      <div className="relative z-10 w-full px-6 sm:px-12 pb-6 flex items-center justify-between">
        <div className="text-[8px] sm:text-[9px] font-black tracking-[0.25em] text-black/50 uppercase">
          SECURITY PROTOCOL: LEVEL 5 // ARCHIVE REPOSITORY
        </div>

        {/* Bottom Center Indicator: [04] (as in video) */}
        <div className="px-2.5 py-0.5 border border-black/80 text-[9px] sm:text-[10px] font-black text-black/80 tracking-widest uppercase bg-white/70">
          [04]
        </div>

        <div className="text-[8px] sm:text-[9px] font-black tracking-[0.25em] text-black/50 uppercase">
          RHODES ISLAND PRTS V4.1
        </div>
      </div>

      {/* Full-screen Flash overlay on authentication transition (Frame 00:14) */}
      {authStep === 'flash' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-white"
        />
      )}
    </div>
  );
};

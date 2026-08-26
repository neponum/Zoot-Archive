import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCw, Sparkles } from 'lucide-react';

interface PRTSCinematicAuthProps {
  embedded?: boolean;
  onAuthorizeSuccess?: (username: string) => void;
  onExitToHub?: () => void;
}

export const PRTSCinematicAuth: React.FC<PRTSCinematicAuthProps> = ({
  embedded = true,
  onAuthorizeSuccess,
  onExitToHub
}) => {
  // Timeline Stages matching video 00:00 - 00:13:
  // 0: 00:00 - 00:02 Blank slate with top indicators, central expanding horizontal black rule
  // 1: 00:03 - 00:05 Center PRTS logo + large green parallelogram gradient + SYNTHESIZE INFORMATION + ANALYSIS [05]
  // 2: 00:06 - 00:07 PRTS slides smoothly left, » chevron and black label tags USERNAME & PASSWORD appear
  // 3: 00:08 [ Kal'tsit ] appears with dotted password, FORGOT YOUR PASSWORD ? appears, >>>>>>> and ▸▸▸1 appear
  // 4: 00:09 Password black box with asterisk [*]
  // 5: 00:10 Black square with 4 white diagonal slashes // // // //
  // 6: 00:11 White square badge with 4 black diagonal slashes // // // //
  // 7: 00:12 - 00:13 ADMINISTRATOR / AUTHORITY / WELCOME displayed next to badge
  // 8: 00:13 Transition / blackout
  const [stage, setStage] = useState<number>(0);
  const timelineTimers = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timelineTimers.current.forEach(clearTimeout);
    timelineTimers.current = [];
  };

  const playSequence = () => {
    clearTimers();
    setStage(0);

    // 00:00 - 00:02: Expanding center line
    const t1 = setTimeout(() => {
      setStage(1); // 00:03: PRTS appears in center
    }, 1500);

    const t2 = setTimeout(() => {
      setStage(2); // 00:06: PRTS moves left, USERNAME/PASSWORD appear
    }, 3200);

    const t3 = setTimeout(() => {
      setStage(3); // 00:08: [ Kal'tsit ], dots password, forgot password
    }, 4500);

    const t4 = setTimeout(() => {
      setStage(4); // 00:09: Password card [*]
    }, 5900);

    const t5 = setTimeout(() => {
      setStage(5); // 00:10: Black card // // // //
    }, 6900);

    const t6 = setTimeout(() => {
      setStage(6); // 00:11: White badge // // // //
    }, 7900);

    const t7 = setTimeout(() => {
      setStage(7); // 00:12: ADMINISTRATOR AUTHORITY WELCOME
    }, 8800);

    const t8 = setTimeout(() => {
      setStage(8); // 00:13: Cut / Flash
    }, 11800);

    // Loop replay seamlessly
    const tLoop = setTimeout(() => {
      playSequence();
    }, 13200);

    timelineTimers.current = [t1, t2, t3, t4, t5, t6, t7, t8, tLoop];
  };

  useEffect(() => {
    playSequence();
    return () => clearTimers();
  }, []);

  const stageContent = (
    <div 
      className="w-full h-full flex flex-col items-center justify-center relative select-none cursor-pointer"
      onClick={() => playSequence()}
      title="Click to replay animation sequence"
    >
      {/* 00:02: Expanding Black Line in Center */}
      {stage === 0 && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          className="w-32 sm:w-48 h-[2px] bg-black"
        />
      )}

      {/* 00:03 - 00:05: Center PRTS Logo + Large Green Parallelogram Gradient */}
      {stage === 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="relative flex items-center"
        >
          {/* Large Green Parallelogram Gradient Box (matching snapshot) */}
          <motion.div 
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.35 }}
            className="absolute -left-6 sm:-left-10 -top-8 sm:-top-10 w-28 sm:w-36 h-48 sm:h-56 -skew-x-[12deg] z-0 pointer-events-none"
            style={{
              background: 'linear-gradient(175deg, rgba(175, 238, 55, 0.95) 0%, rgba(195, 245, 95, 0.8) 40%, rgba(220, 252, 160, 0.4) 75%, rgba(245, 255, 220, 0.05) 100%)',
              boxShadow: '0 0 35px rgba(175, 238, 55, 0.4)'
            }}
          />

          {/* PRTS Info Block with Top & Bottom Rules */}
          <div className="relative z-10 flex flex-col pl-4 sm:pl-6">
            {/* Top Accent Line */}
            <div className="w-full h-[1.5px] bg-black mb-1" />

            <div className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-black font-sans leading-none drop-shadow-xs">
              PRTS
            </div>

            <div className="text-[9px] sm:text-[10.5px] font-mono tracking-[0.24em] text-black font-black uppercase mt-1">
              SYNTHESIZE INFORMATION
            </div>

            {/* Bottom Line + ANALYSIS [ 05 ] */}
            <div className="flex items-center justify-between border-t-[1.5px] border-black pt-1 mt-1 font-mono text-[10px] sm:text-[12px] font-black tracking-widest text-black">
              <span>ANALYSIS</span>
              <span className="border-[1.5px] border-black px-1.5 py-0.2 ml-2 text-[11px] sm:text-[13px]">05</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 00:06 - 00:12: PRTS on Left + Right Content Section (Snapshot exact layout) */}
      {stage >= 2 && stage <= 7 && (
        <div className="w-full max-w-5xl flex items-center justify-between px-4 sm:px-12 md:px-16">
          
          {/* Left Anchored PRTS with the Large Green Parallelogram (Snapshot match) */}
          <motion.div
            layout
            initial={{ x: 100, opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center shrink-0"
          >
            {/* Large Green Parallelogram Background */}
            <div 
              className="absolute -left-6 sm:-left-8 -top-8 sm:-top-10 w-24 sm:w-32 h-44 sm:h-52 -skew-x-[12deg] z-0 pointer-events-none"
              style={{
                background: 'linear-gradient(175deg, rgba(175, 238, 55, 0.95) 0%, rgba(195, 245, 95, 0.75) 45%, rgba(220, 252, 160, 0.35) 75%, rgba(245, 255, 220, 0.05) 100%)',
                boxShadow: '0 0 35px rgba(175, 238, 55, 0.35)'
              }}
            />

            {/* PRTS Info Block */}
            <div className="relative z-10 flex flex-col pl-4 sm:pl-6">
              {/* Top Accent Line */}
              <div className="w-full h-[1.5px] bg-black mb-1" />

              <div className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-black font-sans leading-none">
                PRTS
              </div>

              <div className="text-[8.5px] sm:text-[9.5px] font-mono tracking-[0.24em] text-black font-black uppercase mt-1">
                SYNTHESIZE INFORMATION
              </div>

              {/* Bottom Line + ANALYSIS [ 05 ] */}
              <div className="flex items-center justify-between border-t-[1.5px] border-black pt-1 mt-1 font-mono text-[10px] sm:text-[11.5px] font-black tracking-widest text-black">
                <span>ANALYSIS</span>
                <span className="border-[1.5px] border-black px-1.5 py-0.2 ml-2 text-[10.5px] sm:text-[12px]">05</span>
              </div>
            </div>
          </motion.div>

          {/* Right Side Content corresponding to timeline & snapshot */}
          <div className="flex items-center gap-4 sm:gap-6 min-w-[280px] sm:min-w-[380px]">
            
            {/* 00:06 - 00:08: Snapshot Layout: USERNAME, [ Kal'tsit ], PASSWORD, ••••••••, FORGOT YOUR PASSWORD ? */}
            {(stage === 2 || stage === 3) && (
              <motion.div
                initial={{ opacity: 0, x: 25 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-3 sm:gap-6"
              >
                {/* Double Chevron » + >>>>>>> trail */}
                <div className="flex items-center gap-1">
                  <span className="text-black font-black text-xl tracking-tighter select-none font-mono">
                    »
                  </span>
                  <span className="text-black/35 font-mono text-[8px] tracking-tight select-none">
                    &gt;&gt;&gt;&gt;&gt;&gt;&gt;
                  </span>
                </div>

                {/* Inputs Column */}
                <div className="flex flex-col gap-3">
                  {/* USERNAME ROW */}
                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 bg-black text-white text-[9px] font-mono font-black tracking-widest uppercase">
                      USERNAME
                    </div>
                    {stage >= 3 && (
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="font-mono font-black text-sm sm:text-base tracking-wider text-black flex items-center gap-1"
                      >
                        <span>[</span>
                        <span className="mx-1 font-sans font-black">Kal'tsit</span>
                        <span>]</span>
                      </motion.div>
                    )}
                  </div>

                  {/* PASSWORD ROW */}
                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 bg-black text-white text-[9px] font-mono font-black tracking-widest uppercase">
                      PASSWORD
                    </div>
                    {stage >= 3 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-black font-black text-base tracking-[0.25em] pl-1 font-mono"
                      >
                        ••••••••
                      </motion.div>
                    )}
                  </div>

                  {/* ■ FORGOT YOUR PASSWORD ? (matching snapshot) */}
                  {stage >= 3 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-1.5 text-[8px] sm:text-[8.5px] font-mono text-black font-bold uppercase tracking-wider mt-0.5"
                    >
                      <span className="w-1.5 h-1.5 bg-black shrink-0" />
                      <span>FORGOT YOUR PASSWORD ?</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 00:09: Password card [*] */}
            {stage === 4 && (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-18 h-18 sm:w-24 sm:h-24 bg-black border-2 border-black shadow-2xl flex items-center justify-center text-white text-4xl sm:text-5xl font-black"
              >
                <span>*</span>
              </motion.div>
            )}

            {/* 00:10: Black card with 4 white slashes // // // // */}
            {stage === 5 && (
              <motion.div
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="w-18 h-18 sm:w-24 sm:h-24 bg-black border-2 border-black shadow-2xl flex flex-col items-center justify-center gap-1.5 p-3"
              >
                <div className="flex items-center gap-2.5 text-white font-mono font-black text-2xl tracking-widest leading-none">
                  <span>/</span>
                  <span>/</span>
                </div>
                <div className="flex items-center gap-2.5 text-white font-mono font-black text-2xl tracking-widest leading-none">
                  <span>/</span>
                  <span>/</span>
                </div>
              </motion.div>
            )}

            {/* 00:11 - 00:12: White Square Badge + ADMINISTRATOR AUTHORITY WELCOME */}
            {(stage === 6 || stage === 7) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 sm:gap-6"
              >
                {/* White badge with 4 black slashes */}
                <div className="w-18 h-18 sm:w-24 sm:h-24 bg-white border-2 border-black shadow-[5px_5px_0px_#000] flex flex-col items-center justify-center gap-1.5 p-3 shrink-0">
                  <div className="flex items-center gap-2.5 text-black font-mono font-black text-2xl tracking-widest leading-none">
                    <span>/</span>
                    <span>/</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-black font-mono font-black text-2xl tracking-widest leading-none">
                    <span>/</span>
                    <span>/</span>
                  </div>
                </div>

                {/* ADMINISTRATOR / AUTHORITY / WELCOME (00:12) */}
                {stage >= 7 && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col leading-none font-sans"
                  >
                    <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-black uppercase">
                      ADMINISTRATOR
                    </span>
                    <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-normal text-black/85 uppercase mt-0.5">
                      AUTHORITY
                    </span>
                    <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-wider text-black uppercase mt-1">
                      WELCOME
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}

          </div>

        </div>
      )}

      {/* 00:13: Cut / Flash transition effect */}
      {stage === 8 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center"
        />
      )}
    </div>
  );

  if (embedded) {
    return stageContent;
  }

  return (
    <div 
      className="w-full h-full bg-[#0a0a0d] flex items-center justify-center p-0 select-none font-sans relative overflow-hidden cursor-pointer"
      style={{
        perspective: '1300px',
        perspectiveOrigin: '50% 45%'
      }}
    >
      <motion.div
        className="w-full h-full max-w-[1440px] max-h-[880px] aspect-[16/9] bg-[#f5f6ed] text-black relative shadow-[0_40px_120px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col justify-between p-10 sm:p-14 md:p-20"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'rotateX(13.5deg) rotateY(-4.5deg) rotateZ(0.5deg)'
        }}
      >
        {stageContent}
      </motion.div>
    </div>
  );
};

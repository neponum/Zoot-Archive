import React from 'react';

interface StorySceneButtonProps {
  code: string;
  label: string;
  onClick: () => void;
}

/** Кнопка сюжетной сцены в стиле OPERATION из карты сюжета. */
export const StorySceneButton: React.FC<StorySceneButtonProps> = ({
  code,
  label,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    className="group relative flex h-[32px] select-none items-center pl-[13px] pr-0 transition-transform duration-150 hover:scale-[1.02] focus:outline-none"
  >
    <span className="absolute left-0 top-1/2 z-10 h-[30px] w-[30px] -translate-y-1/2 rounded-full border border-[#2c3036] bg-[radial-gradient(circle_at_45%_40%,#ffffff_0%,#e6e9ed_68%,#b8bec6_100%)] shadow-[0_3px_8px_rgba(0,0,0,0.85)]" />
    <span className="relative z-20 -ml-1 h-[20px] w-[18px] shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]">
      <svg viewBox="0 0 36 40" className="h-full w-full">
        <polygon
          points="18,1.5 34,10.5 34,29.5 18,38.5 2,29.5 2,10.5"
          fill="#aeb4bc"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <polygon
          points="18,4.5 31,12 31,28 18,35.5 5,28 5,12"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.9"
        />
      </svg>
    </span>
    <span className="relative z-10 -ml-[9px] flex h-[27px] w-[86px] flex-col shadow-[0_3px_8px_rgba(0,0,0,0.75)]">
      <span className="flex h-[8px] items-center justify-center bg-[#111315] pl-2 pr-0.5 text-[6.5px] font-extrabold uppercase leading-none tracking-[0.12em] text-white">
        STORY
      </span>
      <span className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#f5f6f8] pl-2 pr-0.5">
        <span
          className="absolute inset-y-0 left-0 w-[56%] opacity-30"
          style={{
            backgroundImage: 'radial-gradient(#555a60 0.85px, transparent 0.85px)',
            backgroundSize: '2.6px 2.6px',
            WebkitMaskImage:
              'linear-gradient(105deg, #000 15%, rgba(0,0,0,0.45) 55%, transparent 95%)',
            maskImage:
              'linear-gradient(105deg, #000 15%, rgba(0,0,0,0.45) 55%, transparent 95%)',
          }}
        />
        <span
          className="relative z-10 text-[11px] font-bold leading-none tracking-tight text-[#2c2e32]"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {code}
        </span>
      </span>
    </span>
  </button>
);

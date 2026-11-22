import React, { useRef, useState } from 'react';

export interface StoryChapterItem {
  id: string;
  epNumber: string;
  titleMain: string;
  titlePartBadge?: string;
  subtitle: string;
  locationLabel: string;
  actHeader?: {
    actTitle: string;
    actSubtitle: string;
  };
  bannerStyle: 'square' | 'oval';
  imageSrc: string;
  useReferenceDetailArtwork?: boolean;
  synopsisLines: string[];
  /** Первая сцена главы (`storyTxt`) — открывается в читалке. */
  startStoryTxt?: string;
  branchAfter?: {
    targetStorylineId: string;
    topLabel: string;
    title: string;
    badgeText?: string;
  };
}

export interface StorylineCategory {
  /** Идентификатор линии (`ms`, `rl`, … `ts`). */
  id: string;
  /** Код линии из игры: `MS`, `RL`, `LE`, `TA`, `ST`, `TS`, … */
  code: string;
  topLabel: string;
  mainTitle: string;
  /** Официальное китайское название линии с PRTS. */
  nativeTitle: string;
  /** Иконка линии из игры (`图标_曲谱_*.png`, media.prts.wiki). */
  icon: string;
  chapters: StoryChapterItem[];
}

interface StoryTimelineViewProps {
  storylines: StorylineCategory[];
  onBackToTerminal: () => void;
  /** Переход в читалку: открывает первую сцену выбранной главы. */
  onOpenStory: (chapter: StoryChapterItem) => void;
}

export const StoryTimelineView: React.FC<StoryTimelineViewProps> = ({
  storylines,
  onBackToTerminal,
  onOpenStory,
}) => {
  const [activeStorylineId, setActiveStorylineId] = useState<string>(
    () => storylines[0]?.id ?? 'ms'
  );
  const [selectedChapter, setSelectedChapter] =
    useState<StoryChapterItem | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  const activeStoryline =
    storylines.find((s) => s.id === activeStorylineId) ?? storylines[0];

  const handleSelectStoryline = (id: string) => {
    setActiveStorylineId(id);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  // ============================================================================
  // VIEW 2: STORY BANNER DETAIL VIEW (matching image_4ad02105.png)
  // ============================================================================
  if (!activeStoryline) return null;
  if (selectedChapter) {
    return (
      <section
        aria-label={selectedChapter.subtitle}
        className="fixed inset-0 z-40 w-screen h-screen bg-[#020305] text-white overflow-hidden flex flex-col md:flex-row select-none"
      >
        {/* Left ~68% Full-Bleed Chapter Key Visual Artwork */}
        <div className="relative w-full md:w-[68%] h-[54%] md:h-full overflow-hidden bg-[#04070b] shrink-0">
          {selectedChapter.useReferenceDetailArtwork ? (
            /* Exact rotated key visual from image_4ad02105.png (Amiya under cyan Chernobog sky)
               with the right black gradient seamlessly masking the original right panel */
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-[#04080e]">
              <img
                src="/assets/aistudio/image_4ad02105.png"
                alt={selectedChapter.subtitle}
                draggable={false}
                className="w-[100vh] h-[145vw] max-w-none object-cover -rotate-90 origin-center translate-x-[12%] scale-105 pointer-events-none"
              />
            </div>
          ) : (
            <img
              src={selectedChapter.imageSrc}
              alt={selectedChapter.subtitle}
              draggable={false}
              className="w-full h-full object-cover object-center scale-[1.02] pointer-events-none"
            />
          )}

          {/* Smooth multi-stop dark gradient blending the artwork into the pure black right panel */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(90deg, rgba(2,3,5,0.18) 0%, rgba(2,3,5,0) 24%, rgba(2,3,5,0.08) 58%, rgba(2,3,5,0.72) 82%, #020305 97%, #020305 100%), linear-gradient(180deg, rgba(2,3,5,0.35) 0%, transparent 18%, transparent 82%, rgba(2,3,5,0.75) 100%)',
            }}
          />

          {/* Top-Left White Rounded Pill Button (matching image_4ad02105.png) */}
          <div className="absolute top-5 left-5 sm:top-8 sm:left-9 z-30 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenStory(selectedChapter)}
              className="inline-flex items-center gap-2.5 bg-white/95 hover:bg-white text-[#141618] rounded-full px-5 py-2 shadow-[0_6px_24px_rgba(0,0,0,0.65)] transition-transform active:scale-95 cursor-pointer"
            >
              {/* Gallery / Landscape frame icon matching top-left button in image_4ad02105.png */}
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 sm:w-5 sm:h-5 text-[#181a1c] shrink-0"
                aria-hidden="true"
              >
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM13.96 12.29L11.21 15.83L9.25 13.47L6.5 17H17.5L13.96 12.29Z" />
              </svg>
              <span className="text-xs sm:text-sm font-bold tracking-[0.06em] uppercase">
                CHAPTER RECOLLECTION
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedChapter(null)}
              className="inline-flex items-center gap-1.5 bg-black/65 hover:bg-white/15 text-white/85 hover:text-white border border-white/25 rounded-full px-4 py-2 text-xs font-semibold tracking-widest uppercase backdrop-blur-xs transition-colors cursor-pointer"
            >
              <span>← TIMELINE</span>
            </button>
          </div>
        </div>

        {/* Right ~32% Deep Black Lore & Episode Info Panel (matching image_4ad02105.png) */}
        <div className="relative w-full md:w-[32%] h-[46%] md:h-full bg-[#020305] flex flex-col justify-center px-7 sm:px-10 md:pl-6 md:pr-12 z-20">
          <div className="max-w-[430px]">
            {/* Stacked Square EP Badge (border-[2.5px] border-white, EP stacked over 00) */}
            <div className="inline-flex flex-col items-center justify-center border-[2.5px] border-white px-2.5 py-1 mb-4 shadow-[0_0_16px_rgba(255,255,255,0.15)]">
              <span className="text-[11px] sm:text-xs font-extrabold tracking-[0.14em] text-white leading-none border-b border-white/80 pb-0.5 w-full text-center">
                EP
              </span>
              <span className="text-base sm:text-lg font-black tracking-tight text-white leading-none pt-0.5">
                {selectedChapter.epNumber.split(' ').pop()}
              </span>
            </div>

            {/* Large Bold Chapter Title + Part Block Badge */}
            <div className="flex flex-wrap items-baseline gap-2.5 mb-6">
              <h1
                style={{
                  fontFamily:
                    "'Barlow Condensed', 'Oswald', 'Impact', sans-serif",
                }}
                className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-[0.02em] text-white uppercase leading-[1.02]"
              >
                {selectedChapter.titleMain}
              </h1>
              {selectedChapter.titlePartBadge && (
                <span className="inline-block bg-white text-[#040507] px-2 py-0.5 text-sm sm:text-base font-black tracking-wider uppercase leading-none translate-y-[-2px]">
                  {selectedChapter.titlePartBadge}
                </span>
              )}
            </div>

            {/* 6-Line Atmospheric Synopsis Paragraph */}
            <div className="space-y-1.5 text-xs sm:text-[13.5px] leading-[1.95] tracking-[0.025em] text-[#b8bcc2] font-normal">
              {selectedChapter.synopsisLines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ============================================================================
  // VIEW 1: MAIN THEME HORIZONTAL TIMELINE VIEW
  // (matching image_183db089.png, image_4287db23.png, image_8f37d742.png)
  // ============================================================================
  return (
    <section
      aria-label="Main Theme Timeline"
      className="fixed inset-0 z-20 w-screen h-screen bg-[#0b0e12] text-white overflow-hidden select-none"
    >
      {/* Dark Atmospheric Architectural Background + Vignette */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/assets/terminal/bg_bridge.png"
          alt=""
          draggable={false}
          className="w-full h-full object-cover opacity-22 scale-105 filter grayscale contrast-125"
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 60% 45%, rgba(28,35,43,0.35) 0%, rgba(8,10,14,0.88) 75%, rgba(4,6,8,0.97) 100%)',
          }}
        />
      </div>

      {/* Back to Terminal 3-Card Screen Button (Top-Left, below main header) */}
      <div className="fixed top-16 sm:top-20 left-4 sm:left-8 z-40">
        <button
          type="button"
          onClick={onBackToTerminal}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xs bg-white/[0.08] hover:bg-white/[0.18] border border-white/25 text-[11px] sm:text-xs font-semibold tracking-[0.16em] uppercase text-white/85 hover:text-white backdrop-blur-xs transition-colors cursor-pointer"
        >
          <span>← TERMINAL</span>
        </button>
      </div>

      {/* LEFT VERTICAL STORYLINE SWITCHER SIDEBAR (matching left side of image_183db089.png & image_8f37d742.png) */}
      <aside
        aria-label="Storyline Switcher"
        className="fixed left-0 top-0 bottom-0 z-30 w-[230px] sm:w-[295px] pointer-events-none flex flex-col justify-center"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(6,8,11,0.95) 0%, rgba(6,8,11,0.82) 62%, rgba(6,8,11,0) 100%)',
        }}
      >
        {/* Vertical Axis Line on the far left */}
        <div
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-[34px] sm:left-[48px] w-[1px] bg-gradient-to-b from-white/10 via-white/40 to-white/10"
        />

        <div
          ref={railRef}
          className="scrollbar-terminal relative flex flex-col gap-1 sm:gap-1.5 pt-[104px] pb-4 max-h-full overflow-y-auto pointer-events-auto"
          style={{
            maskImage:
              'linear-gradient(180deg, transparent 0px, #000 96px, #000 calc(100% - 14px), transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(180deg, transparent 0px, #000 96px, #000 calc(100% - 14px), transparent 100%)',
          }}
        >
          {storylines.map((storyline) => {
            const isActive = storyline.id === activeStorylineId;
            return (
              <button
                key={storyline.id}
                type="button"
                onClick={() => handleSelectStoryline(storyline.id)}
                className="group relative flex items-center text-left pl-[14px] sm:pl-[26px] pr-4 py-0.5 focus:outline-none cursor-pointer shrink-0"
              >
                {/* Node Circle on Vertical Axis */}
                <div className="relative flex items-center justify-center w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] shrink-0">
                  {isActive ? (
                    <>
                      {/* Outer glowing halo ring matching image_183db089.png */}
                      <span className="absolute inset-0 rounded-full bg-[#090c10]/90 border border-white/45 shadow-[0_0_20px_rgba(255,255,255,0.7),inset_0_0_10px_rgba(255,255,255,0.25)]" />
                      {/* Bright white core dot */}
                      <span className="relative w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_#ffffff]" />
                    </>
                  ) : (
                    <>
                      <span className="w-[18px] h-[18px] rounded-full bg-white/[0.08] border border-white/25 group-hover:border-white/55 transition-colors flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/75 group-hover:bg-white" />
                      </span>
                    </>
                  )}
                </div>

                {/* Horizontal Connector Tick from Node to Emblem */}
                <div
                  aria-hidden="true"
                  className={`h-[1px] transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'w-4 sm:w-5 bg-white/80'
                      : 'w-2.5 sm:w-3 bg-white/25 group-hover:bg-white/50'
                  }`}
                />

                {/* Storyline Icon from the game (`图标_曲谱_*.png`) */}
                <div
                  className={`shrink-0 flex items-center justify-center transition-all duration-300 mr-2 sm:mr-2.5 ${
                    isActive
                      ? 'w-9 h-9 sm:w-10 sm:h-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.35)]'
                      : 'w-7 h-7 sm:w-8 sm:h-8 opacity-55 group-hover:opacity-90'
                  }`}
                >
                  <img
                    src={storyline.icon}
                    alt={storyline.code}
                    draggable={false}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Storyline Title Block */}
                <div className="flex flex-col min-w-0">
                  <span
                    className={`text-[9px] sm:text-[10px] tracking-[0.08em] leading-tight transition-colors ${
                      isActive
                        ? 'text-white/90 font-semibold'
                        : 'text-white/45 group-hover:text-white/75'
                    }`}
                  >
                    {storyline.topLabel}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Barlow Condensed', 'Oswald', sans-serif",
                    }}
                    className={`uppercase tracking-[0.04em] leading-none mt-0.5 transition-all truncate ${
                      isActive
                        ? 'text-base sm:text-lg font-extrabold text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.35)]'
                        : 'text-sm sm:text-[15px] font-bold text-white/45 group-hover:text-white/80'
                    }`}
                  >
                    {storyline.mainTitle}
                  </span>
                  {isActive && (
                    <span className="mt-0.5 text-[9px] sm:text-[10px] tracking-[0.06em] leading-none truncate text-white/55">
                      {storyline.nativeTitle}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* HORIZONTAL SCROLLABLE TIMELINE STAGE */}
      <div
        ref={scrollContainerRef}
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        className="scrollbar-terminal relative w-screen h-screen overflow-x-auto overflow-y-hidden flex items-center"
      >
        <div className="relative flex items-center shrink-0 min-w-max h-full pl-[250px] sm:pl-[340px] pr-[140px] sm:pr-[220px] pt-10">
          {/* Glowing Horizontal Double-Line Track Beam running across the entire timeline */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[7px] pointer-events-none z-10"
          >
            {/* Outer soft white bloom */}
            <div className="
              absolute inset-x-0 -top-2 -bottom-2 bg-white/15 blur-[6px]"
            />
            {/* Upper glowing line */}
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-white/90 shadow-[0_0_8px_#ffffff]" />
            {/* Lower glowing line */}
            <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-white/85 shadow-[0_0_8px_#ffffff]" />
          </div>

          {/* Chapters & Branching Nodes along the Track */}
          <div className="relative z-20 flex items-center gap-12 sm:gap-16">
            {activeStoryline.chapters.map((chapter) => (
              <React.Fragment key={chapter.id}>
                {/* Optional Act Initium Header Block before EP 00 (matching image_183db089.png) */}
                {chapter.actHeader && (
                  <div className="relative flex items-center mr-2 sm:mr-4">
                    {/* Translucent gray vertical/horizontal banner above the track */}
                    <div className="relative -translate-y-24 sm:-translate-y-28 flex flex-col items-start">
                      <div className="bg-white/[0.12] backdrop-blur-xs border-l-2 border-white/50 px-3.5 py-2 shadow-lg">
                        <span className="font-serif text-xl sm:text-2xl tracking-wider text-white/95 font-normal">
                          <span className="text-3xl sm:text-4xl font-light mr-0.5">
                            A
                          </span>
                          ct initium
                        </span>
                      </div>
                      <span className="mt-1.5 text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] uppercase text-white/50">
                        {chapter.actHeader.actSubtitle}
                      </span>
                    </div>

                    {/* Large Dark-Red Chevron Accent behind the track start (matching image_183db089.png) */}
                    <svg
                      viewBox="0 0 120 200"
                      className="w-24 h-40 sm:w-28 sm:h-48 text-[#8c1d1d]/55 -ml-6 pointer-events-none shrink-0"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <polygon points="15,10 55,10 110,100 55,190 15,190 70,100" />
                    </svg>
                  </div>
                )}

                {/* CHAPTER BANNER CARD: either Square Framed (Main Story) or Oval Vignette (Story Line · RL / UR / LA) */}
                {chapter.bannerStyle === 'square' ? (
                  <button
                    type="button"
                    onClick={() => setSelectedChapter(chapter)}
                    className="group relative w-[250px] h-[250px] sm:w-[292px] sm:h-[292px] border-[2.5px] border-white/90 bg-[#101317] shadow-[0_16px_38px_rgba(0,0,0,0.88)] hover:border-white hover:shadow-[0_0_28px_rgba(255,255,255,0.35)] transition-all duration-300 overflow-hidden shrink-0 text-left cursor-pointer focus:outline-none"
                  >
                    {/* Chapter Artwork */}
                    <img
                      src={chapter.imageSrc}
                      alt={chapter.subtitle}
                      draggable={false}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Dark Atmospheric Gradient for crisp typography legibility */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/88"
                    />

                    {/* Upper-Center Story Line Crest (real in-game icon) */}
                    <div className="absolute inset-x-0 top-[8%] flex items-center justify-center pointer-events-none group-hover:scale-105 transition-transform duration-300">
                      <img
                        src={activeStoryline.icon}
                        alt=""
                        draggable={false}
                        className="w-24 h-24 object-contain opacity-90 drop-shadow-[0_0_18px_rgba(255,255,255,0.35)]"
                      />
                    </div>

                    {/* Lower Chapter Metadata: EP Badge + Telemetry Line + Bold Title + Location */}
                    <div className="absolute inset-x-4 bottom-3.5 flex flex-col items-center text-center pointer-events-none">
                      {/* EP Square Badge + Micro Telemetry Strip */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex flex-col items-center justify-center border border-white/90 px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-white bg-black/50">
                          <span>EP</span>
                          <span>{chapter.epNumber}</span>
                        </span>
                        <span className="text-[7px] tracking-[0.25em] uppercase text-white/60 font-mono">
                          /// RHODES ISLAND ARCHIVE
                        </span>
                      </div>

                      {/* Large Bold Chapter Title */}
                      <h3
                        style={{
                          fontFamily:
                            "'Barlow Condensed', 'Oswald', sans-serif",
                        }}
                        className="text-2xl sm:text-[28px] font-black tracking-[0.04em] uppercase text-white leading-[0.95] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                      >
                        {chapter.titleMain}
                      </h3>
                      {chapter.titlePartBadge && (
                        <span className="mt-0.5 text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase text-white/90">
                          {chapter.titlePartBadge}
                        </span>
                      )}

                      {/* Bottom Location Caption (matching ЧЕРНОБОГ & 0011 LUNGMEN, GREAT LUNGMEN) */}
                      <span className="mt-2 text-[9px] sm:text-[10px] font-bold tracking-[0.14em] uppercase text-white/75">
                        {chapter.locationLabel}
                      </span>
                    </div>
                  </button>
                ) : (
                  /* OVAL VIGNETTE BANNER (matching Story Line · RL in image_8f37d742.png) */
                  <button
                    type="button"
                    onClick={() => setSelectedChapter(chapter)}
                    className="group relative w-[300px] h-[235px] sm:w-[350px] sm:h-[270px] flex items-center justify-center shrink-0 cursor-pointer focus:outline-none"
                  >
                    {/* Soft-feathered elliptical artwork mask */}
                    <div
                      className="relative w-full h-full overflow-hidden rounded-[50%] shadow-[0_0_40px_rgba(0,0,0,0.9)]"
                      style={{
                        WebkitMaskImage:
                          'radial-gradient(ellipse 50% 48% at 50% 50%, #000 58%, rgba(0,0,0,0.6) 80%, transparent 100%)',
                        maskImage:
                          'radial-gradient(ellipse 50% 48% at 50% 50%, #000 58%, rgba(0,0,0,0.6) 80%, transparent 100%)',
                      }}
                    >
                      <img
                        src={chapter.imageSrc}
                        alt={chapter.subtitle}
                        draggable={false}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/75" />
                    </div>

                    {/* Stylized Title Overlay at bottom of the oval vignette */}
                    <div className="absolute inset-x-0 bottom-3 flex flex-col items-center text-center pointer-events-none">
                      <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/65 mb-0.5">
                        {chapter.locationLabel}
                      </span>
                      <h3
                        style={{
                          fontFamily: "'Cinzel', 'Georgia', serif",
                        }}
                        className="text-xl sm:text-2xl font-bold tracking-[0.08em] uppercase text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]"
                      >
                        {chapter.titleMain}
                      </h3>
                    </div>
                  </button>
                )}

                {/* OPTIONAL UPWARD BRANCHING NODE (matching DARKNIGHTS' MEMOIR in image_4287db23.png & EP 14 / WHEN ELEGIES ARE ASHES in image_8f37d742.png) */}
                {chapter.branchAfter && (
                  <div className="relative flex flex-col items-center justify-center w-[130px] sm:w-[155px] h-[320px] shrink-0">
                    {/* Vertical Glowing Double-Line Branch rising upward from the main track */}
                    <div
                      aria-hidden="true"
                      className="absolute bottom-1/2 top-[16%] w-[6px] pointer-events-none"
                    >
                      <div className="absolute inset-y-0 -left-1.5 -right-1.5 bg-white/15 blur-[4px]" />
                      <div className="absolute inset-y-0 left-0 w-[1.5px] bg-white/80 shadow-[0_0_8px_#fff]" />
                      <div className="absolute inset-y-0 right-0 w-[1.5px] bg-white/80 shadow-[0_0_8px_#fff]" />
                    </div>

                    {/* Interactive Upper Branch Node Button */}
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectStoryline(
                          chapter.branchAfter!.targetStorylineId
                        )
                      }
                      className="group relative -translate-y-24 sm:-translate-y-28 flex flex-col items-center text-center cursor-pointer focus:outline-none"
                    >
                      <span className="text-[10px] sm:text-[11px] font-semibold tracking-[0.08em] text-white/75 group-hover:text-white mb-1.5">
                        {chapter.branchAfter.topLabel}
                      </span>

                      {chapter.branchAfter.badgeText ? (
                        /* Diamond Badge Style (matching EP 14 in image_8f37d742.png) */
                        <div className="relative w-12 h-12 flex items-center justify-center mb-1.5">
                          <div className="w-9 h-9 rotate-45 border-2 border-white bg-[#14181f] group-hover:bg-white group-hover:text-black transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                            <span className="-rotate-45 text-[10px] font-black tracking-tighter leading-none">
                              {chapter.branchAfter.badgeText}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Triangle Prism Style (matching DARKNIGHTS' MEMOIR in image_4287db23.png) */
                        <svg
                          viewBox="0 0 64 56"
                          className="w-12 h-10 text-white/90 group-hover:scale-110 transition-transform drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] mb-1"
                          fill="currentColor"
                        >
                          <polygon points="32,4 60,52 4,52" />
                        </svg>
                      )}

                      <span
                        style={{
                          fontFamily: "'Cinzel', 'Georgia', serif",
                        }}
                        className="text-xs sm:text-sm font-bold tracking-[0.12em] uppercase text-white group-hover:text-white/90 max-w-[160px] leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
                      >
                        {chapter.branchAfter.title}
                      </span>
                    </button>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

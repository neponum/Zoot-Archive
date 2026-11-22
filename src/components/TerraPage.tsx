import React from 'react';
import { useNavigate } from 'react-router-dom';
import { wrapUrlWithProxy } from '../services/story/storyAssetService';
import { getUiLanguage } from '../utils/uiLanguage';

/**
 * Раздел «Терра» ещё не готов: белый экран, Кальцит крупным планом
 * (кадр по пояс) и реплика у её лица — сухо, по делу и с лёгким упрёком.
 * Арт берётся с torappu, как и остальные портреты на сайте.
 */
const KALTSIT_ART = 'https://torappu.prts.wiki/assets/char_arts/char_003_kalts_1.png';

export const TerraPage: React.FC = () => {
  const navigate = useNavigate();
  const uiLang = getUiLanguage();
  const isRu = uiLang === 'ru_RU' || uiLang === 'ru_RU_CN';

  const goBack = () => {
    const idx =
      typeof window !== 'undefined' && typeof window.history.state?.idx === 'number'
        ? window.history.state.idx
        : 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-white text-[#141414]">
      {/* Навигация как на остальных внутренних страницах: назад + домой */}
      <div className="fixed top-2.5 left-3 z-50 flex items-center bg-[#2b2d30]/90 shadow-[0_6px_18px_rgba(0,0,0,0.42)]">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="w-[88px] sm:w-[104px] h-[38px] sm:h-[42px] flex items-center pl-4 border-r border-white/15 text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className="w-6 h-6"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Home"
          title="Home"
          className="px-3.5 h-[38px] sm:h-[42px] flex items-center justify-center text-white/85 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </button>
      </div>

      <main className="relative h-full w-full overflow-hidden">
        {/* Кальцит: кадр от головы до пояса. Картинка 2048×2048 с полями,
            поэтому масштабируем её выше контейнера и обрезаем по низу. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[56vh] overflow-hidden md:inset-y-0 md:left-auto md:right-[-3%] md:h-full md:w-[58%]">
          <img
            src={wrapUrlWithProxy(KALTSIT_ART)}
            alt={isRu ? 'Кальцит' : "Kal'tsit"}
            referrerPolicy="no-referrer"
            draggable={false}
            className="absolute top-0 left-1/2 h-[260%] w-auto max-w-none -translate-x-1/2 select-none md:h-[240%]"
          />
        </div>

        {/* Реплика — у лица: на десктопе слева от головы, на мобильном сверху. */}
        <div className="relative z-10 w-full px-5 pt-16 md:absolute md:top-[19vh] md:right-[50%] md:w-[clamp(340px,30vw,440px)] md:px-0 md:pt-0">
          <div className="relative border-2 border-[#141414] bg-white px-5 py-5 shadow-[10px_10px_0_rgba(20,20,20,0.08)] sm:px-6 sm:py-6">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-black/45">
              {isRu ? 'Кальцит' : "Kal'tsit"}
            </div>
            <p className="text-[15px] leading-relaxed sm:text-[17px]">
              {isRu
                ? 'Доктор. Этот раздел ещё в разработке. Карта Терры, хронология и досье регионов появятся позже.'
                : 'Doctor. This section is still under construction. The Terra map, timeline and region dossiers will appear here later.'}
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-black/65 sm:text-[17px]">
              {isRu
                ? 'Обновлять страницу каждый день бессмысленно — я сообщу, когда будет готово.'
                : 'Refreshing the page every day is pointless — I will let you know when it is ready.'}
            </p>

            {/* Хвостик: снизу к голове на мобильном, справа к лицу на десктопе */}
            <span
              aria-hidden="true"
              className="absolute -bottom-[10px] left-[52%] h-4 w-4 rotate-45 border-r-2 border-b-2 border-[#141414] bg-white md:hidden"
            />
            <span
              aria-hidden="true"
              className="absolute top-[42%] -right-[10px] hidden h-4 w-4 rotate-45 border-t-2 border-r-2 border-[#141414] bg-white md:block"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

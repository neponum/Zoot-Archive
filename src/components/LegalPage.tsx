import React, { useEffect, useRef } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { LEGAL_CONFIG } from '../config/legal';
import { StageHeader } from './StageHeader';
import { StageFooter } from './StageFooter';
import { useStageLanguage } from '../hooks/useStageLanguage';
import { STAGE_COPY, type StageNavId } from '../config/stageCopy';

export type LegalDoc = 'disclaimer' | 'privacy' | 'takedown';

interface LegalPageProps {
  doc: LegalDoc;
}

interface DocMeta {
  label: string;
  title: string;
  subtitle: string;
}

const DOC_META: Record<LegalDoc, DocMeta> = {
  disclaimer: {
    label: '// О ПРОЕКТЕ',
    title: 'О нас',
    subtitle: 'Неофициальный некоммерческий фан-архив',
  },
  privacy: {
    label: '// КОНФИДЕНЦИАЛЬНОСТЬ',
    title: 'Политика конфиденциальности',
    subtitle: 'Какие данные собираются и что с ними происходит',
  },
  takedown: {
    label: '// ПРАВООБЛАДАТЕЛЯМ',
    title: 'Запрос на удаление',
    subtitle: 'Порядок обращения и сроки реакции',
  },
};

const DOC_ORDER: LegalDoc[] = ['disclaimer', 'privacy', 'takedown'];

/** Заголовок раздела с нумерацией — чтобы длинный текст читался по диагонали. */
const Section: React.FC<{ index: number; title: string; children: React.ReactNode }> = ({
  index,
  title,
  children,
}) => (
  <section className="border-t border-white/5 pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
    <h2 className="flex items-baseline gap-3 text-[11px] md:text-xs font-black uppercase tracking-[0.18em] text-white/90 mb-3">
      <span className="font-mono text-white/25 tabular-nums">
        {String(index).padStart(2, '0')}
      </span>
      {title}
    </h2>
    <div className="space-y-3 text-[13px] md:text-sm leading-relaxed text-white/55 font-light">
      {children}
    </div>
  </section>
);

const List: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="space-y-1.5 pl-0">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2.5">
        <span className="text-white/25 font-mono shrink-0 select-none">—</span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const OutLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-white/80 hover:text-white underline decoration-white/20 hover:decoration-white/60 underline-offset-2 transition-colors"
  >
    {children}
  </a>
);

const DisclaimerContent: React.FC = () => (
  <>
    <Section index={1} title="Статус проекта">
      <p>
        {LEGAL_CONFIG.projectName} — некоммерческий фан-проект, который ведёт сообщество
        переводчиков. Сайт не является официальным ресурсом Arknights, не связан с
        Hypergryph Co., Ltd., Yostar, Monster Siren Records или Studio Montagne, не
        спонсируется и не одобряется ими. Мы не выдаём себя за официальный источник и не
        претендуем на его место.
      </p>
    </Section>

    <Section index={2} title="Права на материалы">
      <p>
        Arknights, персонажи, сюжет, диалоги, графика, музыка и озвучка принадлежат
        Hypergryph Co., Ltd. и Yostar, а также их лицензиарам. Мы не заявляем прав на
        оригинальные материалы и не используем их для извлечения прибыли.
      </p>
      <p>
        Русские переводы сюжета, досье и интерфейса подготовлены участниками сообщества на
        добровольной основе. Это производные тексты: права на исходные произведения
        остаются у правообладателей.
      </p>
    </Section>

    <Section index={3} title="Что мы делаем и чего не делаем">
      <List
        items={[
          'переводим и систематизируем тексты, чтобы по ним было удобно читать сюжет;',
          'не берём плату за доступ, не показываем рекламу и не продаём данные;',
          'не храним у себя аудиофайлы, сканы артбуков и другие полные копии материалов: сайт только ссылается на внешние источники;',
          'музыкальный раздел закрыт: аудио не раздаётся, а голосовые дорожки сюжета воспроизводятся потоком со сторонних зеркал игровых ассетов.',
        ]}
      />
      <p>Контент сайт не хранит — он подгружается с внешних сервисов:</p>
      <List
        items={[
          <>
            <OutLink href="https://torappu.prts.wiki">torappu.prts.wiki</OutLink> — стороннее
            зеркало игровых ассетов: фоны, спрайты, музыка, озвучка. Не официальный ресурс
            правообладателя;
          </>,
          <>
            <OutLink href="https://github.com/neponum/zoot-data">raw.githubusercontent.com</OutLink>{' '}
            и <OutLink href="https://www.jsdelivr.com">cdn.jsdelivr.net</OutLink> — наши
            переводы, эффекты и таблицы игровых данных из открытых репозиториев;
          </>,
          'публичные зеркала и наши страницы на SKPORT — фон главного экрана и обложки статей.',
        ]}
      />
    </Section>

    <Section index={4} title="Пожертвования">
      <p>
        Проект может принимать добровольные пожертвования на оплату домена и хостинга.
        Пожертвования не открывают доступ к закрытым материалам, не являются оплатой услуг и
        не влияют на содержание сайта.
      </p>
    </Section>

    <Section index={5} title="Точность перевода">
      <p>
        Переводы делают люди, поэтому в них возможны ошибки, опечатки и неточности. Мы
        правим их по мере сил, но единственным достоверным источником остаётся оригинальная
        игра и официальные публикации.
      </p>
    </Section>

    <Section index={6} title="Обращения правообладателей">
      <p>
        Любой материал мы убираем по первому обоснованному обращению на{' '}
        <OutLink href={`mailto:${LEGAL_CONFIG.email}`}>{LEGAL_CONFIG.email}</OutLink>. Порядок
        и сроки описаны на странице{' '}
        <RouterLink
          to="/takedown"
          className="text-white/80 hover:text-white underline decoration-white/20 underline-offset-2 transition-colors"
        >
          «Правообладателям»
        </RouterLink>
        .
      </p>
    </Section>

    <Section index={7} title="Изменения">
      <p>
        Проект развивается: мы можем менять структуру, добавлять разделы и обновлять эти
        тексты. Актуальная версия документа всегда находится на этой странице.
      </p>
    </Section>
  </>
);

const PrivacyContent: React.FC = () => (
  <>
    <Section index={1} title="Коротко">
      <p>
        На сайте нет аккаунтов, рекламы, сторонних трекеров и продажи данных, и мы не строим
        профилей пользователей. Обрабатываются только технические данные: IP-адрес в логах
        хостинга и в ограничителе частоты запросов, а также то, что вы отправите сами через
        форму отчёта.
      </p>
    </Section>

    <Section index={2} title="Что остаётся в вашем браузере">
      <p>
        Прогресс чтения, закладки, настройки интерфейса, состояние экранов, черновики переводов
        и кэш скачанных ассетов и таблиц хранятся в localStorage, IndexedDB и Cache Storage на
        вашем устройстве. Мы к этим данным доступа не имеем; если очистить данные сайта в
        браузере, они удалятся безвозвратно.
      </p>
    </Section>

    <Section index={3} title="Файлы cookie">
      <p>
        Сайт не ставит cookie: ни рекламных, ни аналитических, ни сессионных. Всё, что нужно
        для работы, лежит в локальном хранилище браузера и на сервер не отправляется.
      </p>
    </Section>

    <Section index={4} title="Отчёты об ошибках">
      <p>
        Форма «Сообщить об ошибке» работает анонимно. На сервер уходят текст отчёта (до 2000
        знаков), тип проблемы и контекст сцены: глава, номер строки, до 30 последних реплик и
        имя переводчика — чтобы упомянуть его в Discord. Отчёт пересылается в закрытый канал
        команды и хранится там до разбора и закрытия обращения. Пожалуйста, не указывайте в
        отчёте личные данные: для разбора ошибки они не нужны.
      </p>
    </Section>

    <Section index={5} title="Ограничение частоты запросов">
      <p>
        Чтобы формы не превратились в спам-канал, сервер считает запросы с одного IP-адреса: не
        больше 5 отчётов за 10 минут. IP используется только в памяти процесса для этой
        проверки, не записывается в базу и не связывается с содержанием отчётов.
      </p>
    </Section>

    <Section index={6} title="Аналитика и хостинг">
      <p>
        Сайт размещён на Vercel и использует Vercel Analytics и Speed Insights: обезличенные
        агрегированные метрики (страна, тип устройства, скорость загрузки). Они не ставят
        cookie и не позволяют идентифицировать человека. Хостинг обрабатывает IP-адрес и
        заголовки запросов в технических логах для защиты от атак; профили на их основе мы не
        строим, а срок хранения логов определяется правилами Vercel.
      </p>
    </Section>

    <Section index={7} title="Сторонние сервисы">
      <p>
        Картинки, звук и таблицы данных сайт запрашивает напрямую из вашего браузера — эти
        сервисы видят ваш IP так же, как при обычном визите на их сайт. Если источник
        недоступен, часть запросов идёт через наш прокси на Vercel: тогда запрос делает
        сервер, а не браузер. Перечень сервисов — в разделе «Что мы делаем и чего не делаем»
        на странице{' '}
        <RouterLink
          to="/disclaimer"
          className="text-white/80 hover:text-white underline decoration-white/20 underline-offset-2 transition-colors"
        >
          «О нас»
        </RouterLink>
        .
      </p>
    </Section>

    <Section index={8} title="Удаление данных и изменения">
      <p>
        Профиля, к которому можно привязать запрос, у нас нет. Удалить можно только то, что вы
        отправили сами: если в тексте отчёта остались ваши данные, напишите в Discord или
        создайте обращение в GitHub Issues — мы удалим их в течение 30 дней. Права
        предоставляются в объёме, предусмотренном применимым законодательством, включая Закон
        Республики Беларусь № 99-З и, для резидентов ЕС, GDPR.
      </p>
      <p>
        При существенных изменениях политики мы обновляем её текст на этой странице:
        актуальная редакция всегда здесь.
      </p>
    </Section>
  </>
);

const TakedownContent: React.FC = () => (
  <>
    <Section index={1} title="Позиция">
      <p>
        Мы уважаем интеллектуальную собственность и не пытаемся конкурировать с
        правообладателями. Проект некоммерческий, и любой материал мы убираем по
        обоснованному запросу — без споров и встречных условий.
      </p>
    </Section>

    <Section index={2} title="Как отправить запрос">
      <p>
        Напишите на{' '}
        <OutLink href={`mailto:${LEGAL_CONFIG.email}`}>{LEGAL_CONFIG.email}</OutLink>, в{' '}
        <OutLink href={LEGAL_CONFIG.discordInvite}>Discord</OutLink> или создайте обращение
        в <OutLink href={LEGAL_CONFIG.repositoryIssues}>GitHub Issues</OutLink> с пометкой
        «Takedown». В обращении укажите:
      </p>
      <List
        items={[
          'произведение, права на которое нарушены, и вашу роль (правообладатель, представитель, агент);',
          'точные URL страниц сайта;',
          'что именно, по вашему мнению, нарушает права;',
          'способ связи для ответа;',
          'желаемое действие: удалить, заменить ссылкой на официальный источник, ограничить доступ.',
        ]}
      />
      <p>
        Обращение должно исходить от правообладателя или уполномоченного лица — подтвердите
        свою роль, чтобы мы могли действовать без лишних уточнений.
      </p>
    </Section>

    <Section index={3} title="Сроки">
      <p>
        Подтверждаем получение в течение 3 рабочих дней. Материал удаляем или заменяем
        ссылкой на официальный источник в течение 72 часов с момента подтверждения запроса.
      </p>
    </Section>

    <Section index={4} title="Если мы не согласны">
      <p>
        Если материал используется правомерно — например, это короткая цитата, обзор или
        некоммерческий перевод, — мы ответим с обоснованием и предложим компромисс. Мы не
        игнорируем обращения и не переносим спор в публичную плоскость.
      </p>
    </Section>

    <Section index={5} title="Если ответа нет">
      <p>
        Продублируйте обращение во втором канале: в{' '}
        <OutLink href={LEGAL_CONFIG.repositoryIssues}>GitHub Issues</OutLink>, если писали в
        Discord, или в <OutLink href={LEGAL_CONFIG.discordInvite}>Discord</OutLink>, если
        создавали issue. Так обращение не потеряется. Запросы по правам имеют приоритет над
        остальными.
      </p>
    </Section>

    <Section index={6} title="Просьба">
      <p>
        Пожалуйста, начните с письма, а не с жалобы хостингу: удаление занимает часы, а не
        недели, и у нас нет цели обходить требования правообладателя.
      </p>
    </Section>
  </>
);

const CONTENT: Record<LegalDoc, React.ReactNode> = {
  disclaimer: <DisclaimerContent />,
  privacy: <PrivacyContent />,
  takedown: <TakedownContent />,
};

const DOC_LINK_KEY: Record<LegalDoc, 'about' | 'privacy' | 'takedown'> = {
  disclaimer: 'about',
  privacy: 'privacy',
  takedown: 'takedown',
};

export const LegalPage: React.FC<LegalPageProps> = ({ doc }) => {
  const navigate = useNavigate();
  const { locale, setLocale } = useStageLanguage();
  const copy = STAGE_COPY[locale];

  const meta = DOC_META[doc];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Открываем документ с начала, даже если пришли с середины другой страницы.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [doc]);

  // Шапка общая с главной: у каждого пункта теперь свой адрес.
  const handleNavSelect = (id: StageNavId) => {
    const routes: Partial<Record<StageNavId, string>> = {
      operator: '/operators',
      terminal: '/terminal',
      terra: '/terra',
      translation: '/translate',
    };
    navigate(routes[id] ?? '/');
  };

  return (
    <div
      ref={scrollRef}
      className="relative w-full h-full overflow-y-auto custom-scrollbar bg-[#060608] text-white select-text"
    >
      {/* Затемнение под шапкой: на длинном тексте навигация иначе сливается с абзацами.
          Плотное до нижней кромки эмблемы, дальше плавно растворяется. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-20 h-40"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, #060608 0%, #060608 55%, rgba(6,6,8,0) 100%)',
        }}
      />

      <StageHeader
        locale={locale}
        theme="dark"
        onNavSelect={handleNavSelect}
        onEmblemClick={() => navigate('/')}
      />

      {/* Тот же мягкий свет по центру, что на главной: чёрный не должен быть плоским */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(46,50,58,0.45),transparent_65%)]"
      />

      <div className="relative mx-auto w-full max-w-3xl px-5 md:px-8 pt-40 sm:pt-32 md:pt-36 pb-10 md:pb-14">
        <header className="mb-2 text-center">
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white leading-tight">
            {meta.title}
          </h1>
          <p className="mt-2 text-[11px] md:text-xs uppercase tracking-[0.15em] text-white/35 font-bold">
            {meta.subtitle}
          </p>
          <p className="mt-4 text-[9px] font-mono uppercase tracking-[0.2em] text-white/25">
            Обновлено: {LEGAL_CONFIG.updatedAt}
          </p>
        </header>

        {/* Тексты документов — русские: это правовая формулировка, её не переводим
            машинно. Атрибут lang держит скринридеры и переносы в порядке. */}
        <article
          lang="ru"
          className="mt-8 border border-white/10 bg-white/[0.02] px-4 py-5 md:px-7 md:py-6"
        >
          {CONTENT[doc]}
        </article>

        {/* Навигация между документами — те же текстовые ссылки, что в подвале */}
        <nav aria-label="Документы" className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          {DOC_ORDER.filter((d) => d !== doc).map((d) => (
            <RouterLink
              key={d}
              to={`/${d}`}
              className="text-[10px] font-medium tracking-widest uppercase text-neutral-500 hover:text-white transition-colors cursor-pointer"
            >
              {copy.legal[DOC_LINK_KEY[d]]}
            </RouterLink>
          ))}
        </nav>

        <StageFooter
          locale={locale}
          onLocaleChange={setLocale}
          className="mt-10 border-t border-white/5 pt-8"
        />
      </div>
    </div>
  );
};

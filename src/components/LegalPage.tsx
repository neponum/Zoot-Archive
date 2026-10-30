import React, { useEffect, useRef } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Gavel,
  Github,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { DiscordIcon } from './ui/Icons';
import { LEGAL_CONFIG } from '../config/legal';

export type LegalDoc = 'disclaimer' | 'privacy' | 'takedown';

interface LegalPageProps {
  doc: LegalDoc;
}

interface DocMeta {
  label: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const DOC_META: Record<LegalDoc, DocMeta> = {
  disclaimer: {
    label: '// О ПРОЕКТЕ',
    title: 'Дисклеймер',
    subtitle: 'Неофициальный некоммерческий фан-архив',
    icon: <Scale className="w-4 h-4" />,
  },
  privacy: {
    label: '// КОНФИДЕНЦИАЛЬНОСТЬ',
    title: 'Политика конфиденциальности',
    subtitle: 'Какие данные собираются и что с ними происходит',
    icon: <ShieldCheck className="w-4 h-4" />,
  },
  takedown: {
    label: '// ПРАВООБЛАДАТЕЛЯМ',
    title: 'Запрос на удаление',
    subtitle: 'Порядок обращения и сроки реакции',
    icon: <Gavel className="w-4 h-4" />,
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
      <span className="font-mono text-[#BFFF00]/70 tabular-nums">
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
        <span className="text-[#BFFF00]/40 font-mono shrink-0 select-none">—</span>
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
    className="text-[#BFFF00]/80 hover:text-[#BFFF00] underline decoration-[#BFFF00]/25 hover:decoration-[#BFFF00]/60 underline-offset-2 transition-colors"
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
          'не размещаем на своих серверах аудиофайлы, сканы артбуков и другие полные копии материалов;',
          'музыкальный раздел закрыт: мы не размещаем и не раздаём аудио, а голосовые дорожки сюжета могут воспроизводиться потоком с официальных серверов правообладателя (torappu.prts.wiki).',
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
        Любой материал мы убираем по первому обоснованному обращению. Порядок и сроки
        описаны на странице{' '}
        <RouterLink
          to="/takedown"
          className="text-[#BFFF00]/80 hover:text-[#BFFF00] underline decoration-[#BFFF00]/25 underline-offset-2 transition-colors"
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
        На сайте нет аккаунтов, рекламы, сторонних трекеров и продажи данных. Мы сознательно
        не собираем персональные данные: всё, что можно сохранить локально, сохраняется в
        вашем браузере и на сервер не отправляется.
      </p>
    </Section>

    <Section index={2} title="Что хранится только у вас">
      <p>
        Прогресс чтения, закладки, настройки интерфейса и черновики переводов сохраняются в
        localStorage и IndexedDB на вашем устройстве. Мы к этим данным доступа не имеем. Если
        очистить данные сайта в браузере, они удалятся безвозвратно.
      </p>
    </Section>

    <Section index={3} title="Файлы cookie">
      <p>
        Сайт не устанавливает рекламных и аналитических cookie и не использует серверные
        сессии. В браузере хранятся только технические настройки: выбранный язык интерфейса,
        режим отображения и локальные профили переводчика. Их можно удалить в любой момент
        через настройки браузера.
      </p>
    </Section>

    <Section index={4} title="Вход и аккаунты">
      <p>
        Регистрации и входа через сторонние сервисы нет. Мы не запрашиваем имя, почту,
        телефон, Discord ID, аватар или геолокацию. Всё, что вы делаете в архиве, не
        привязано к личности.
      </p>
    </Section>

    <Section index={5} title="Отчёты об ошибках">
      <p>
        Форма «Сообщить об ошибке» работает анонимно. На сервер уходят только текст отчёта,
        тип проблемы и технический контекст сцены (глава, номер строки, несколько последних
        реплик). Эти данные пересылаются в закрытый канал команды в Discord. Пожалуйста, не
        указывайте в отчёте личные данные — для разбора ошибки они не нужны.
      </p>
    </Section>

    <Section index={6} title="Ограничение частоты запросов">
      <p>
        Чтобы защитить формы и API от спама, сервер считает количество запросов с одного
        IP-адреса за короткий промежуток времени. IP обрабатывается только в оперативной
        памяти для этой проверки, не записывается в базу и не связывается с содержанием
        отчётов.
      </p>
    </Section>

    <Section index={7} title="Аналитика">
      <p>
        Используются Vercel Analytics и Speed Insights: обезличенные агрегированные метрики
        (страна, тип устройства, скорость загрузки). Они не ставят cookie для отслеживания и
        не позволяют идентифицировать конкретного человека.
      </p>
    </Section>

    <Section index={8} title="Инфраструктура и логи">
      <p>
        Сайт размещён на Vercel. Хостинг обрабатывает IP-адрес и заголовки запроса в
        технических логах для защиты от атак; мы не строим на их основе профили. Запросы к
        сторонним CDN (изображения, шрифты) идут напрямую из вашего браузера — эти сервисы
        видят ваш IP так же, как при обычном визите на их сайт.
      </p>
    </Section>

    <Section index={9} title="Кто ещё обрабатывает данные">
      <p>
        Обработчики: Vercel (хостинг, аналитика, журналы запросов), Discord (приём анонимных
        отчётов через вебхук) и Google (генерация переводов, если вы пользуетесь ИИ-помощником).
        Обработка может происходить за пределами страны вашего проживания. Мы не продаём
        данные и не передаём их в иных целях.
      </p>
    </Section>

    <Section index={10} title="Сроки хранения">
      <List
        items={[
          'локальные данные — пока вы сами не очистите их в браузере;',
          'анонимные отчёты — в канале команды, до разбора и закрытия обращения;',
          'логи хостинга — по правилам Vercel.',
        ]}
      />
    </Section>

    <Section index={11} title="Ваши права">
      <p>
        Поскольку мы не собираем персональные данные, у нас нет профиля, к которому можно
        привязать запрос. Если вы считаете, что в отчёте или переписке остались ваши данные,
        напишите модераторам в Discord или создайте обращение в GitHub Issues — мы удалим их в течение 30 дней.
      </p>
      <p>
        Права предоставляются в объёме, предусмотренном применимым законодательством,
        включая Закон Республики Беларусь № 99-З «О защите персональных данных» и, для
        резидентов ЕС, GDPR.
      </p>
    </Section>

    <Section index={12} title="Дети">
      <p>
        Сайт не предназначен для детей младше 16 лет, и мы сознательно не собираем их
        данные.
      </p>
    </Section>

    <Section index={13} title="Изменения">
      <p>
        При существенных изменениях мы обновим дату в шапке этой страницы. Продолжая
        пользоваться сайтом после обновления, вы принимаете новую редакцию.
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
        Напишите модераторам в <OutLink href={LEGAL_CONFIG.discordInvite}>Discord</OutLink>{' '}
        или создайте обращение в{' '}
        <OutLink href={LEGAL_CONFIG.repositoryIssues}>GitHub Issues</OutLink> с пометкой
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

    <Section index={4} title="Что удаляем сразу">
      <List
        items={[
          'аудиофайлы и полные копии треков;',
          'сканы артбуков и полные галереи официального арта;',
          'датамайн и материалы, не опубликованные официально.',
        ]}
      />
    </Section>

    <Section index={5} title="Если мы не согласны">
      <p>
        Если материал используется правомерно — например, это короткая цитата, обзор или
        некоммерческий перевод, — мы ответим с обоснованием и предложим компромисс. Мы не
        игнорируем обращения и не переносим спор в публичную плоскость.
      </p>
    </Section>

    <Section index={6} title="Если ответа нет">
      <p>
        Продублируйте обращение во втором канале: в{' '}
        <OutLink href={LEGAL_CONFIG.repositoryIssues}>GitHub Issues</OutLink>, если писали в
        Discord, или в <OutLink href={LEGAL_CONFIG.discordInvite}>Discord</OutLink>, если
        создавали issue. Так обращение не потеряется. Запросы по правам имеют приоритет над
        остальными.
      </p>
    </Section>

    <Section index={7} title="Просьба">
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

export const LegalPage: React.FC<LegalPageProps> = ({ doc }) => {
  const navigate = useNavigate();
  const meta = DOC_META[doc];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Открываем документ с начала, даже если пришли с середины другой страницы.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [doc]);

  return (
    <div ref={scrollRef} className="w-full h-full overflow-y-auto custom-scrollbar bg-black text-white/70 select-text">
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-14">
        <button
          onClick={() => navigate('/')}
          className="group flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors cursor-pointer mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          На главную
        </button>

        <header className="mb-2">
          <div className="flex items-center gap-2 text-[#BFFF00]/80 mb-3">
            {meta.icon}
            <span className="text-[9px] font-black uppercase tracking-[0.25em] font-mono">
              {meta.label}
            </span>
          </div>
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

        <div className="mt-8 border border-white/5 bg-zinc-950/40 rounded-sm px-4 py-5 md:px-7 md:py-6">
          {CONTENT[doc]}
        </div>

        {/* Навигация между документами */}
        <nav className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DOC_ORDER.filter((d) => d !== doc).map((d) => (
            <a
              key={d}
              href={`/${d}`}
              className="flex items-center justify-between gap-2 px-3 py-2.5 border border-white/5 bg-zinc-950/60 hover:border-white/20 hover:bg-white/[0.03] rounded-sm transition-all group"
            >
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/50 group-hover:text-white/80 transition-colors">
                {DOC_META[d].title}
              </span>
              <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />
            </a>
          ))}
        </nav>

        <footer className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-[9px] leading-relaxed uppercase tracking-[0.12em] text-white/25 max-w-md">
            {LEGAL_CONFIG.projectName} — неофициальный фан-проект. Права на Arknights
            принадлежат Hypergryph Co., Ltd. и Yostar.
          </p>
          <div className="flex items-center gap-2">
            <a
              href={LEGAL_CONFIG.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 flex items-center justify-center border border-white/5 hover:border-[#5865F2]/40 rounded-sm text-white/30 hover:text-[#5865F2] transition-colors"
              title="Discord"
            >
              <DiscordIcon size={14} />
            </a>
            <a
              href={LEGAL_CONFIG.repositoryIssues}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 w-8 flex items-center justify-center border border-white/5 hover:border-white/25 rounded-sm text-white/30 hover:text-white transition-colors"
              title="GitHub Issues"
            >
              <Github className="w-3.5 h-3.5" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OperatorArchiveView, type OperatorRecord } from './OperatorArchiveView';
import {
  buildOperatorIndex,
  loadOperatorDetail,
  type DossierLang,
} from '../services/operatorArchiveService';
import { useStageLanguage } from '../hooks/useStageLanguage';

interface OperatorArchivePageProps {
  initialOperatorId?: string | null;
}

const MAX_ATTEMPTS = 2;

/**
 * Экран архива оперативников.
 *
 * Каталог собирается мгновенно из `operators_database.json`, а досье,
 * реплики и скины скачиваются в браузер только при открытии оперативника:
 * таблицы игры (`handbook_info_table`, `charword_table`, `skin_table`) берутся
 * с jsDelivr для выбранного языка и кэшируются в Cache Storage на 7 дней.
 * Русские досье дополнительно подмешиваются из community-переводов.
 */
export const OperatorArchivePage: React.FC<OperatorArchivePageProps> = ({
  initialOperatorId = null,
}) => {
  const navigate = useNavigate();
  const { locale } = useStageLanguage();
  const [operators, setOperators] = useState<OperatorRecord[]>(() => buildOperatorIndex());

  /**
   * В адресе может быть id (`char_002_amiya`), кодовое имя (`Amiya`)
   * или русское имя — приводим к каноническому id каталога.
   */
  const resolvedInitialId = useMemo(() => {
    if (!initialOperatorId) return null;
    let raw = initialOperatorId;
    try {
      raw = decodeURIComponent(initialOperatorId);
    } catch {
      // оставляем как есть
    }
    const needle = raw.trim().toLowerCase();
    if (!needle) return null;
    const byId = operators.find((op) => op.id.toLowerCase() === needle);
    if (byId) return byId.id;
    const byName = operators.find(
      (op) =>
        op.codename?.toLowerCase() === needle ||
        op.name?.toLowerCase() === needle
    );
    return byName?.id ?? raw;
  }, [initialOperatorId, operators]);
  const [dossierLang, setDossierLang] = useState<DossierLang>(() =>
    locale === 'ru' ? 'ru' : 'en'
  );
  const [detailLoading, setDetailLoading] = useState(false);
  // Запросы в полёте: дедуплицируем одинаковые (`язык + оперативник`), но не
  // блокируем повторное открытие — оно берёт таблицы из памяти/кэша браузера.
  const inflight = useRef(new Set<string>());
  // Последний запрос по оперативнику: ответы на устаревшие языки игнорируются.
  const latestRequest = useRef(new Map<string, number>());
  const requestSeq = useRef(0);

  const handleRequestOperator = useCallback(
    (operatorId: string, requestedLang: DossierLang = dossierLang) => {
      const key = `${requestedLang}:${operatorId}`;
      if (inflight.current.has(key)) return;
      const base = operators.find((op) => op.id === operatorId);
      if (!base) return;
      const seq = ++requestSeq.current;
      latestRequest.current.set(operatorId, seq);
      inflight.current.add(key);
      setDetailLoading(true);

      const attempt = (triesLeft: number) => {
        loadOperatorDetail(base, requestedLang)
          .then(({ operator }) => {
            if (latestRequest.current.get(operatorId) !== seq) return;
            setOperators((prev) => prev.map((op) => (op.id === operator.id ? operator : op)));
            setDetailLoading(false);
          })
          .catch((error) => {
            // Один повтор на случай обрыва сети: таблицы кэшируются в браузере.
            if (triesLeft > 1) {
              setTimeout(() => attempt(triesLeft - 1), 1500);
              return;
            }
            console.warn(`Не удалось загрузить досье ${operatorId}`, error);
            if (latestRequest.current.get(operatorId) === seq) {
              setDetailLoading(false);
            }
          })
          .finally(() => {
            inflight.current.delete(key);
          });
      };

      attempt(MAX_ATTEMPTS);
    },
    [operators, dossierLang]
  );

  const view = useMemo(
    () => (
      <OperatorArchiveView
        operators={operators}
        initialOperatorId={resolvedInitialId}
        onBackToHome={() => navigate('/')}
        onRequestOperator={handleRequestOperator}
        locale={locale}
        dossierLanguage={dossierLang}
        onDossierLanguageChange={setDossierLang}
        detailLoading={detailLoading}
      />
    ),
    [
      operators,
      resolvedInitialId,
      handleRequestOperator,
      navigate,
      dossierLang,
      detailLoading,
    ]
  );

  return view;
};

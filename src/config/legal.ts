/**
 * Единая точка правды для юридических страниц.
 *
 * Меняешь контакт или дату — меняется сразу в дисклеймере, политике и
 * на странице для правообладателей. Ничего не хардкодим по компонентам.
 */
export const LEGAL_CONFIG = {
  projectName: 'ZOOT Archive',
  /**
   * TODO: заменить на реальный ящик после подключения почты к домену.
   * Пока домен не куплен, этот адрес не принимает письма — в текстах
   * рядом всегда указаны рабочие альтернативы (Discord и GitHub Issues).
   */
  contactEmail: 'contact@zoot-archive.monster',
  discordInvite: 'https://discord.gg/jYvWPeCjC3',
  repository: 'https://github.com/neponum/zoot-archive',
  repositoryIssues: 'https://github.com/neponum/zoot-archive/issues',
  officialGlobal: 'https://www.arknights.global',
  officialMonsterSiren: 'https://monster-siren.hypergryph.com',
  updatedAt: '30 октября 2026 г.',
} as const;

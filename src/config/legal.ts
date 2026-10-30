/**
 * Единая точка правды для юридических страниц.
 *
 * Меняешь контакт или дату — меняется сразу в дисклеймере, политике и
 * на странице для правообладателей. Ничего не хардкодим по компонентам.
 */
export const LEGAL_CONFIG = {
  projectName: 'ZOOT Archive',
  /**
   * Почтового ящика пока нет: домен будет rhodes.monster, но почту ещё не
   * подключили. Все обращения идут через Discord и GitHub Issues — не
   * добавляйте сюда адрес, который не принимает письма.
   */
  discordInvite: 'https://discord.gg/jYvWPeCjC3',
  repository: 'https://github.com/neponum/zoot-archive',
  repositoryIssues: 'https://github.com/neponum/zoot-archive/issues',
  officialGlobal: 'https://www.arknights.global',
  officialMonsterSiren: 'https://monster-siren.hypergryph.com',
  updatedAt: '30 октября 2026 г.',
} as const;

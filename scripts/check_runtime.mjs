#!/usr/bin/env node
/**
 * Проверка рантайма: версия Node.js и доверенные корни.
 *
 * 1. Версия Node. 21 октября 2026 вышел релиз безопасности
 *    (https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
 *    с HIGH-уязвимостями в ветках 26.x / 24.x / 22.x:
 *      CVE-2026-105483 / CVE-2026-106069 / CVE-2026-106072 — обход проверки
 *        имени хоста в TLS (влияет на наш /api/proxy и на SSRF-фильтр);
 *      CVE-2026-111497 — запись за пределы буфера в Brotli-декодере (RCE);
 *      CVE-2026-105482 — dns.resolve обрезает имена с NUL;
 *      CVE-2026-105481 — keep-alive обрабатывает «чужой» ответ;
 *      CVE-2026-106074 — кэш энтропии randomUUID/randomInt попадает в снапшоты;
 *      CVE-2026-106070 / 106071 / 106073 — ошибки ZipFile и Permission Model;
 *      + обновление ca-cert (инцидент eMudhra, см. ниже).
 *    Исправленные версии: 22.23.4, 24.22.1, 26.12.1.
 *
 * 2. Доверенные корни. В том же релизе обновлён ca-cert: из хранилища
 *    убраны корни, затронутые инцидентом eMudhra (см. раздел 6 этого файла).
 *
 * Код возврата: 0 — всё в порядке; 1 — есть критичные проблемы (CI должен
 * падать). Флаг --warn превращает ошибку в предупреждение.
 */
import { readFileSync, existsSync } from 'node:fs';
import tls from 'node:tls';

/** Минимальные безопасные версии по веткам. */
const PATCHED = { 22: '22.23.4', 24: '24.22.1', 26: '26.12.1' };
/** Ветки, которые больше не получают обновлений. */
const EOL_MAJORS = [16, 18, 20];

/** Корни, скомпрометированные в инциденте eMudhra (20.10.2026). */
const CRITICAL = [
  'emSign ECC Root CA - G3',     // удалён из Chrome Root Store / NSS
  'emSign Root TLS CA - G3',     // кросс-подписан Sectigo
  'emSign Root CS CA - G3',      // код-подпись
  'Comodo AAA Certificate Services' // кросс-подпись eMudhra
];

/** Остальные корни eMudhra — формально не затронуты, но Chrome их пересматривает. */
const WATCHLIST = [
  'emSign Root CA - G1',
  'emSign Root CA - C1',
  'emSign ECC Root CA - C3',
  'Sectigo Public Server Authentication Root',
  'COMODO Certification Authority',
  'COMODO ECC Certification Authority',
  'COMODO RSA Certification Authority'
];

const warn = process.argv.includes('--warn');
let critical = 0;
let watch = 0;

// ── 1. Версия Node.js ───────────────────────────────────────────────────────
console.log('🔍 Версия Node.js:');
const [major, minor, patch] = process.versions.node.split('.').map(Number);
const current = process.versions.node;
const needed = PATCHED[major];
if (needed) {
  const [nMaj, nMin, nPatch] = needed.split('.').map(Number);
  const outdated = major < nMaj || (major === nMaj && (minor < nMin || (minor === nMin && patch < nPatch)));
  if (outdated) {
    console.log(`   ⛔ ${current} — уязвима; требуется ${needed} или новее в ветке ${major}.x`);
    critical++;
  } else {
    console.log(`   ✅ ${current} — исправленная версия (минимум ${needed})`);
  }
} else if (EOL_MAJORS.includes(major)) {
  console.log(`   ⛔ ${current} — ветка ${major}.x больше не поддерживается (EOL)`);
  critical++;
} else {
  console.log(`   ⚠️  ${current} — ветка ${major}.x вне списка проверенных; сверьтесь с advisory Node.js`);
}

// ── 2. Доверенные корни ────────────────────────────────────────────────────
console.log('\n🔍 Доверенные корни Node (tls.rootCertificates):');
const nodeRoots = tls.rootCertificates || [];
const decode = (pem) =>
  Buffer.from(
    pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, ''),
    'base64'
  );
const hits = (der, names) => names.filter((n) => der.includes(Buffer.from(n, 'latin1')));

const nodeCritical = [];
const nodeWatch = [];
for (const pem of nodeRoots) {
  const der = decode(pem);
  nodeCritical.push(...hits(der, CRITICAL));
  nodeWatch.push(...hits(der, WATCHLIST));
}
if (nodeCritical.length) {
  console.log('   ⛔ скомпрометированные корни:');
  for (const n of new Set(nodeCritical)) console.log(`        ${n}`);
  critical += nodeCritical.length;
} else {
  console.log(`   чисто (${nodeRoots.length} корней, затронутых eMudhra нет)`);
}
if (nodeWatch.length) {
  console.log('   ⚠️  в списке наблюдения:');
  for (const n of new Set(nodeWatch)) console.log(`        ${n}`);
  watch += nodeWatch.length;
}

const SYSTEM_STORE = '/etc/ssl/certs/ca-certificates.crt';
console.log(`\n🔍 Системное хранилище (${SYSTEM_STORE}):`);
if (existsSync(SYSTEM_STORE)) {
  const der = readFileSync(SYSTEM_STORE);
  const sysCritical = hits(der, CRITICAL);
  const sysWatch = hits(der, WATCHLIST);
  if (sysCritical.length) {
    console.log('   ⛔ скомпрометированные корни:');
    for (const n of sysCritical) console.log(`        ${n}`);
    critical += sysCritical.length;
  } else {
    console.log('   чисто — пакет ca-certificates обновлён');
  }
  watch += sysWatch.length;
} else {
  console.log('   не найдено (не Debian/Ubuntu или кастомный образ)');
}

// ── Итог ───────────────────────────────────────────────────────────────────
console.log('');
if (critical > 0) {
  const msg =
    `⛔ Рантайм уязвим: ${critical} критичных находок ` +
    '(версия Node.js ниже исправленной или в хранилище доверяют скомпрометированному корню). ' +
    'Обновите Node.js и пакет ca-certificates.';
  if (warn) {
    console.warn('⚠️  ' + msg);
  } else {
    console.error(msg);
    process.exit(1);
  }
} else {
  console.log('✅ Рантайм в порядке: версия Node.js исправлена, скомпрометированных корней нет.');
}
if (watch > 0) {
  console.log(
    `ℹ️  Остальные корни eMudhra/Sectigo/Comodo присутствуют (${watch}) — ` +
      'инцидентом не затронуты, но Chrome Root Program пересматривает их.'
  );
}

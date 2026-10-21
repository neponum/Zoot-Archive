#!/usr/bin/env node
/**
 * Проверка доверенных корней рантайма после инцидента eMudhra (20.10.2026).
 *
 * Что произошло: у индийского УЦ eMudhra (бренд emSign) восемь промежуточных
 * CA-сертификатов получили слабые ключи (P-384, приватная часть — целое число
 * меньше 256, восстанавливается из публичного сертификата за секунды).
 * Кто-то мог подделать сертификат для любого домена. Chrome, Mozilla, Apple и
 * Microsoft заблокировали эти ключи; Chrome Root Store v43 (27.10.2026) и
 * NSS 3.1311 удаляют корень `emSign ECC Root CA - G3`.
 *
 * Что проверяем:
 *   1) корни, которым доверяет Node (`tls.rootCertificates`) — ими
 *      проверяются наши исходящие HTTPS-запросы (прокси к torappu.prts.wiki,
 *      raw.githubusercontent.com, monster-siren.hypergryph.com, web.hycdn.cn);
 *   2) системное хранилище ОС (/etc/ssl/certs/ca-certificates.crt).
 *
 * Код возврата: 0 — скомпрометированных корней нет; 1 — есть (CI должен
 * падать). Флаг --warn превращает ошибку в предупреждение.
 */
import { readFileSync, existsSync } from 'node:fs';
import tls from 'node:tls';

/** Корни, скомпрометированные в инциденте eMudhra (нужно, чтобы их не было). */
const CRITICAL = [
  'emSign ECC Root CA - G3',   // корень, удаляемый из Chrome Root Store / NSS
  'emSign Root TLS CA - G3',   // кросс-подписан Sectigo, промежуточные ведут к нему
  'emSign Root CS CA - G3',    // код-подпись
  'Comodo AAA Certificate Services' // кросс-подпись eMudhra, удалена в Ubuntu
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

/** Ищем CN прямо в DER: строка лежит в сертификате как printable ASCII. */
function containsName(der, name) {
  return der.includes(Buffer.from(name, 'latin1'));
}

function scanDer(der, label) {
  const critical = CRITICAL.filter((n) => containsName(der, n));
  const watch = WATCHLIST.filter((n) => containsName(der, n));
  if (critical.length || watch.length) {
    console.log(`  ${label}`);
    for (const n of critical) console.log(`     ⛔ критичный: ${n}`);
    for (const n of watch) console.log(`     ⚠️  в списке наблюдения: ${n}`);
  }
  return { critical, watch };
}

const warn = process.argv.includes('--warn');
let criticalFound = 0;
let watchFound = 0;

console.log('🔍 Доверенные корни Node (tls.rootCertificates):');
const nodeRoots = tls.rootCertificates || [];
let nodeCritical = [];
let nodeWatch = [];
for (const pem of nodeRoots) {
  const der = Buffer.from(
    pem
      .replace(/-----(BEGIN|END) CERTIFICATE-----/g, '')
      .replace(/\s+/g, ''),
    'base64'
  );
  const r = scanDer(der, '');
  nodeCritical = nodeCritical.concat(r.critical);
  nodeWatch = nodeWatch.concat(r.watch);
}
if (nodeCritical.length || nodeWatch.length) {
  console.log('  Найдено:');
  for (const n of new Set(nodeCritical)) console.log(`     ⛔ критичный: ${n}`);
  for (const n of new Set(nodeWatch)) console.log(`     ⚠️  в списке наблюдения: ${n}`);
} else {
  console.log(`     чисто (${nodeRoots.length} корней, eMudhra/emSign отсутствуют)`);
}
criticalFound += nodeCritical.length;
watchFound += nodeWatch.length;

const SYSTEM_STORE = '/etc/ssl/certs/ca-certificates.crt';
console.log(`\n🔍 Системное хранилище (${SYSTEM_STORE}):`);
if (existsSync(SYSTEM_STORE)) {
  const der = readFileSync(SYSTEM_STORE);
  const r = scanDer(der, '');
  if (!r.critical.length && !r.watch.length) {
    console.log('     чисто — пакет ca-certificates обновлён');
  }
  criticalFound += r.critical.length;
  watchFound += r.watch.length;
} else {
  console.log('     не найдено (не Debian/Ubuntu или кастомный образ)');
}

console.log('');
if (criticalFound > 0) {
  const msg =
    `⛔ В доверенных корнях остались сертификаты, затронутые инцидентом eMudhra ` +
    `(${criticalFound}). Исходящие HTTPS-запросы сервера (/api/proxy) можно ` +
    `подделать. Обновите Node/образ или системный ca-certificates.`;
  if (warn) {
    console.warn('⚠️  ' + msg);
  } else {
    console.error(msg);
    process.exit(1);
  }
} else {
  console.log('✅ Скомпрометированных корней eMudhra в доверенных хранилищах нет.');
}
if (watchFound > 0) {
  console.log(
    `ℹ️  Остальные корни eMudhra/Sectigo/Comodo присутствуют (${watchFound}) — ` +
      'они инцидентом не затронуты, но Chrome Root Program пересматривает их.'
  );
}

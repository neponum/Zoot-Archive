import fs from 'fs';

const musicData = JSON.parse(fs.readFileSync('./src/data/audio_music.json', 'utf8'));

const keys = Object.keys(musicData);
const urls = Object.values(musicData);
const uniqueUrls = new Set(urls);

console.log(`Total keys: ${keys.length}`);
console.log(`Total unique URLs: ${uniqueUrls.size}`);

// Check for some common prefixes
const avgKeys = keys.filter(k => k.includes('avg'));
console.log(`Keys containing 'avg': ${avgKeys.length}`);

const mAvgKeys = keys.filter(k => k.startsWith('m_avg_'));
console.log(`Keys starting with 'm_avg_': ${mAvgKeys.length}`);

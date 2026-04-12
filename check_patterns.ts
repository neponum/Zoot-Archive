import fs from 'fs';

const musicData = JSON.parse(fs.readFileSync('./src/data/audio_music.json', 'utf8'));
const keys = Object.keys(musicData);

const patterns = new Set();
keys.forEach(k => {
    const parts = k.split('_');
    if (parts.length >= 2) {
        patterns.add(parts.slice(0, 2).join('_'));
    }
});

console.log('Key patterns (first 2 parts):', Array.from(patterns).sort());

const batPatterns = keys.filter(k => k.startsWith('m_bat')).map(k => {
    const match = k.match(/m_bat_([^_]+)/);
    return match ? match[1] : null;
}).filter(n => n !== null);
console.log('Unique m_bat suffixes:', Array.from(new Set(batPatterns)).sort());

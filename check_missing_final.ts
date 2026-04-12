import fs from 'fs';

const musicData = JSON.parse(fs.readFileSync('./src/data/audio_music.json', 'utf8'));
const keys = Object.keys(musicData);

const presentActs = new Set();
keys.forEach(k => {
    const match = k.match(/act(\d+)side/);
    if (match) presentActs.add(parseInt(match[1]));
});

const missing = [];
for (let i = 1; i <= 51; i++) {
    if (!presentActs.has(i)) {
        missing.push(i);
    }
}

console.log('Missing actXXside:', missing);

const presentMains = new Set();
keys.forEach(k => {
    const match = k.match(/main_(\d+)/) || k.match(/act(\d+)main/);
    if (match) presentMains.add(parseInt(match[1]));
});

const missingMains = [];
for (let i = 0; i <= 16; i++) {
    if (!presentMains.has(i)) {
        missingMains.push(i);
    }
}
console.log('Missing main chapters (0-16):', missingMains);

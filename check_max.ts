import fs from 'fs';

const musicData = JSON.parse(fs.readFileSync('./src/data/audio_music.json', 'utf8'));
const keys = Object.keys(musicData);

const acts = keys.map(k => {
    const match = k.match(/act(\d+)side/);
    return match ? parseInt(match[1]) : null;
}).filter(n => n !== null) as number[];

if (acts.length > 0) {
    console.log(`Max act number: ${Math.max(...acts)}`);
    const uniqueActs = Array.from(new Set(acts)).sort((a, b) => a - b);
    console.log(`Unique acts: ${uniqueActs.join(', ')}`);
} else {
    console.log("No 'actXside' keys found.");
}

const mains = keys.map(k => {
    const match = k.match(/main_(\d+)/) || k.match(/act(\d+)main/);
    return match ? parseInt(match[1]) : null;
}).filter(n => n !== null) as number[];

if (mains.length > 0) {
    console.log(`Max main chapter: ${Math.max(...mains)}`);
    console.log(`Unique main chapters: ${Array.from(new Set(mains)).sort((a, b) => a - b).join(', ')}`);
}

// Check for gaps in acts
const uniqueActs = Array.from(new Set(acts)).sort((a, b) => a - b);
const minAct = Math.min(...uniqueActs);
const maxAct = Math.max(...uniqueActs);
const missingActs = [];
for (let i = minAct; i <= maxAct; i++) {
    if (!uniqueActs.includes(i)) {
        missingActs.push(i);
    }
}
const mainRelatedKeys = keys.filter(k => k.toLowerCase().includes('main'));
console.log(`Total main-related keys: ${mainRelatedKeys.length}`);
const mainPatterns = new Set();
mainRelatedKeys.forEach(k => {
    const m1 = k.match(/main_(\d+)/);
    if (m1) mainPatterns.add(`main_${m1[1]}`);
    const m2 = k.match(/act(\d+)main/);
    if (m2) mainPatterns.add(`act${m2[1]}main`);
});
console.log(`Main patterns found:`, Array.from(mainPatterns).sort());

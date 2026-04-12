import fs from 'fs';

const soundData = JSON.parse(fs.readFileSync('./src/data/audio_sound.json', 'utf8'));
const keys = Object.keys(soundData);

const d_keys = keys.filter(k => k.startsWith('d_'));
const d_avg = d_keys.filter(k => k.startsWith('d_avg_'));
const d_amb = d_keys.filter(k => k.startsWith('d_amb_'));
const d_gen = d_keys.filter(k => k.startsWith('d_gen_'));

const others = d_keys.filter(k => !k.startsWith('d_avg_') && !k.startsWith('d_amb_') && !k.startsWith('d_gen_'));

console.log(`Total d_ keys: ${d_keys.length}`);
console.log(`d_avg_: ${d_avg.length}`);
console.log(`d_amb_: ${d_amb.length}`);
console.log(`d_gen_: ${d_gen.length}`);
console.log(`Others starting with d_: ${others.length}`);
if (others.length > 0) {
    console.log('Sample others:', others.slice(0, 20));
}

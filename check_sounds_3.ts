import fs from 'fs';

const soundData = JSON.parse(fs.readFileSync('./src/data/audio_sound.json', 'utf8'));
const keys = Object.keys(soundData);

const avg_no_d = keys.filter(k => k.startsWith('avg_') && !k.startsWith('d_avg_'));
const amb_no_d = keys.filter(k => k.startsWith('amb_') && !k.startsWith('d_amb_'));
const gen_no_d = keys.filter(k => k.startsWith('gen_') && !k.startsWith('d_gen_'));

console.log(`avg_ without d_: ${avg_no_d.length}`);
console.log(`amb_ without d_: ${amb_no_d.length}`);
console.log(`gen_ without d_: ${gen_no_d.length}`);

if (avg_no_d.length > 0) console.log('Sample avg_:', avg_no_d.slice(0, 10));
if (amb_no_d.length > 0) console.log('Sample amb_:', amb_no_d.slice(0, 10));
if (gen_no_d.length > 0) console.log('Sample gen_:', gen_no_d.slice(0, 10));

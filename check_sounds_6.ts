import fs from 'fs';

const soundData = JSON.parse(fs.readFileSync('./src/data/audio_sound.json', 'utf8'));
const keys = Object.keys(soundData);

const d_bat = keys.filter(k => k.startsWith('d_bat_') && !k.startsWith('d_avg_'));
const d_sys = keys.filter(k => k.startsWith('d_sys_') && !k.startsWith('d_avg_'));

console.log(`d_bat_ without d_avg_: ${d_bat.length}`);
console.log(`d_sys_ without d_avg_: ${d_sys.length}`);

if (d_bat.length > 0) console.log('Sample d_bat_:', d_bat.slice(0, 10));
if (d_sys.length > 0) console.log('Sample d_sys_:', d_sys.slice(0, 10));

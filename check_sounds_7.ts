import fs from 'fs';

const soundData = JSON.parse(fs.readFileSync('./src/data/audio_sound.json', 'utf8'));
const keys = Object.keys(soundData);

const bat = keys.filter(k => k.startsWith('bat_'));
const sys = keys.filter(k => k.startsWith('sys_'));

console.log(`bat_ keys: ${bat.length}`);
console.log(`sys_ keys: ${sys.length}`);

if (bat.length > 0) console.log('Sample bat_:', bat.slice(0, 10));
if (sys.length > 0) console.log('Sample sys_:', sys.slice(0, 10));

import fs from 'fs';

const data = JSON.parse(fs.readFileSync('audio_data.json', 'utf8'));

const bgmBanks = data.bgmBanks;
const act50Banks = bgmBanks.filter((b: any) => 
    (b.intro && b.intro.includes('act50')) || 
    (b.loop && b.loop.includes('act50')) || 
    (b.name && b.name.includes('act50'))
);

console.log(`Found ${act50Banks.length} act50 related banks in audio_data.json`);
if (act50Banks.length > 0) {
    console.log(act50Banks);
}

const main14Banks = bgmBanks.filter((b: any) => 
    (b.intro && b.intro.includes('main_14')) || 
    (b.loop && b.loop.includes('main_14')) || 
    (b.name && b.name.includes('main_14'))
);
if (main14Banks.length > 0) {
    console.log(main14Banks);
}

const act51Banks = bgmBanks.filter((b: any) => 
    (b.intro && b.intro.includes('act51')) || 
    (b.loop && b.loop.includes('act51')) || 
    (b.name && b.name.includes('act51'))
);
console.log(`Found ${act51Banks.length} act51 related banks in audio_data.json`);
if (act51Banks.length > 0) {
    console.log(act51Banks);
}

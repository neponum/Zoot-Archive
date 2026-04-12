import fs from 'fs';

const data = JSON.parse(fs.readFileSync('audio_data.json', 'utf8'));

if (data.musics) {
    const musicEntries = Object.entries(data.musics);
    console.log(`Total musics: ${musicEntries.length}`);
    console.log('Sample music entries:', musicEntries.slice(0, 5));
}

if (data.bgmBanks) {
    console.log('Sample bgmBanks:', data.bgmBanks.slice(0, 5));
}

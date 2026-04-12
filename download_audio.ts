import https from 'https';
import fs from 'fs';

const url = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/audio_data.json';
const file = fs.createWriteStream('audio_data.json');

https.get(url, (res) => {
    res.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log('Downloaded audio_data.json');
        processData();
    });
}).on('error', (err) => {
    console.error(err);
});

function processData() {
    const data = JSON.parse(fs.readFileSync('audio_data.json', 'utf8'));
    // Look for music related fields
    console.log('Keys in audio_data.json:', Object.keys(data));
    
    if (data.bgmBanks) {
        console.log(`Found ${data.bgmBanks.length} bgmBanks`);
        // Example: { intro: '...', loop: '...', name: '...' }
    }
    
    // Check for other fields like 'musics' or 'bgms'
    const musicKeys = Object.keys(data).filter(k => k.toLowerCase().includes('music') || k.toLowerCase().includes('bgm'));
    console.log('Music related keys:', musicKeys);
}

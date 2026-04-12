import fs from 'fs';

const soundData = JSON.parse(fs.readFileSync('./src/data/audio_sound.json', 'utf8'));
const gameData = JSON.parse(fs.readFileSync('audio_data.json', 'utf8'));

const soundKeys = new Set(Object.keys(soundData));
const missing = [];

if (gameData.soundFXBanks) {
    gameData.soundFXBanks.forEach((bank: any) => {
        if (bank.sounds) {
            bank.sounds.forEach((s: any) => {
                const assetPath = s.asset;
                if (assetPath) {
                    const parts = assetPath.split('/');
                    const fileName = parts[parts.length - 1];
                    
                    if (!soundKeys.has(fileName)) {
                        missing.push({ name: bank.name, asset: assetPath, fileName });
                    }
                }
            });
        }
    });
}

console.log(`Total missing sounds: ${missing.length}`);
if (missing.length > 0) {
    console.log('Sample missing sounds:');
    console.log(missing.slice(0, 20));
}

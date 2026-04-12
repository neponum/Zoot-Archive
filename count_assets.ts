import fs from 'fs';

const data = JSON.parse(fs.readFileSync('audio_data.json', 'utf8'));
const assets = new Set();

if (data.soundFXBanks) {
    data.soundFXBanks.forEach((bank: any) => {
        if (bank.sounds) {
            bank.sounds.forEach((s: any) => {
                if (s.asset) assets.add(s.asset);
            });
        }
    });
}

console.log(`Total unique assets in audio_data.json: ${assets.size}`);

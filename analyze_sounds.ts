import fs from 'fs';

const data = JSON.parse(fs.readFileSync('audio_data.json', 'utf8'));

if (data.soundFXBanks) {
    const act51Sounds = data.soundFXBanks.filter((b: any) => b.name.includes('act51'));
    console.log(`Found ${act51Sounds.length} act51 related sound banks`);
    if (act51Sounds.length > 0) {
        console.log(JSON.stringify(act51Sounds, null, 2));
    }
}

import * as fs from 'fs';

const filePath = 'src/data/audio_music.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const newData: any = {};
for (const [key, url] of Object.entries(data) as [string, string][]) {
    let newUrl = url;
    
    // Fix URL if it's in avg folder and missing avg_ prefix in filename
    if (url.includes('/assets/audio/music/avg/m_') && !url.includes('/assets/audio/music/avg/m_avg_')) {
        newUrl = url.replace('/avg/m_', '/avg/m_avg_');
    }
    
    // Fix Key if it starts with m_ and is in avg folder
    if (key.startsWith('m_') && !key.startsWith('m_avg_') && newUrl.includes('/avg/')) {
        const newKey = 'm_avg_' + key.slice(2);
        newData[newKey] = newUrl;
        newData[key] = newUrl;
    } else {
        newData[key] = newUrl;
    }
}

fs.writeFileSync(filePath, JSON.stringify(newData, null, 4));

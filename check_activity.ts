import https from 'https';
import fs from 'fs';

const url = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/activity_table.json';
const file = fs.createWriteStream('activity_table.json');

https.get(url, (res) => {
    res.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log('Downloaded activity_table.json');
        processData();
    });
}).on('error', (err) => {
    console.error(err);
});

function processData() {
    const data = JSON.parse(fs.readFileSync('activity_table.json', 'utf8'));
    const basicInfo = data.basicInfo;
    if (basicInfo) {
        const keys = Object.keys(basicInfo).filter(k => k.includes('act50'));
        console.log('act50 related keys:', keys);
        keys.forEach(k => console.log(k, basicInfo[k].name));
    }
}

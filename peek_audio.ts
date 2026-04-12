import https from 'https';

const url = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/audio_data.json';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
        if (data.length > 5000) {
            console.log(data.substring(0, 5000));
            res.destroy();
        }
    });
    res.on('end', () => {
        if (data.length <= 5000) {
            console.log(data);
        }
    });
}).on('error', (err) => {
    console.error(err);
});

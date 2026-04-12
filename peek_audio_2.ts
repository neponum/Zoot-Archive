import https from 'https';

const url = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/audio_data.json';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
        if (data.length > 50000) {
            // Look for "musics" or "bgm"
            const index = data.indexOf('"musics"');
            if (index !== -1) {
                console.log(data.substring(index, index + 5000));
            } else {
                console.log("Could not find 'musics' in first 50000 bytes");
            }
            res.destroy();
        }
    });
}).on('error', (err) => {
    console.error(err);
});

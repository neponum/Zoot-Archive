const https = require('https');

https.get('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/story_review_table.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const intermezzi = ['act9d0', 'act12d0', 'act14d0', 'act16d0', 'act23d0'];
    
    for (const key of intermezzi) {
      if (json[key]) {
        console.log(key, json[key].name, json[key].entryType, json[key].actType, json[key].customType);
      }
    }
  });
});

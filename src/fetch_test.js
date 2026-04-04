const fs = require('fs');
const https = require('https');

https.get('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/story_review_table.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const keys = Object.keys(json);
    console.log("First 3 items:");
    for(let i=0; i<3; i++) {
      console.log(JSON.stringify(json[keys[i]], null, 2));
    }
  });
});

const https = require('https');

https.get('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/story_review_table.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const keys = Object.keys(json).slice(0, 5);
    console.log("First 5 keys:", keys);
    
    for (const key of keys) {
      console.log(`\n--- ${key} ---`);
      const item = json[key];
      console.log("name:", item.name);
      console.log("entryType:", item.entryType);
      console.log("startTime:", item.startTime);
      console.log("endTime:", item.endTime);
    }
  });
});

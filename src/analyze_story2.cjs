const https = require('https');

https.get('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/story_review_table.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const entryTypes = new Set();
    const actTypes = new Set();
    
    for (const key in json) {
      entryTypes.add(json[key].entryType);
      actTypes.add(json[key].actType);
    }
    
    console.log("Entry Types:", Array.from(entryTypes));
    console.log("Act Types:", Array.from(actTypes));
  });
});

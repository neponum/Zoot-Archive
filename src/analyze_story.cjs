const https = require('https');

https.get('https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/story_review_table.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const keys = Object.keys(json);
    
    for (const key of keys.slice(0, 5)) {
      console.log(`\n--- ${key} ---`);
      const item = json[key];
      console.log("name:", item.name);
      console.log("entryType:", item.entryType);
      console.log("startTime:", item.startTime);
    }
    
    // Check if there are any other fields that might indicate order or year
    const firstItem = json[keys[0]];
    console.log("\nFields in first item:", Object.keys(firstItem));
  });
});

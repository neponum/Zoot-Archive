import fs from 'fs';
import https from 'https';

https.get('https://api.github.com/repos/fexli/ArknightsResource/contents/camplogo', { headers: { 'User-Agent': 'Node.js' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const files = JSON.parse(data).map(f => f.name).filter(n => n.endsWith('.png'));
    fs.writeFileSync('/app/applet/logos.json', JSON.stringify(files, null, 2));
    console.log('Saved logos.json');
  });
});

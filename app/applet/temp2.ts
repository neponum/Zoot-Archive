import fs from 'fs';

async function run() {
  const res = await fetch('https://api.github.com/repos/fexli/ArknightsResource/contents/avatar/ASSISTANT');
  const data = await res.json();
  const files = data.map((f: any) => f.name).filter((n: string) => n.endsWith('.png'));
  fs.writeFileSync('/app/applet/avatars.json', JSON.stringify(files, null, 2));
  console.log('Saved ' + files.length + ' files');
}
run();

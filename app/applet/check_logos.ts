import fs from 'fs';

async function run() {
  const res = await fetch('https://api.github.com/repos/fexli/ArknightsResource/contents/camplogo');
  const data = await res.json();
  const files = data.map((f: any) => f.name).filter((n: string) => n.endsWith('.png'));
  console.log(files);
}
run();

async function run() {
  const res = await fetch('https://api.github.com/repos/fexli/ArknightsResource/contents/camplogo');
  const data = await res.json();
  const files = data.map(f => f.name).filter(n => n.endsWith('.png'));
  console.log(files);
}
run();

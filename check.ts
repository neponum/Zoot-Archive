import axios from 'axios';

async function check() {
  try {
    const res = await axios.get('https://api.github.com/repos/050644zf/ArknightsStoryTextReader/git/trees/master?recursive=1');
    const files = res.data.tree.map((t: any) => t.path);
    const images = files.filter((f: string) => f.includes('bg_black') || f.includes('char_102_texas_1'));
    console.log("Found:", images);
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}
check();

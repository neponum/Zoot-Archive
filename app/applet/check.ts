import axios from 'axios';

async function check() {
  try {
    const res = await axios.head('https://raw.githubusercontent.com/050644zf/ArknightsStoryTextReader/master/assets/images/bg_black.png');
    console.log("Images exist:", res.status);
  } catch (e) {
    console.log("Images fail");
  }
  try {
    const res = await axios.head('https://raw.githubusercontent.com/050644zf/ArknightsStoryTextReader/master/assets/characters/char_102_texas_1.png');
    console.log("Characters exist:", res.status);
  } catch (e) {
    console.log("Characters fail");
  }
}
check();

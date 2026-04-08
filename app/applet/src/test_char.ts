import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public', 'character.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log(JSON.stringify(data['avg_1037_amiya3_1'], null, 2));

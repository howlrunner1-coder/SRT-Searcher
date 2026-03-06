import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBTITLES_DIR = path.resolve(__dirname, '../subtitles');
const OUTPUT_FILE = path.resolve(__dirname, '../src/subtitles-index.json');

interface Subtitle {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  fileName: string;
}

function parseSRT(content: string, fileName: string): Subtitle[] {
  const blocks = content.trim().split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.split('\n');
    if (lines.length < 3) return null;
    
    const indexLine = lines[0].trim();
    const index = parseInt(indexLine);
    if (isNaN(index)) return null;

    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
    if (!timeMatch) return null;
    
    const text = lines.slice(2).join(' ');
    return {
      index,
      startTime: timeMatch[1],
      endTime: timeMatch[2],
      text: text.trim(),
      fileName
    };
  }).filter((sub): sub is Subtitle => sub !== null);
}

async function generateIndex() {
  console.log('Generating static subtitle index...');
  
  if (!fs.existsSync(SUBTITLES_DIR)) {
    console.warn(`Subtitles directory not found at ${SUBTITLES_DIR}. Creating empty index.`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify([]));
    return;
  }

  const files = fs.readdirSync(SUBTITLES_DIR);
  const srtFiles = files.filter(f => f.endsWith('.srt'));
  
  let allSubtitles: Subtitle[] = [];

  for (const fileName of srtFiles) {
    console.log(`Processing ${fileName}...`);
    const content = fs.readFileSync(path.join(SUBTITLES_DIR, fileName), 'utf-8');
    const parsed = parseSRT(content, fileName);
    allSubtitles = allSubtitles.concat(parsed);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allSubtitles, null, 2));
  console.log(`Index generated with ${allSubtitles.length} entries at ${OUTPUT_FILE}`);
}

generateIndex().catch(console.error);

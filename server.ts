import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fsPromises from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBTITLES_DIR = path.join(__dirname, "subtitles");

// Ensure subtitles directory exists
if (!fs.existsSync(SUBTITLES_DIR)) {
  fs.mkdirSync(SUBTITLES_DIR);
}

const db = new Database("srt_database.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subtitles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    text TEXT NOT NULL,
    subtitle_index INTEGER NOT NULL,
    FOREIGN KEY (file_id) REFERENCES files (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_subtitles_text ON subtitles(text);
`);

async function indexSrtFiles() {
  console.log("Scanning subtitles directory...");
  const files = await fsPromises.readdir(SUBTITLES_DIR);
  const srtFiles = files.filter(f => f.endsWith(".srt"));

  for (const fileName of srtFiles) {
    const filePath = path.join(SUBTITLES_DIR, fileName);
    const stats = await fsPromises.stat(filePath);
    
    // Check if file is already indexed and not modified
    const existing = db.prepare("SELECT id, uploaded_at FROM files WHERE name = ?").get(fileName) as { id: number, uploaded_at: string } | undefined;
    
    if (existing) {
      // For simplicity, we'll just skip if it exists. 
      // A more robust version would check mtime.
      continue;
    }

    console.log(`Indexing ${fileName}...`);
    const content = await fsPromises.readFile(filePath, "utf-8");
    const subtitles = parseSRT(content);

    const transaction = db.transaction(() => {
      const fileResult = db.prepare("INSERT INTO files (name) VALUES (?)").run(fileName);
      const fileId = fileResult.lastInsertRowid;

      const insertSubtitle = db.prepare(`
        INSERT INTO subtitles (file_id, start_time, end_time, text, subtitle_index)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const sub of subtitles) {
        insertSubtitle.run(fileId, sub.startTime, sub.endTime, sub.text, sub.index);
      }
    });

    transaction();
  }
  console.log("Indexing complete.");
}

function parseSRT(content: string) {
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
      text: text.trim()
    };
  }).filter((sub): sub is NonNullable<typeof sub> => sub !== null);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Initial index
  await indexSrtFiles().catch(console.error);

  // API Routes
  app.get("/api/files", (req, res) => {
    const files = db.prepare("SELECT * FROM files ORDER BY uploaded_at DESC").all();
    res.json(files);
  });

  app.post("/api/rescan", async (req, res) => {
    try {
      await indexSrtFiles();
      res.json({ success: true });
    } catch (error) {
      console.error("Rescan error:", error);
      res.status(500).json({ error: "Failed to rescan" });
    }
  });

  app.get("/api/search", (req, res) => {
    const query = req.query.q;
    if (!query || typeof query !== 'string') {
      return res.json([]);
    }

    const results = db.prepare(`
      SELECT s.*, f.name as file_name 
      FROM subtitles s
      JOIN files f ON s.file_id = f.id
      WHERE s.text LIKE ?
      LIMIT 100
    `).all(`%${query}%`);

    res.json(results);
  });

  app.delete("/api/files/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM files WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

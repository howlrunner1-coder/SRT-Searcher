import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/files", (req, res) => {
    const files = db.prepare("SELECT * FROM files ORDER BY uploaded_at DESC").all();
    res.json(files);
  });

  app.post("/api/upload", (req, res) => {
    const { name, subtitles } = req.body;

    if (!name || !subtitles || !Array.isArray(subtitles)) {
      return res.status(400).json({ error: "Invalid data" });
    }

    const transaction = db.transaction(() => {
      const fileResult = db.prepare("INSERT INTO files (name) VALUES (?)").run(name);
      const fileId = fileResult.lastInsertRowid;

      const insertSubtitle = db.prepare(`
        INSERT INTO subtitles (file_id, start_time, end_time, text, subtitle_index)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const sub of subtitles) {
        insertSubtitle.run(fileId, sub.startTime, sub.endTime, sub.text, sub.index);
      }

      return fileId;
    });

    try {
      const fileId = transaction();
      res.json({ success: true, fileId });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to save subtitles" });
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

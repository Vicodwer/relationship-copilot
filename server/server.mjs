import http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { handleTranscripts } from "./transcripts.mjs";

const API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT ?? 3001;
const USER = process.env.ADMIN_USER ?? "admin";
const PASS = process.env.ADMIN_PASS ?? "demo@123";
const sessions = new Map(); // token -> username

// ---------- Database: chats (one room per chat) and memory ----------
const db = new DatabaseSync("copilot.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    room TEXT NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    fact TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const addMessage = db.prepare(
  "INSERT INTO messages (username, room, role, text, source, created_at) VALUES (?, ?, ?, ?, ?, ?)"
);
const getRoomMessages = db.prepare(
  "SELECT role, text, source, created_at FROM messages WHERE username = ? AND room = ? ORDER BY id DESC LIMIT 200"
);
const clearRoom = db.prepare("DELETE FROM messages WHERE username = ? AND room = ?");
const listRooms = db.prepare(
  "SELECT room, MAX(created_at) AS last_at FROM messages WHERE username = ? GROUP BY room ORDER BY last_at DESC LIMIT 50"
);
const addMemory = db.prepare("INSERT INTO memories (username, fact, created_at) VALUES (?, ?, ?)");
const getMemories = db.prepare(
  "SELECT fact, created_at FROM memories WHERE username = ? ORDER BY id DESC LIMIT 50"
);

const SYSTEM = `You are the assistant inside a relationship copilot used to manage meetings with government officers and company projects (CCTV, IoT, solar).

How to answer:
- Greetings and small talk (for example "hi", "how are you today", "thanks"): reply briefly, warmly and naturally in one or two sentences. Then offer one example of what you can check.
- If DATA.focus is present, the conversation is about that officer. Answer about them by default, and use their record for drafts.
- Questions about officers, meetings or projects: answer ONLY from the JSON data in the user message. If the data does not contain the answer, say so plainly. Never invent officers, meetings or projects.
- Writing requests (greetings, messages, drafts): write the text directly, plain and warm, in 2 to 3 sentences. Use the names and facts from the data where they help. Do not add a subject line.
- Use the SAVED MEMORY facts when they are relevant.
- General questions unrelated to the data: you may answer briefly from general knowledge, and say that it is not from the records.
- Be concise. Use short bullet points for lists.`;

// Compare two strings in a way that doesn't leak timing information
const same = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const send = (res, code, obj) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
};

const readBody = async (req) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  const room = url.searchParams.get("room") ?? "";
  const username = sessions.get((req.headers.authorization ?? "").replace("Bearer ", ""));

  if (url.pathname.startsWith("/api/transcripts")) return handleTranscripts(req, res, url, username);

  try {
    if (req.method === "POST" && path === "/api/login") {
      const { username: u = "", password: p = "" } = await readBody(req);
      if (!same(u, USER) || !same(p, PASS)) {
        return send(res, 401, { error: "Wrong username or password" });
      }
      const token = randomUUID();
      sessions.set(token, USER);
      return send(res, 200, { token });
    }

    if (!username) return send(res, 401, { error: "Please log in again" });

    if (req.method === "GET" && path === "/api/rooms") {
      return send(res, 200, { rooms: listRooms.all(username) });
    }

    if (req.method === "GET" && path === "/api/messages") {
      return send(res, 200, { messages: getRoomMessages.all(username, room).reverse() });
    }

    if (req.method === "DELETE" && path === "/api/messages") {
      clearRoom.run(username, room);
      return send(res, 200, { ok: true });
    }

    if (req.method === "GET" && path === "/api/memories") {
      return send(res, 200, { memories: getMemories.all(username) });
    }

    if (req.method === "POST" && path === "/api/ask") {
      if (!API_KEY) return send(res, 500, { error: "GROQ_API_KEY is not set" });

      const body = await readBody(req);
      const { question, data, source = "text" } = body;
      const roomId = body.room ?? "general";
      const now = () => new Date().toISOString();

      // Transcript: save what the user said or typed, in its room
      addMessage.run(username, roomId, "user", question, source, now());

      // Memory: "remember ..." is saved as a fact and not sent to the model
      const remember = question.match(/^remember\s+(.+)/i);
      if (remember) {
        const fact = remember[1].trim();
        addMemory.run(username, fact, now());
        const reply = `Saved to memory: ${fact}`;
        addMessage.run(username, roomId, "assistant", reply, "system", now());
        return send(res, 200, { answer: reply });
      }

      const facts = getMemories.all(username).map((m) => `- ${m.fact}`).join("\n") || "(none yet)";

      const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          max_tokens: 600,
          messages: [
            { role: "system", content: `${SYSTEM}\n\nSAVED MEMORY (facts the user asked you to remember):\n${facts}` },
            { role: "user", content: `DATA:\n${JSON.stringify(data)}\n\nQUESTION: ${question}` },
          ],
        }),
      });

      const json = await upstream.json();
      const answer = json.choices?.[0]?.message?.content ?? json.error?.message ?? "No answer";

      addMessage.run(username, roomId, "assistant", answer, "ai", now());
      return send(res, 200, { answer });
    }

    res.writeHead(404);
    res.end();
  } catch (err) {
    send(res, 500, { error: `Server error: ${err.message}` });
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
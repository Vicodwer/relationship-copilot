import http from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";

const API_KEY = process.env.GROQ_API_KEY;
const PORT = process.env.PORT ?? 3001;
const USER = process.env.ADMIN_USER ?? "admin";
const PASS = process.env.ADMIN_PASS ?? "demo@123";
const sessions = new Set();

const SYSTEM = `You are the assistant inside a relationship copilot used to manage meetings with government officers and company projects (CCTV, IoT, solar).

How to answer:
- Greetings and small talk (for example "hi", "how are you today", "thanks"): reply briefly, warmly and naturally in one or two sentences. Then offer one example of what you can check.
- Questions about officers, meetings or projects: answer ONLY from the JSON data in the user message. If the data does not contain the answer, say so plainly. Never invent officers, meetings or projects.
- Writing requests (greetings, messages, drafts): write the text directly, plain and warm, in 2 to 3 sentences. Use the names and facts from the data where they help. Do not add a subject line.
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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  try {
    if (req.method === "POST" && req.url === "/api/login") {
      const { username = "", password = "" } = await readBody(req);
      if (!same(username, USER) || !same(password, PASS)) {
        return send(res, 401, { error: "Wrong username or password" });
      }
      const token = randomUUID();
      sessions.add(token);
      return send(res, 200, { token });
    }

    if (req.method === "POST" && req.url === "/api/ask") {
      const token = (req.headers.authorization ?? "").replace("Bearer ", "");
      if (!sessions.has(token)) return send(res, 401, { error: "Please log in again" });
      if (!API_KEY) return send(res, 500, { error: "GROQ_API_KEY is not set" });

      const { question, data } = await readBody(req);

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
            { role: "system", content: SYSTEM },
            { role: "user", content: `DATA:\n${JSON.stringify(data)}\n\nQUESTION: ${question}` },
          ],
        }),
      });

      const json = await upstream.json();
      const answer = json.choices?.[0]?.message?.content ?? json.error?.message ?? "No answer";
      return send(res, 200, { answer });
    }

    res.writeHead(404);
    res.end();
  } catch (err) {
    send(res, 500, { error: `Server error: ${err.message}` });
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
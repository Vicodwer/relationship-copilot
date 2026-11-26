// server/transcripts.mjs
// Transcript layer (stores meeting notes in the same copilot.db) + intelligence layer (AI summary, actions, promises, next brief).

import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("copilot.db");
db.exec(`
CREATE TABLE IF NOT EXISTS transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  officer_id TEXT NOT NULL,
  officer_name TEXT,
  meeting_date TEXT NOT NULL,
  title TEXT,
  transcript TEXT NOT NULL,
  intelligence TEXT,
  created_at TEXT NOT NULL
);`);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS });
  res.end(data === undefined ? "" : JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

const toDto = (r) => ({
  id: r.id,
  officerId: r.officer_id,
  officerName: r.officer_name,
  meetingDate: r.meeting_date,
  title: r.title,
  transcript: r.transcript,
  intelligence: r.intelligence ? JSON.parse(r.intelligence) : null,
  createdAt: r.created_at,
});

async function askGroq(system, user) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Groq error ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices[0].message.content;
}

const ANALYSIS_PROMPT = `You analyse a meeting between a security-systems company and a government officer.
Return ONLY a JSON object with these keys:
- summary (string, 3-4 sentences)
- decisions (string[])
- actionItems (string[], "who: what, by when" where known)
- promisesMade (string[], anything our side promised)
- risks (string[], concerns or objections raised)
- nextMeetingBrief (string, what to prepare before the next meeting with this officer)
Use earlier meeting summaries only for continuity. Do not invent facts that are not in the notes.`;

const PLAN_PROMPT = `You plan the week for a sales/relationship team dealing with government officers.
Using the meeting intelligence provided, return ONLY a JSON object with keys:
- weekSummary (string, 2-3 sentences)
- priorities (array of {officer, action, why, dueBy}) ranked most urgent first, at most 8
- followUps (string[]) - people to contact and what to say
- risksToWatch (string[])
Only use facts in the material. Do not invent officers or dates.`;

function parseJson(text) {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  return JSON.parse(text.slice(s, e + 1));
}

export async function handleTranscripts(req, res, url, user) {
  if (req.method === "OPTIONS") return send(res, 204);

  // parts: ["api", "transcripts", "<id>", "analyze"]
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[2] ? Number(parts[2]) : null;

  try {
    // List (optionally for one officer)
    if (parts.length === 2 && req.method === "GET") {
      const officerId = url.searchParams.get("officerId");
      const rows = officerId
        ? db.prepare("SELECT * FROM transcripts WHERE username=? AND officer_id=? ORDER BY meeting_date DESC, id DESC").all(user, officerId)
        : db.prepare("SELECT * FROM transcripts WHERE username=? ORDER BY meeting_date DESC, id DESC").all(user);
      return send(res, 200, rows.map(toDto));
    }

    // Save a meeting
    if (parts.length === 2 && req.method === "POST") {
      const b = await readBody(req);
      if (!b.officerId || !b.transcript?.trim()) {
        return send(res, 400, { error: "officerId and transcript are required" });
      }
      const info = db
        .prepare(`INSERT INTO transcripts (username, officer_id, officer_name, meeting_date, title, transcript, created_at)
                  VALUES (?,?,?,?,?,?,?)`)
        .run(
          user,
          String(b.officerId),
          b.officerName ?? "",
          b.meetingDate ?? new Date().toISOString().slice(0, 10),
          b.title ?? "",
          b.transcript.trim(),
          new Date().toISOString()
        );
      const row = db.prepare("SELECT * FROM transcripts WHERE id=? AND username=?").get(Number(info.lastInsertRowid), user);
      return send(res, 201, toDto(row));
    }

    // Intelligence: analyse one saved meeting
    if (parts.length === 4 && parts[3] === "analyze" && req.method === "POST") {
      const row = db.prepare("SELECT * FROM transcripts WHERE id=? AND username=?").get(id, user);
      if (!row) return send(res, 404, { error: "Not found" });

      const prior = db
        .prepare(`SELECT meeting_date, intelligence FROM transcripts
                  WHERE username=? AND officer_id=? AND id<>? AND intelligence IS NOT NULL
                  ORDER BY meeting_date DESC LIMIT 3`)
        .all(user, row.officer_id, id);
      const context =
        prior.map((p) => `[${p.meeting_date}] ${JSON.parse(p.intelligence).summary}`).join("\n") || "None";

      const text = await askGroq(
        ANALYSIS_PROMPT,
        `Officer: ${row.officer_name}\nMeeting: ${row.title}\nDate: ${row.meeting_date}\n\nNOTES:\n${row.transcript}\n\nEARLIER MEETINGS WITH THIS OFFICER:\n${context}`
      );
      const intelligence = parseJson(text);

      db.prepare("UPDATE transcripts SET intelligence=? WHERE id=? AND username=?")
        .run(JSON.stringify(intelligence), id, user);

      return send(res, 200, toDto({ ...row, intelligence: JSON.stringify(intelligence) }));
    }

        // Planning: combine every analysed meeting into a prioritised plan
    if (parts.length === 3 && parts[2] === "plan" && req.method === "GET") {
      const rows = db
        .prepare(`SELECT officer_name, meeting_date, intelligence FROM transcripts
                  WHERE username=? AND intelligence IS NOT NULL
                  ORDER BY meeting_date DESC LIMIT 40`)
        .all(user);
      if (!rows.length) return send(res, 200, { plan: null, message: "Analyse some meetings first." });

      const material = rows
        .map((r) => {
          const i = JSON.parse(r.intelligence);
          return `[${r.meeting_date}] ${r.officer_name}
          Summary: ${i.summary}
          Actions: ${(i.actionItems || []).join("; ")}
          Promises: ${(i.promisesMade || []).join("; ")}
          Risks: ${(i.risks || []).join("; ")}
          Prepare: ${i.nextMeetingBrief || ""}`;
          })
          .join("\n\n");
          

      const text = await askGroq(
        PLAN_PROMPT,
        `Today is ${new Date().toISOString().slice(0, 10)}.\n\nMEETINGS:\n${material}`
      );
      return send(res, 200, { plan: parseJson(text) });
    }

    // Delete
    if (parts.length === 3 && req.method === "DELETE") {
      db.prepare("DELETE FROM transcripts WHERE id=? AND username=?").run(id, user);
      return send(res, 204);
    }

    send(res, 404, { error: "Not found" });
  } catch (err) {
    console.error(err);
    send(res, 500, { error: err.message });
  }
}
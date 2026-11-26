// src/transcriptApi.js
// Needs API_URL, authHeaders and check to be exported from src/api.js.
import { API_URL, authHeaders, check } from "./api";

export const listTranscripts = (officerId = "") =>
  fetch(`${API_URL}/api/transcripts${officerId ? `?officerId=${encodeURIComponent(officerId)}` : ""}`, {
    headers: authHeaders(),
  }).then(check);

export const saveTranscript = (body) =>
  fetch(`${API_URL}/api/transcripts`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(check);

export const analyzeTranscript = (id) =>
  fetch(`${API_URL}/api/transcripts/${id}/analyze`, {
    method: "POST",
    headers: authHeaders(),
  }).then(check);

export const deleteTranscript = async (id) => {
  const res = await fetch(`${API_URL}/api/transcripts/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
};
export const getPlan = () =>
  fetch(`${API_URL}/api/transcripts/plan`, { headers: authHeaders() }).then(check);
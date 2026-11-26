// Change this to your deployed server address before sharing the app
export const API_URL = "http://localhost:3001";

export const authHeaders = () => ({
  "content-type": "application/json",
  authorization: `Bearer ${sessionStorage.getItem("token")}`,
});

export const check = async (res) => {
  if (res.status === 401) throw new Error("Please log in again");
  return res.json();
};

export const askAssistant = async (question, data, source = "text", room = "general") => {
  const res = await fetch(`${API_URL}/api/ask`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ question, data, source, room }),
  });
  const json = await check(res);
  return json.answer ?? json.error ?? "No answer";
};

export const loadRooms = async () => {
  const res = await fetch(`${API_URL}/api/rooms`, { headers: authHeaders() });
  return (await check(res)).rooms;
};

export const loadRoomMessages = async (room) => {
  const res = await fetch(`${API_URL}/api/messages?room=${encodeURIComponent(room)}`, {
    headers: authHeaders(),
  });
  return (await check(res)).messages;
};

export const clearRoom = async (room) => {
  await fetch(`${API_URL}/api/messages?room=${encodeURIComponent(room)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
};

export const loadMemories = async () => {
  const res = await fetch(`${API_URL}/api/memories`, { headers: authHeaders() });
  return (await check(res)).memories;
};

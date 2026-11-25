// Change this to your deployed server address before sharing the app
export const API_URL = "http://localhost:3001";

export const askAssistant = async (question, data) => {
  const res = await fetch(`${API_URL}/api/ask`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${sessionStorage.getItem("token")}`,
    },
    body: JSON.stringify({ question, data }),
  });
  const json = await res.json();
  if (res.status === 401) throw new Error("Please log in again");
  return json.answer ?? json.error ?? "No answer";
};
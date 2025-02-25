// @/features/chat/openAiChat.ts
import { OPENAI_ENDPOINT } from "../constants/openai"; // Giả sử file này tồn tại
import { Message } from "../messages/messages";

export async function getChatResponseStream(
  messages: Message[],
  apiKey: string, // Không dùng nhưng giữ cho tương thích
  endpoint: string // Không dùng vì đã fix url
): Promise<string> {
  const url = "/api/lmstudio/chat/completions"; // Proxy endpoint
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-r1-distill-qwen-7b",
      messages,
      stream: false, // Non-streaming
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  const text = await response.text();
  if (!text) {
    throw new Error("Empty response from server");
  }

  try {
    const data = JSON.parse(text) as { choices?: { message: { content: string } }[] };
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response format");
    }
    const reply = data.choices[0].message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return reply;
  } catch (e) {
    const error = e as Error; // Ép kiểu e thành Error
    throw new Error(`JSON parse error: ${error.message}, raw text: ${text}`);
  }
}
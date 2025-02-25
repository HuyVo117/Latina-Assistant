import { Configuration, OpenAIApi } from "openai";
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Không cần kiểm tra apiKey vì dùng server cục bộ
  const configuration = new Configuration({
    basePath: "http://localhost:1234/v1", // Đúng với server LM Studio
  });

  const openai = new OpenAIApi(configuration);

  try {
    // Lấy nội dung tin nhắn từ req.body
    const userMessage = req.body.message || "Tin nhắn của bạn";

    const { data } = await openai.createChatCompletion({
      model: "DeepSeek-R1-Distill-Qwen-7B-GGUF", // Tên mô hình chính xác từ LM Studio
      messages: [{ role: "user", content: userMessage }],
    });

    const [aiRes] = data.choices;
    const message = aiRes.message?.content || "エラーが発生しました"; // Giữ nguyên thông báo lỗi tiếng Nhật

    res.status(200).json({ message });
  } catch (error) {
    console.error("Lỗi khi gọi LM Studio:", error);
    res.status(500).json({ message: "エラーが発生しました" });
  }
}
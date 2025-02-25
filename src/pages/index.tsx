// index.tsx
import { GitHubLink } from "@/components/githubLink";
import { Introduction } from "@/components/introduction";
import { Menu } from "@/components/menu";
import { MessageInputContainer } from "@/components/messageInputContainer";
import { Meta } from "@/components/meta";
import VrmViewer from "@/components/vrmViewer";
import { getChatResponseStream } from "@/features/chat/openAiChat";
import { SYSTEM_PROMPT } from "@/features/constants/systemPromptConstants";
import { useElevenLabs } from "@/features/elevenlabs/elevenLabsContext";
import { EmotionType, Message } from "@/features/messages/messages";
import {
  EmotionSentence,
  speakCharacter,
} from "@/features/messages/speakCharacter";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import { M_PLUS_2, Montserrat } from "next/font/google";
import { useCallback, useContext, useEffect, useRef, useState } from "react"; // Đảm bảo import useContext

const m_plus_2 = M_PLUS_2({
  variable: "--font-m-plus-2",
  display: "swap",
  preload: false,
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  display: "swap",
  subsets: ["latin"],
});

export default function Home() {
  const { viewer } = useContext(ViewerContext); // Đảm bảo useContext được import

  const { apiKey: elevenLabsKey, voices, currentVoiceId } = useElevenLabs();

  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT);
  const [openAiEndpoint, setOpenAiEndpoint] = useState("/api/lmstudio");
  const [chatProcessing, setChatProcessing] = useState(false);
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [assistantMessage, setAssistantMessage] = useState("");
  const [showIntroduction, setShowIntroduction] = useState(false);

  const isSpeaking = useRef(false);

  const handleChangePrompt = (prompt: string) => {
    setSystemPrompt(prompt);
    localStorage.setItem("chatvrm_prompt", prompt);
  };

  const handleChangeOpenAIEndpoint = (endpoint: string) => {
    setOpenAiEndpoint(endpoint);
    localStorage.setItem("chatvrm_openai_endpoint", endpoint);
  };

  useEffect(() => {
    const savedPrompt = localStorage.getItem("chatvrm_prompt");
    const savedOpenAIEndpoint = localStorage.getItem("chatvrm_openai_endpoint");
    const shouldShowIntroduction = localStorage.getItem("chatvrm_show_introduction");

    if (savedPrompt) setSystemPrompt(savedPrompt);
    if (savedOpenAIEndpoint) setOpenAiEndpoint(savedOpenAIEndpoint);
    if (!shouldShowIntroduction) {
      setShowIntroduction(true);
      localStorage.setItem("chatvrm_show_introduction", "true");
    }
  }, []);

  const handleChangeChatLog = useCallback(
    (targetIndex: number, text: string) => {
      const newChatLog = chatLog.map((v: Message, i) =>
        i === targetIndex ? { role: v.role, content: text } : v
      );
      setChatLog(newChatLog);
    },
    [chatLog]
  );

  const handleAISpeak = useCallback(
    async (
      sentence: EmotionSentence,
      onStart?: () => void,
      onComplete?: () => void
    ) => {
      isSpeaking.current = true;
      await speakCharacter({
        emotionSentence: sentence,
        viewer,
        onStart,
        onComplete: () => {
          isSpeaking.current = false;
          onComplete?.();
        },
        fetchAudio: async (sentence) => {
          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${currentVoiceId}/stream`,
            {
              headers: {
                "xi-api-key": elevenLabsKey,
                "content-type": "application/json",
              },
              method: "POST",
              body: JSON.stringify({
                text: sentence.sentence,
                model_id: "eleven_monolingual_v1",
              }),
            }
          );
          const buffer = await response.arrayBuffer();
          return buffer;
        },
      });
    },
    [currentVoiceId, elevenLabsKey, viewer]
  );

  const handleSendChat = useCallback(
    async (text: string) => {
      if (!elevenLabsKey) {
        setAssistantMessage("ElevenLabs API Key is not entered");
        return;
      }
      if (!voices?.length) {
        setAssistantMessage(
          "No voices detected, please check your ElevenLabs settings (in Menu)"
        );
        return;
      }

      const newMessage = text.trim();
      if (!newMessage) return;

      setAssistantMessage("");
      setChatProcessing(true);

      const messageLog: Message[] = [
        ...chatLog,
        { role: "user", content: newMessage },
      ];
      setChatLog(messageLog);

      const messages: Message[] = [
        { role: "system", content: systemPrompt },
        ...messageLog,
      ];

      try {
        const reply = await getChatResponseStream(messages, "", openAiEndpoint);
        if (!reply) {
          setAssistantMessage("Không nhận được phản hồi từ LM Studio");
          setChatProcessing(false);
          return;
        }

        const sentences = breakIntoSentences(reply);
        let fullMessage = "";
        for (const sentence of sentences) {
          const emotionSentence = sentenceToEmotionSentence(sentence);
          await handleAISpeak(emotionSentence, () => {
            setAssistantMessage((prev) => prev + " " + emotionSentence.sentence);
          });
          fullMessage += " " + emotionSentence.sentence;
        }

        const messageLogAssistant: Message[] = [
          ...messageLog,
          { role: "assistant", content: fullMessage.trim() },
        ];
        setChatLog(messageLogAssistant);
        viewer.model?.emoteController?.playEmotion("neutral");
      } catch (e) {
        const error = e as Error; // Ép kiểu e thành Error
        console.error("Chat error:", error);
        setAssistantMessage(`Lỗi: ${error.message}`);
      } finally {
        setChatProcessing(false);
      }
    },
    [
      openAiEndpoint,
      elevenLabsKey,
      voices?.length,
      chatLog,
      systemPrompt,
      viewer.model?.emoteController,
      handleAISpeak,
    ]
  );

  return (
    <div className={`${m_plus_2.variable} ${montserrat.variable}`}>
      <Meta />
      {showIntroduction && (
        <Introduction
          openAiKey={""}
          onChangeAiKey={() => {}}
          onChangeAiEndpoint={handleChangeOpenAIEndpoint}
          openAiEndpoint={openAiEndpoint}
        />
      )}
      <VrmViewer />
      <MessageInputContainer
        isChatProcessing={chatProcessing}
        onChatProcessStart={handleSendChat}
      />
      <Menu
        openAiKey={""}
        openAiEndpoint={openAiEndpoint}
        onChangeAiEndpoint={handleChangeOpenAIEndpoint}
        systemPrompt={systemPrompt}
        chatLog={chatLog}
        assistantMessage={assistantMessage}
        onChangeAiKey={() => {}}
        onChangeSystemPrompt={handleChangePrompt}
        onChangeChatLog={handleChangeChatLog}
      />
      <GitHubLink />
    </div>
  );
}

// Các hàm phụ trợ giữ nguyên
function sentenceToEmotionSentence(sentence: string): EmotionSentence {
  let currentEmotion: EmotionType | undefined = undefined;
  const tagMatch = sentence.match(/^\[(.*?)\]/);
  if (tagMatch?.[1]) {
    currentEmotion = tagMatch[1] as EmotionType;
  }
  const currentSentence = sentence.slice(tagMatch?.[0].length || 0).trim();
  return {
    emotion: currentEmotion,
    sentence: currentSentence,
  };
}

function breakIntoSentences(str: string): string[] {
  const sentenceEndings = /([.?!])/g;
  const sentences = str.split(sentenceEndings);
  const formattedSentences: string[] = [];
  const endingMarks = ["?", ".", "!"];
  for (let i = 0; i < sentences.filter(Boolean).length; i += 2) {
    const sentenceMark = sentences[i + 1];
    const currentSentence = sentences[i];
    if (!endingMarks.some((mark) => mark === sentenceMark)) continue;
    if (!currentSentence || endingMarks.some((mark) => mark === currentSentence))
      continue;
    const sentence = sentences[i].trim() + sentences[i + 1];
    formattedSentences.push(sentence);
  }
  return formattedSentences;
}
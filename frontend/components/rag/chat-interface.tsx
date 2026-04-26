"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpenText,
  Loader2,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ragApi } from "@/lib/api";
import type { RagMessage } from "@/types";

const SUGGESTED = [
  "壓縮機軸承異音該如何排查？",
  "散熱風扇效率下降的常見原因與清潔 SOP？",
  "液壓密封圈滲油的標準維修步驟是什麼？",
  "VHS 分數跌破 40 時，第一線要先做哪些事？",
  "輸送帶邊緣龜裂時，預防維護工單應如何描述？",
  "設備停機前有哪些典型的先期徵兆？",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<RagMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `rag-${Date.now()}`);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 自動調整 textarea 高度（支援 Shift+Enter 換行）
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMessage: RagMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages((current) => [...current, userMessage]);
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      setLoading(true);

      try {
        const response = await ragApi.query({
          question: text.trim(),
          session_id: sessionId,
        });

        const assistantMessage: RagMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: response.data.answer,
          sources: response.data.sources,
          created_at: new Date().toISOString(),
        };

        setMessages((current) => [...current, assistantMessage]);
      } catch (error: any) {
        const assistantMessage: RagMessage = {
          id: `e-${Date.now()}`,
          role: "assistant",
          content:
            `RAG 服務暫時無法連線。\n\n` +
            `錯誤資訊：${error?.response?.data?.detail ?? error.message}\n\n` +
            `請確認後端、向量索引與 llama.cpp 已完成啟動。`,
          created_at: new Date().toISOString(),
        };

        setMessages((current) => [...current, assistantMessage]);
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [loading, sessionId]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-full flex-col">

      {/* ── 訊息區 / 空狀態 ─────────────────────────────── */}
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-3 sm:px-5">
          {/* 簡潔說明列 */}
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-accent-300" />
            <p className="text-xs text-slate-400">
              搜尋維修手冊、SOP 與歷史工單，由 Gemma 4 E4B 生成可追溯回答
            </p>
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <span className="signal-chip !py-0.5 !text-[10px]">
                <BookOpenText className="h-3 w-3 text-accent-300" />維修手冊
              </span>
              <span className="signal-chip !py-0.5 !text-[10px]">
                <Sparkles className="h-3 w-3 text-brand-300" />SOP / 工單
              </span>
            </div>
          </div>

          {/* 建議問題 — 緊湊 2 欄網格 */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SUGGESTED.map((question) => (
              <button
                key={question}
                onClick={() => sendMessage(question)}
                className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2.5 text-left text-xs leading-5 text-slate-300 transition-all duration-150 hover:border-accent-400/30 hover:bg-accent-400/8 hover:text-white"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3 sm:px-5">
          {/* 清除按鈕 — 靠右浮動 */}
          <div className="flex justify-end">
            <button onClick={() => setMessages([])} className="ghost-button !py-0.5 !text-xs">
              <Trash2 className="h-3.5 w-3.5" />清除對話
            </button>
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2.5 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border ${
                  message.role === "user"
                    ? "border-brand-400/20 bg-brand-500/10"
                    : "border-white/10 bg-slate-950/35"
                }`}
              >
                {message.role === "user" ? (
                  <User className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Search className="h-3.5 w-3.5 text-accent-200" />
                )}
              </div>

              <div className={message.role === "user" ? "chat-bubble-user max-w-[86%]" : "chat-bubble-ai max-w-[90%]"}>
                {message.role === "assistant" ? (
                  <div className="markdown-body text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-6">{message.content}</p>
                )}

                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 border-t border-white/8 pt-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">參考來源</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.sources.map((source, index) => (
                        <span
                          key={`${source.filename}-${index}`}
                          className="table-chip"
                        >
                          {source.filename}
                          {source.page && ` p.${source.page}`}
                          {source.score !== undefined && ` ${(source.score * 100).toFixed(0)}%`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/35">
                <Search className="h-3.5 w-3.5 text-accent-200" />
              </div>
              <div className="chat-bubble-ai flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-300" />
                <span className="text-sm text-slate-300">正在檢索手冊與 SOP...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── 輸入區 ─────────────────────────────────────── */}
      <div className="border-t border-white/8 px-4 py-3 sm:px-5">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入設備問題或維修需求，Enter 送出，Shift+Enter 換行…"
            rows={1}
            className="min-h-[44px] max-h-[160px] flex-1 resize-none overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm leading-6 text-slate-100 placeholder:text-slate-500 focus:border-accent-400/30 focus:outline-none focus:ring-2 focus:ring-accent-400/10"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="primary-button h-11 w-11 shrink-0 rounded-2xl px-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-slate-600">
          本地推論 · 資料留在裝置端 · 可在文件管理更新知識來源
        </p>
      </div>
    </div>
  );
}

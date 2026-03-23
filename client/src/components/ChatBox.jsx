import React, { useState } from "react";

export default function ChatBox({
  messages,
  onSendMessage,
  phase,
  isBlackmailed,
  isDead,
}) {
  const [chatInput, setChatInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendMessage(chatInput);
      setChatInput("");
    }
  };

  // Logic for when someone can chat. Dead people normally chat in a dead-only chat (ignored for MVP or simplified).
  // For now: Only chat during LOBBY or DAY_DISCUSSION if alive and not blackmailed.
  const canChat =
    !isDead &&
    !isBlackmailed &&
    (phase === "DAY_DISCUSSION" || phase === "LOBBY");

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg shadow-lg">
      <div className="bg-gray-900 border-b border-gray-700 p-3 rounded-t-lg">
        <h2 className="text-lg font-bold text-center">Town Square</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto max-h-[500px] min-h-[300px]">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 text-sm md:text-base ${m.type === "system" ? "text-yellow-400 italic font-semibold" : "text-gray-200"}`}
          >
            {m.type === "system" ? (
              `[System] ${m.text}`
            ) : (
              <span className="break-words">
                <strong>{m.sender}: </strong>
                {m.text}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="p-4 bg-gray-900 rounded-b-lg">
        {isBlackmailed && phase !== "LOBBY" && (
          <p className="text-red-500 text-sm mb-2 font-bold animate-pulse">
            You are blackmailed. You cannot speak today.
          </p>
        )}
        {isDead && (
          <p className="text-gray-500 text-sm mb-2 italic">
            You are dead. The living cannot hear you.
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            className="flex-1 p-3 bg-gray-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={
              canChat ? "Type your message..." : "You cannot chat right now."
            }
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={!canChat}
          />
          <button
            type="submit"
            disabled={!canChat}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

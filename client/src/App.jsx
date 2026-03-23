import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import PlayerView from "./components/PlayerView";
import ModView from "./components/ModView";

const SERVER_URL = import.meta.env.PROD ? undefined : "http://localhost:3001";
const socket = io(SERVER_URL);

function App() {
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [isMod, setIsMod] = useState(false);
  const [messages, setMessages] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);

  const [gameState, setGameState] = useState({
    phase: "LOBBY",
    dayCount: 0,
    players: [],
    me: { isAlive: true, role: "..." },
  });

  useEffect(() => {
    const onConnect = () => {
      if (joined) {
        socket.emit("join_game", isMod ? "Admin/Mod" : username);
      }
    };
    socket.on("connect", onConnect);
    return () => socket.off("connect", onConnect);
  }, [joined, isMod, username]);

  useEffect(() => {
    socket.on("system_message", (msg) => {
      setMessages((prev) => [...prev, { type: "system", text: msg }]);
    });

    socket.on("chat_message", (msgData) => {
      setMessages((prev) => [
        ...prev,
        { type: "chat", sender: msgData.sender, text: msgData.text },
      ]);
    });

    socket.on("players_update", (updatedPlayers) => {
      setGameState((prev) => ({ ...prev, players: updatedPlayers }));
    });

    socket.on("game_state_update", (newState) => {
      setGameState(newState);
    });

    socket.on("timer_update", (time) => {
      setTimeLeft(time);
    });

    socket.on("phase_change", (newPhase) => {
      setGameState((prev) => ({ ...prev, phase: newPhase }));
    });

    return () => {
      socket.off("system_message");
      socket.off("chat_message");
      socket.off("players_update");
      socket.off("game_state_update");
      socket.off("timer_update");
      socket.off("phase_change");
    };
  }, []);

  const handleJoin = (e, asMod = false) => {
    e.preventDefault();
    if (username.trim() || asMod) {
      const name = asMod ? "Admin/Mod" : username;
      setIsMod(asMod);
      socket.emit("join_game", name); // Optionally send a special mod tag
      setJoined(true);
    }
  };

  if (!joined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 text-center w-full max-w-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>

          <h1 className="text-4xl font-extrabold mb-2 tracking-tight">
            Town of Maron
          </h1>
          <p className="text-gray-400 mb-8 font-medium">
            A Social Deduction Web Client
          </p>

          <form className="space-y-4">
            <input
              type="text"
              placeholder="Enter your username"
              className="w-full p-4 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin(e, false)}
            />
            <button
              type="button"
              onClick={(e) => handleJoin(e, false)}
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-bold tracking-wide transition shadow-lg"
            >
              CONNECT TO LOBBY
            </button>

            <div className="pt-6 border-t border-gray-700 mt-6">
              <button
                type="button"
                onClick={(e) => handleJoin(e, true)}
                className="w-full border border-purple-600 text-purple-400 hover:bg-purple-900 hover:text-purple-100 py-3 rounded-lg font-bold tracking-wide transition"
              >
                JOIN AS MODERATOR
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Inject current full state objects based on views
  if (isMod) {
    return (
      <ModView
        gameState={gameState}
        timeLeft={timeLeft}
        socket={socket}
        messages={messages}
      />
    );
  }

  return (
    <PlayerView
      gameState={gameState}
      timeLeft={timeLeft}
      socket={socket}
      messages={messages}
    />
  );
}

export default App;

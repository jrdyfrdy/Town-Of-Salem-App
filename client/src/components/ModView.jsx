import React from "react";

export default function ModView({ gameState, timeLeft, socket, messages }) {
  const { phase, dayCount, players } = gameState;

  // Handler for dev start
  const handleStart = () => {
    // Basic dev inject. For a real game, this would be customized by the mod
    socket.emit("start_game", [
      "GODFATHER",
      "MAFIOSO",
      "DETECTIVE",
      "DOCTOR",
      "TOWNSPERSON",
    ]);
  };

  return (
    <div className="flex flex-col min-h-screen p-4 md:p-6 bg-gray-950 text-white gap-6">
      {/* HEADER: Mod Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-gray-900 border-2 border-purple-900 p-4 rounded-xl shadow-lg">
        <h1 className="text-2xl font-extrabold text-purple-400 uppercase tracking-widest mb-4 md:mb-0">
          Mod Dashboard
        </h1>

        <div className="text-center">
          <h2 className="text-xl font-bold uppercase text-gray-300">
            {phase.replace("_", " ")} (Day {dayCount})
          </h2>
          <p className="text-4xl font-mono text-blue-400 drop-shadow-md">
            {timeLeft}s
          </p>
        </div>

        <div className="flex gap-3 mt-4 md:mt-0">
          <button
            onClick={() => socket.emit("mod_action", { action: "pause" })}
            className="bg-yellow-600 hover:bg-yellow-500 px-6 py-2 rounded font-bold transition"
          >
            Pause
          </button>
          <button
            onClick={() => socket.emit("mod_action", { action: "skip" })}
            className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-bold transition"
          >
            Skip
          </button>
          {phase !== "LOBBY" && (
            <button
              onClick={() => socket.emit("mod_action", { action: "reset" })}
              className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded font-bold transition"
            >
              Reset Game
            </button>
          )}
          {phase === "LOBBY" && (
            <button
              onClick={handleStart}
              className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded font-bold transition"
            >
              Start Game
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6">
        {/* CENTER: Player Matrix */}
        <div className="md:w-2/3 bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg flex flex-col">
          <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2 text-indigo-300">
            Live Omniscient Matrix
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wider">
                  <th className="p-4 rounded-tl-lg">Player Socket ID</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 rounded-tr-lg">System Checks</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-8 text-center text-gray-600 italic"
                    >
                      No players connected yet.
                    </td>
                  </tr>
                )}
                {players.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition"
                  >
                    <td
                      className="p-4 font-mono text-xs text-gray-500 max-w-[150px] truncate"
                      title={p.id}
                    >
                      {p.id}
                    </td>
                    <td className="p-4 font-bold">{p.username}</td>
                    <td className="p-4 font-semibold text-indigo-400">
                      {p.role || "Unassigned"}
                    </td>
                    <td className="p-4">
                      {p.isAlive ? (
                        <span className="inline-block px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-xs font-bold uppercase">
                          Alive
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 bg-red-900/50 text-red-500 rounded-full text-xs font-bold uppercase">
                          Dead
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs">
                      <span className="text-gray-500">—</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: System & Data Logs */}
        <div className="md:w-1/3 bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg flex flex-col">
          <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2 text-indigo-300">
            Master System Logs
          </h2>
          <div className="flex-1 overflow-y-auto bg-black p-4 rounded border border-gray-800 font-mono text-xs space-y-2 h-[500px]">
            {messages.length === 0 && (
              <span className="text-gray-700">Waiting for events...</span>
            )}
            {messages.map((m, i) => (
              <div key={i} className="text-gray-300 break-words">
                <span className="text-purple-500 mr-2">
                  [{new Date().toLocaleTimeString()}]
                </span>
                {m.type === "system" ? (
                  <span className="text-yellow-500">SYS_EVENT: {m.text}</span>
                ) : (
                  <span>
                    <span className="text-blue-400">{m.sender}</span>: {m.text}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

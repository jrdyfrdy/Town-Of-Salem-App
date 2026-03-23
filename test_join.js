const io = require("socket.io-client");
const p1 = io("http://localhost:3001");

p1.on("connect", () => {
  console.log("p1 connected", p1.id);
  p1.emit("join_game", "tester");
});

p1.on("game_state_update", (state) => {
  console.log("STATE:", state);
  process.exit(0);
});

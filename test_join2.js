const io = require("socket.io-client");
const p1 = io("http://localhost:3001");

p1.on("connect", () => {
  p1.emit("mod_action", { action: "skip" });
  console.log("sent skip");
});

p1.on("system_message", (msg) => console.log("SYS:", msg));
p1.on("game_state_update", (state) => {
  console.log("STATE:", state);
});

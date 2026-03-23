const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const GameEngine = require('./GameEngine');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const game = new GameEngine(io);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_game', (username) => {
    const joined = game.addPlayer(socket.id, username);
    if (joined) {
      io.emit('system_message', `${username} joined the town.`);
      game.broadcastState();
    }
  });

  socket.on('start_game', (roles) => {
    game.startPreGame(roles);
  });

  socket.on('submit_night_action', (targetId) => {
    game.submitNightAction(socket.id, targetId);
  });

  socket.on('submit_day_vote', (targetId) => {
    game.submitDayVote(socket.id, targetId);
  });

  socket.on('chat_message', (text) => {
    game.handleChatMessage(socket.id, text);
  });

  socket.on('mod_action', (data) => {
    game.handleModAction(data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    game.removePlayer(socket.id);
    game.broadcastState();
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`State Engine backend listening on port ${PORT}`);
});

const http = require('http');
const { Server } = require('socket.io');

const port = process.env.PORT || 4000;
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// In-memory room state: { roomId -> { players: [{ socketId, userId, username, move }], timer?: { intervalId, timeoutId, remaining } } }
const rooms = new Map();

const determineResult = (player, cpu) => {
  if (player === cpu) return 'draw';
  if (
    (player === 'rock' && cpu === 'scissors') ||
    (player === 'paper' && cpu === 'rock') ||
    (player === 'scissors' && cpu === 'paper')
  ) {
    return 'win';
  }
  return 'loss';
};

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join', ({ roomId, userId, username }) => {
    socket.join(roomId);
    let room = rooms.get(roomId);
    if (!room) {
      room = { players: [] };
      rooms.set(roomId, room);
    }

    // remove dangling entry for this socket if present
    room.players = room.players.filter((p) => p.socketId !== socket.id && p.userId !== userId);
    room.players.push({ socketId: socket.id, userId, username, move: null });

    const opponent = room.players.find((p) => p.socketId !== socket.id);

    socket.emit('room_joined', { roomId, opponent: opponent ? { id: opponent.userId, username: opponent.username } : null });

    if (room.players.length === 2) {
      // notify both players that room is ready and provide opponent info
      room.players.forEach((p) => {
        const opp = room.players.find((o) => o.socketId !== p.socketId);
        io.to(p.socketId).emit('room_ready', { opponent: opp ? { id: opp.userId, username: opp.username } : null });
      });
    }
  });

  socket.on('move', ({ roomId, userId, move }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    console.log(`move received room=${roomId} user=${userId} move=${move} players=${room.players.map(p=>p.userId).join(',')}`);
    const player = room.players.find((p) => p.userId === userId || p.socketId === socket.id);
    if (!player) return;
    player.move = move;
    // If both players moved, compute results and emit to each
    if (room.players.length >= 2 && room.players.every((p) => p.move)) {
      // clear any existing countdown timers for this room
      if (room.timer) {
        if (room.timer.intervalId) clearInterval(room.timer.intervalId);
        if (room.timer.timeoutId) clearTimeout(room.timer.timeoutId);
        delete room.timer;
        // notify clients to clear countdown UI
        room.players.forEach((p) => io.to(p.socketId).emit('countdown_cancel'));
      }

      const [p1, p2] = room.players;
      const r1 = determineResult(p1.move, p2.move);
      const r2 = determineResult(p2.move, p1.move);

      io.to(p1.socketId).emit('match_result', {
        myMove: p1.move,
        opponentMove: p2.move,
        myResult: r1,
        opponentUsername: p2.username,
        opponentId: p2.userId,
      });

      io.to(p2.socketId).emit('match_result', {
        myMove: p2.move,
        opponentMove: p1.move,
        myResult: r2,
        opponentUsername: p1.username,
        opponentId: p1.userId,
      });

      // reset moves for next round
      room.players.forEach((p) => (p.move = null));
    } else if (room.players.length >= 2) {
      // One player moved but opponent hasn't — start a 3s countdown (if not already started)
      const opponent = room.players.find((p) => p.socketId !== socket.id);
      if (!opponent) return;

      if (!room.timer) {
        let remaining = 3; // seconds

        // send initial countdown to opponent
        console.log(`Starting countdown for room ${roomId}, initiator ${userId}`);
        io.to(opponent.socketId).emit('countdown', { seconds: remaining, initiatorId: userId });

        const intervalId = setInterval(() => {
          remaining -= 1;
          console.log(`Countdown tick for room ${roomId}: ${remaining}`);
          if (remaining > 0) {
            io.to(opponent.socketId).emit('countdown', { seconds: remaining, initiatorId: userId });
          }
        }, 1000);

        const timeoutId = setTimeout(() => {
          console.log(`Countdown expired for room ${roomId}, auto-moving opponent ${opponent.userId}`);
          // time's up: pick a random move for opponent and proceed
          try {
            const moves = ['rock', 'paper', 'scissors'];
            const rand = moves[Math.floor(Math.random() * moves.length)];
            opponent.move = rand;

            // compute results and emit
            if (room.players.length >= 2 && room.players.every((p) => p.move)) {
              const [p1, p2] = room.players;
              const r1 = determineResult(p1.move, p2.move);
              const r2 = determineResult(p2.move, p1.move);

              io.to(p1.socketId).emit('match_result', {
                myMove: p1.move,
                opponentMove: p2.move,
                myResult: r1,
                opponentUsername: p2.username,
                opponentId: p2.userId,
              });

              io.to(p2.socketId).emit('match_result', {
                myMove: p2.move,
                opponentMove: p1.move,
                myResult: r2,
                opponentUsername: p1.username,
                opponentId: p1.userId,
              });
            }
          } finally {
            // cleanup timer and notify clients to clear countdown UI
            if (room.timer) {
              if (room.timer.intervalId) clearInterval(room.timer.intervalId);
              if (room.timer.timeoutId) clearTimeout(room.timer.timeoutId);
              delete room.timer;
              room.players.forEach((p) => io.to(p.socketId).emit('countdown_cancel'));
            }

            // reset moves for next round
            room.players.forEach((p) => (p.move = null));
          }
        }, remaining * 1000 + 100); // slightly over to allow last tick

        room.timer = { intervalId, timeoutId, remaining };
      }
    }
  });

  socket.on('leave', ({ roomId, userId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.players = room.players.filter((p) => p.socketId !== socket.id && p.userId !== userId);
    // clear any countdown timers if present
    if (room.timer) {
      if (room.timer.intervalId) clearInterval(room.timer.intervalId);
      if (room.timer.timeoutId) clearTimeout(room.timer.timeoutId);
      delete room.timer;
      room.players.forEach((p) => io.to(p.socketId).emit('countdown_cancel'));
    }
    if (room.players.length === 1) {
      io.to(room.players[0].socketId).emit('opponent_left');
    } else if (room.players.length === 0) {
      rooms.delete(roomId);
    }
    socket.leave(roomId);
  });

  socket.on('disconnect', () => {
    // remove socket from any room it was part of
    for (const [roomId, room] of rooms) {
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        // clear timers and notify clients
        if (room.timer) {
          if (room.timer.intervalId) clearInterval(room.timer.intervalId);
          if (room.timer.timeoutId) clearTimeout(room.timer.timeoutId);
          delete room.timer;
          room.players.forEach((p) => io.to(p.socketId).emit('countdown_cancel'));
        }
        if (room.players.length === 1) {
          io.to(room.players[0].socketId).emit('opponent_left');
        } else if (room.players.length === 0) {
          rooms.delete(roomId);
        }
      }
    }
  });
});

server.listen(port, () => {
  console.log('Socket.IO server listening on port', port);
});

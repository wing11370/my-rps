const http = require('http');
const { Server } = require('socket.io');

const port = process.env.PORT || 4000;
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// In-memory room state: { roomId -> { players: [{ socketId, userId, username, move }] } }
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
    const player = room.players.find((p) => p.userId === userId || p.socketId === socket.id);
    if (!player) return;
    player.move = move;

    // If both players moved, compute results and emit to each
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

      // reset moves for next round
      room.players.forEach((p) => (p.move = null));
    }
  });

  socket.on('leave', ({ roomId, userId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.players = room.players.filter((p) => p.socketId !== socket.id && p.userId !== userId);
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

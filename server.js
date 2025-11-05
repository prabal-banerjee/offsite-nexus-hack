const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS_PER_ROOM = parseInt(process.env.MAX_PLAYERS) || 20; // Default: 20 players max per room

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Game state management
const gameRooms = new Map();

class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.gameState = {
      level: null,
      wave: 0,
      ducks: [],
      ducksShot: 0,
      ducksMissed: 0,
      totalScore: 0,
      bullets: 0,
      waveStartTime: null,
      paused: false
    };
    this.duckPositions = new Map(); // duckId -> {x, y, alive}
  }

  addPlayer(socketId, playerName) {
    this.players.set(socketId, {
      id: socketId,
      name: playerName || `Player ${this.players.size + 1}`,
      score: 0,
      ducksShot: 0,
      bullets: 0,
      connected: true
    });
    return this.players.get(socketId);
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  updateDuckPosition(duckId, x, y, alive) {
    this.duckPositions.set(duckId, { x, y, alive, timestamp: Date.now() });
  }

  getDuckPositions() {
    return Array.from(this.duckPositions.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }

  broadcastState() {
    return {
      players: Array.from(this.players.values()),
      gameState: this.gameState,
      duckPositions: this.getDuckPositions()
    };
  }
}

// Generate unique room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Default room ID for players who don't specify one
const DEFAULT_ROOM_ID = 'MAIN';

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join-game', ({ roomId, playerName }) => {
    let room = null;
    
    // Use default room if none specified
    if (!roomId) {
      roomId = DEFAULT_ROOM_ID;
    }
    
    if (gameRooms.has(roomId)) {
      room = gameRooms.get(roomId);
      
      // Check if room is full
      if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
        socket.emit('join-error', {
          error: 'Room is full',
          maxPlayers: MAX_PLAYERS_PER_ROOM,
          currentPlayers: room.players.size
        });
        return;
      }
    } else {
      // Create new room
      room = new GameRoom(roomId);
      gameRooms.set(roomId, room);
      console.log(`Created new room: ${roomId}`);
    }

    socket.join(roomId);
    const player = room.addPlayer(socket.id, playerName);
    
    socket.emit('joined-room', {
      roomId,
      playerId: socket.id,
      playerName: player.name,
      gameState: room.broadcastState()
    });

    // Notify other players
    socket.to(roomId).emit('player-joined', {
      playerId: socket.id,
      playerName: player.name
    });

    // Send current game state to new player
    io.to(roomId).emit('game-state-update', room.broadcastState());
    
    console.log(`Player ${player.name} joined room ${roomId}`);
  });

  socket.on('start-game', ({ roomId, level }) => {
    const room = gameRooms.get(roomId);
    if (!room || !room.players.has(socket.id)) {
      console.log(`Player ${socket.id} tried to start game in room ${roomId} but is not in that room`);
      return;
    }

    room.gameState.level = level;
    room.gameState.wave = 0;
    room.gameState.ducksShot = 0;
    room.gameState.ducksMissed = 0;
    room.gameState.totalScore = 0;
    room.gameState.paused = false;
    
    // Reset all players
    room.players.forEach(player => {
      player.score = 0;
      player.ducksShot = 0;
      player.bullets = level.bullets;
    });

    console.log(`Game started in room ${roomId} by player ${socket.id}`);
    io.to(roomId).emit('game-started', {
      level,
      players: Array.from(room.players.values())
    });
  });

  socket.on('start-wave', ({ roomId, ducks, bullets }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    room.gameState.wave += 1;
    room.gameState.ducks = ducks;
    room.gameState.bullets = bullets;
    room.gameState.waveStartTime = Date.now();
    room.duckPositions.clear();
    const seed = room.gameState.waveStartTime & 0xffffffff;

    // Reset player bullets
    room.players.forEach(player => {
      player.bullets = bullets;
    });

    io.to(roomId).emit('wave-started', {
      wave: room.gameState.wave,
      ducks,
      bullets,
      waveStartTime: room.gameState.waveStartTime,
      seed
    });
  });

  // Disabled: no need to sync positions when using deterministic simulation
  // socket.on('duck-position', ...) removed to reduce network chatter

  socket.on('shot-fired', ({ roomId, clickPoint, radius }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    if (!player || player.bullets <= 0) return;

    player.bullets -= 1;
    room.gameState.bullets = Math.min(...Array.from(room.players.values()).map(p => p.bullets));

    // Broadcast shot to all players
    io.to(roomId).emit('shot-fired', {
      playerId: socket.id,
      playerName: player.name,
      clickPoint,
      radius
    });
  });

  socket.on('ducks-hit', ({ roomId, ducksHit, points }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    if (!player) return;

    player.ducksShot += ducksHit;
    player.score += points;
    room.gameState.ducksShot += ducksHit;
    room.gameState.totalScore += points;

    io.to(roomId).emit('score-update', {
      players: Array.from(room.players.values()),
      gameState: room.gameState
    });
  });

  socket.on('duck-shot', ({ roomId, duckId }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    const duck = room.duckPositions.get(duckId);
    if (duck) {
      duck.alive = false;
    }

    io.to(roomId).emit('duck-shot', { duckId });
  });

  socket.on('end-wave', ({ roomId }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    io.to(roomId).emit('wave-ended');
  });

  socket.on('end-level', ({ roomId }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    io.to(roomId).emit('level-ended', {
      players: Array.from(room.players.values()),
      gameState: room.gameState
    });
  });

  socket.on('pause-game', ({ roomId, paused }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    room.gameState.paused = paused;
    socket.to(roomId).emit('game-paused', { paused });
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Find and remove player from room
    for (const [roomId, room] of gameRooms.entries()) {
      if (room.players.has(socket.id)) {
        room.removePlayer(socket.id);
        socket.to(roomId).emit('player-left', { playerId: socket.id });
        
        // Clean up empty rooms after 5 minutes
        if (room.players.size === 0) {
          setTimeout(() => {
            if (room.players.size === 0) {
              gameRooms.delete(roomId);
              console.log(`Cleaned up empty room ${roomId}`);
            }
          }, 300000); // 5 minutes
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Multiplayer Duck Hunt server running on http://localhost:${PORT}`);
  console.log(`Players on the same network can connect using your IP address`);
});


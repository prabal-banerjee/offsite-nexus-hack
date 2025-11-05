// socket.io-client will be available globally via CDN
const io = typeof window !== 'undefined' && window.io ? window.io : null;

class Multiplayer {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.roomId = null;
    this.playerId = null;
    this.playerName = null;
    this.players = [];
    this.onGameStateUpdate = null;
    this.onShotFired = null;
    this.onDuckPositionUpdate = null;
    this.onDuckShot = null;
    this.onScoreUpdate = null;
    this.onWaveStarted = null;
    this.onWaveEnded = null;
    this.onLevelEnded = null;
    this.onGameStarted = null;
    this.onGamePaused = null;
  }

  connect(serverUrl = 'http://localhost:3000', playerName = null) {
    return new Promise((resolve, reject) => {
      if (!io) {
        reject(new Error('Socket.IO not loaded. Make sure socket.io.js is included in the page.'));
        return;
      }
      
      // Add timeout for connection
      const timeout = setTimeout(() => {
        if (!this.connected) {
          this.socket && this.socket.disconnect();
          reject(new Error('Connection timeout. Server may be unreachable.'));
        }
      }, 5000); // 5 second timeout
      
      this.socket = io(serverUrl, {
        transports: ['websocket'],
        timeout: 5000,
        reconnection: false
      });

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('Connected to multiplayer server');
        this.connected = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.error('Connection error:', error);
        this.connected = false;
        reject(error);
      });

      this.socket.on('joined-room', (data) => {
        this.roomId = data.roomId;
        this.playerId = data.playerId;
        this.playerName = data.playerName;
        this.players = data.gameState.players || [];
        console.log(`Joined room ${this.roomId} as ${this.playerName}`);
        console.log(`Players in room: ${this.players.length}`);
        if (this.onGameStateUpdate) {
          this.onGameStateUpdate({ players: this.players });
        }
      });

      this.socket.on('join-error', (data) => {
        console.error('Failed to join room:', data.error);
        reject(new Error(data.error));
      });

      this.socket.on('player-joined', (data) => {
        console.log(`Player ${data.playerName} joined`);
      });

      this.socket.on('player-left', (data) => {
        console.log(`Player ${data.playerId} left`);
        this.players = this.players.filter(p => p.id !== data.playerId);
      });

      this.socket.on('game-state-update', (state) => {
        this.players = state.players || [];
        if (this.onGameStateUpdate) {
          this.onGameStateUpdate(state);
        }
      });

      this.socket.on('game-started', (data) => {
        this.players = data.players || [];
        if (this.onGameStarted) {
          this.onGameStarted(data);
        }
      });

      this.socket.on('wave-started', (data) => {
        if (this.onWaveStarted) {
          this.onWaveStarted(data);
        }
      });

      this.socket.on('wave-ended', () => {
        if (this.onWaveEnded) {
          this.onWaveEnded();
        }
      });

      this.socket.on('level-ended', (data) => {
        if (this.onLevelEnded) {
          this.onLevelEnded(data);
        }
      });

      this.socket.on('shot-fired', (data) => {
        if (this.onShotFired && data.playerId !== this.playerId) {
          this.onShotFired(data);
        }
      });

      this.socket.on('duck-position-update', (data) => {
        if (this.onDuckPositionUpdate) {
          this.onDuckPositionUpdate(data);
        }
      });

      this.socket.on('duck-shot', (data) => {
        if (this.onDuckShot) {
          this.onDuckShot(data);
        }
      });

      this.socket.on('score-update', (data) => {
        this.players = data.players || [];
        if (this.onScoreUpdate) {
          this.onScoreUpdate(data);
        }
      });

      this.socket.on('game-paused', (data) => {
        if (this.onGamePaused) {
          this.onGamePaused(data);
        }
      });
    });
  }

  joinGame(roomId = null, playerName = null) {
    if (!this.socket || !this.connected) {
      throw new Error('Not connected to server');
    }
    this.socket.emit('join-game', { roomId, playerName: playerName || `Player ${Date.now()}` });
  }

  startGame(level) {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('start-game', { roomId: this.roomId, level });
  }

  startWave(ducks, bullets) {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('start-wave', { roomId: this.roomId, ducks, bullets });
  }

  updateDuckPosition(duckId, x, y, alive) {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('duck-position', { roomId: this.roomId, duckId, x, y, alive });
  }

  fireShot(clickPoint, radius) {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('shot-fired', { roomId: this.roomId, clickPoint, radius });
  }

  reportDucksHit(ducksHit, points) {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('ducks-hit', { roomId: this.roomId, ducksHit, points });
  }

  reportDuckShot(duckId) {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('duck-shot', { roomId: this.roomId, duckId });
  }

  endWave() {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('end-wave', { roomId: this.roomId });
  }

  endLevel() {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('end-level', { roomId: this.roomId });
  }

  pauseGame(paused) {
    if (!this.socket || !this.roomId) return;
    this.socket.emit('pause-game', { roomId: this.roomId, paused });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      this.socket = null;
    }
  }

  isConnected() {
    return this.connected && this.socket !== null;
  }

  getCurrentPlayer() {
    return this.players.find(p => p.id === this.playerId);
  }

  getOtherPlayers() {
    return this.players.filter(p => p.id !== this.playerId);
  }
}

export default Multiplayer;


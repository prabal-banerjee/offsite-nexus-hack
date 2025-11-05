import Game from './src/modules/Game';

document.addEventListener('DOMContentLoaded', function() {
  // Check URL parameters for multiplayer settings
  const urlParams = new URLSearchParams(window.location.search);
  const multiplayerEnabled = urlParams.get('multiplayer') === 'true' || urlParams.get('multiplayer') === '1';
  const roomId = urlParams.get('room') || null;
  let playerName = urlParams.get('name') || null;
  const serverUrl = urlParams.get('server') || 'http://localhost:3000';

  // Get local IP address for easier sharing
  let gameServerUrl = serverUrl;
  if (serverUrl === 'http://localhost:3000') {
    // If we're not on localhost, use the current page origin (works for ngrok/lt)
    const { hostname, origin } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      gameServerUrl = origin; // e.g., https://<id>.ngrok-free.app
    }
  }

  let game = new Game({
    spritesheet: 'sprites.json',
    multiplayer: multiplayerEnabled,
    roomId: roomId,
    playerName: playerName,
    serverUrl: gameServerUrl,
    hideBullets: true
  }).load();

  // If multiplayer and no name provided, prompt once after load kickoff
  if (multiplayerEnabled && !playerName) {
    setTimeout(() => {
      const entered = window.prompt('Enter your player name:', 'Player');
      if (entered) {
        // Reload with name param so both HUD and server receive it consistently
        const params = new URLSearchParams(window.location.search);
        params.set('name', entered);
        window.location.search = params.toString();
      }
    }, 0);
  }

}, false);

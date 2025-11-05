# Multiplayer Duck Hunt Setup Guide

## Overview
This guide explains how to set up and play Duck Hunt in multiplayer mode with other users on the same WiFi network.

## Prerequisites
- Node.js installed
- All players on the same WiFi network

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the game:
```bash
npm run build
```

## Running the Server

1. Start the multiplayer server:
```bash
npm run server
```

The server will start on port 3000 by default. You'll see:
```
Multiplayer Duck Hunt server running on http://localhost:3000
Players on the same network can connect using your IP address
```

2. Find your local IP address:
   - **Linux/Mac**: Run `ifconfig` or `ip addr` and look for your WiFi interface (usually `wlan0` or similar)
   - **Windows**: Run `ipconfig` and look for "IPv4 Address" under your WiFi adapter

   Example: If your IP is `192.168.1.100`, the server URL would be `http://192.168.1.100:3000`

## Playing Multiplayer

### Option 1: Create a New Room
1. Open your browser and go to: `http://YOUR_IP:3000?multiplayer=true`
2. Share the same URL with other players on your network
3. All players will automatically join the same room

### Option 2: Join an Existing Room
1. First player creates a room and gets a room ID (check browser console)
2. Other players can join by going to: `http://YOUR_IP:3000?multiplayer=true&room=ROOM_ID`

### Option 3: Custom Player Name
Add a name parameter: `http://YOUR_IP:3000?multiplayer=true&name=Player1`

## URL Parameters

- `multiplayer=true` - Enables multiplayer mode
- `room=ROOM_ID` - Join a specific room (optional)
- `name=PlayerName` - Set your player name (optional)
- `server=http://IP:PORT` - Custom server URL (defaults to localhost:3000)

## How It Works

- **Shared Game State**: All players see the same ducks and game progression
- **Individual Scores**: Each player has their own score displayed
- **Synchronized Shots**: When any player shoots, all players see the result
- **Real-time Updates**: Player scores and duck positions sync in real-time

## Troubleshooting

1. **Can't connect to server**
   - Make sure the server is running (`npm run server`)
   - Check firewall settings - port 3000 must be accessible
   - Verify all players are on the same WiFi network

2. **Players not seeing each other**
   - Check browser console for connection errors
   - Verify room ID is correct (if using specific room)
   - Refresh the page

3. **Ducks not syncing**
   - Check network connection
   - Verify server is running and accessible
   - Try refreshing the page

## Single Player Mode

To play in single-player mode (original behavior), simply don't include the `multiplayer=true` parameter:
```
http://YOUR_IP:3000
```

## Development

For development with hot-reload:
```bash
npm start  # Runs webpack-dev-server on port 8080
npm run server  # In another terminal, runs multiplayer server on port 3000
```

Then access via: `http://localhost:8080?multiplayer=true&server=http://localhost:3000`


# Making Duck Hunt Accessible from Any Network

To allow players from different networks/subnets to access your game, you have several options:

## Option 1: LocalTunnel (Easiest - Free, No Signup)

### Step 1: Install LocalTunnel
```bash
npm install --save-dev localtunnel
```

### Step 2: Start your server
```bash
PORT=3000 npm run server
```

### Step 3: In a NEW terminal, start the tunnel
```bash
npm run tunnel
```

This will give you a public URL like: `https://random-name.loca.lt`

### Step 4: Share the tunnel URL
Players can access the game at:
```
https://your-tunnel-url.loca.lt?multiplayer=true
```

**Note:** The URL changes each time you restart the tunnel unless you use `--subdomain`:
```bash
npx localtunnel --port 3000 --subdomain duckhunt
```

## Option 2: ngrok (More Reliable, Requires Signup)

### Step 1: Sign up at https://ngrok.com (free)

### Step 2: Install ngrok
Download from https://ngrok.com/download or:
```bash
# Linux
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
```

### Step 3: Authenticate (after signup)
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Step 4: Start your server
```bash
PORT=3000 npm run server
```

### Step 5: Start ngrok tunnel
```bash
ngrok http 3000
```

This gives you a public URL like: `https://abc123.ngrok-free.app`

### Step 6: Share the URL
Players access: `https://your-ngrok-url.ngrok-free.app?multiplayer=true`

**Advantage:** ngrok URLs are more stable and you can reserve a domain.

## Option 3: Deploy to Cloud (Permanent Solution)

### Option 3a: Heroku
```bash
# Install Heroku CLI
# Create Procfile: web: node server.js
# Deploy: heroku create && git push heroku master
```

### Option 3b: Railway / Render / Fly.io
- Upload your code
- Set environment variables
- Deploy automatically

### Option 3c: VPS (DigitalOcean, AWS, etc.)
- Set up a server
- Install Node.js
- Run: `PORT=3000 npm run server`
- Configure firewall to allow port 3000

## Option 4: Port Forwarding (If you control the router)

1. Access your router admin panel (usually 192.168.1.1)
2. Find "Port Forwarding" settings
3. Forward external port 3000 to your laptop's IP (10.100.0.154) port 3000
4. Find your public IP: `curl ifconfig.me`
5. Share: `http://YOUR_PUBLIC_IP:3000?multiplayer=true`

**Note:** This requires your router to support port forwarding and you need to know your public IP.

## Quick Start (Recommended: LocalTunnel)

```bash
# Terminal 1: Start server
PORT=3000 npm run server

# Terminal 2: Start tunnel
npm run tunnel
# Copy the URL it gives you (e.g., https://random-name.loca.lt)

# Share this URL with players:
# https://random-name.loca.lt?multiplayer=true
```

## Important Notes

- **Tunnel URLs are temporary** - they change when you restart (unless using subdomain)
- **Both server AND tunnel must be running** for it to work
- **LocalTunnel is free** but may have rate limits
- **ngrok free tier** has session limits but is more reliable
- **For production**, consider deploying to a cloud service

## Troubleshooting

- **"Connection refused"**: Make sure your server is running on port 3000
- **"Tunnel closed"**: Restart the tunnel
- **"404 Not Found"**: Make sure you're accessing the tunnel URL, not localhost
- **Players can't connect**: Check firewall settings and ensure tunnel is active


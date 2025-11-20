# Kulturrevolution - Social Deduction Game

A local, QR-code-based social deduction game where all players are secretly "Comrades" with hidden tasks to complete.

## Features

- **Local Server**: Runs completely offline on your Mac/local network
- **QR Code Access**: Players join by scanning a QR code
- **Real-time Communication**: Uses WebSockets for instant updates
- **Admin Dashboard**: Full control over game flow and player management
- **Secret Tasks**: Each player receives a unique secret task

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Server

1. Start the server:
```bash
npm start
```

2. The server will display the local IP addresses where it's accessible:
```
Kulturrevolution Game Server Running!
========================================

Server accessible at:
  Local: http://localhost:3000
  Network: http://192.168.x.x:3000

  QR Code URL: http://192.168.x.x:3000/join

  Admin Panel: http://localhost:3000/admin
```

3. Generate a QR code for the `/join` URL and share it with players

## How to Play

### For Players:
1. Scan the QR code
2. You'll be assigned the role "Comrade"
3. Wait for your secret task
4. Complete your task without revealing it to others
5. Try to figure out what others are trying to do

### For Game Master (Admin):
1. Open the admin panel at `http://localhost:3000/admin`
2. Wait for players to join
3. Click "Start Game" when ready
4. Click "Assign Random Tasks to All" to give everyone their secret missions
5. Monitor players and control the game flow
6. Use "Force Voting Phase" when it's time to vote
7. Eliminate players as needed
8. Reset the game when finished

## Admin Controls

- **Start Game**: Begins the game session
- **Assign Random Tasks**: Gives each alive player a random secret task
- **Force Voting Phase**: Broadcasts voting announcement to all players
- **Reveal Voting Results**: Announce voting results
- **Kill Player**: Eliminate a specific player
- **Reset Game**: Clear all players and start fresh
- **Broadcast Message**: Send custom message to all players

## Game Tasks

Players may receive tasks like:
- Touch your nose three times during the discussion
- Convince the group that whoever touches their nose three times is an enemy
- Stay silent for 60 seconds
- Ask three people why they look nervous
- Look at the ceiling three times
- And more...

## Technical Details

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: HTML + JavaScript + CSS
- **No Database**: All data stored in memory (RAM)
- **Port**: 3000 (configurable in server.js)

## Troubleshooting

- Make sure port 3000 is not already in use
- Ensure your firewall allows connections on port 3000
- Players must be on the same network as the server
- Use the network IP address (not localhost) for player connections

## Project Structure

```
CommunismRoleServer/
├── server.js          # Main server file
├── tasks.js           # Secret tasks array
├── package.json       # Dependencies
├── README.md          # This file
├── todo.md           # Project specifications
└── public/
    ├── role.html      # Player interface
    ├── admin.html     # Admin dashboard
    └── style.css      # Styling
```

## License

MIT

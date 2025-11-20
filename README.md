# Kulturrevolution - Social Deduction Game

A local, QR-code-based social deduction game where all players are secretly "Comrades" with hidden tasks to complete.

## Features

- **Local Server**: Runs completely offline on your Mac/local network
- **QR Code Access**: Players join by scanning a QR code and entering their name
- **Real-time Communication**: Uses WebSockets for instant updates
- **Hunter/Hunted Task System**: Paired tasks where one player performs a behavior and another must identify it
- **Admin Dashboard**: Full control over game flow and player management
- **Modern UI**: Smooth animations, gradients, and responsive design
- **Player Names**: Track players by their names throughout the game

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
2. Enter your name to join the game
3. You'll be assigned the role "Comrade"
4. Wait for the admin to assign tasks
5. You'll receive one of two task types:
   - **🎯 HUNTER**: Identify someone performing a specific behavior
   - **🎭 TARGET**: Perform a specific behavior without being caught
6. Complete your task without revealing it to others
7. During voting, discuss and vote to eliminate suspicious players

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

The game features **paired hunter/hunted tasks**. For each pair:
- One player (TARGET) must perform a behavior
- Another player (HUNTER) must identify who's performing that behavior

### Example Task Pairs:

**TARGET Task**: "Touch your nose three times during the discussion."
**HUNTER Task**: "Identify the person who touches their nose three times. They are the counter-revolutionary!"

**TARGET Task**: "Stay completely silent for 60 seconds straight."
**HUNTER Task**: "Identify who stays silent for 60 seconds. They are the enemy!"

**TARGET Task**: "Cross your arms and keep them crossed for 90 seconds."
**HUNTER Task**: "Find the person who keeps their arms crossed for a long time. They are hiding something!"

The game includes 12 different task pairs with various behaviors to identify!

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
├── server.js          # Main server file with paired task logic
├── tasks.js           # Hunter/hunted task pairs
├── package.json       # Dependencies
├── README.md          # This file
├── todo.md           # Project specifications
└── public/
    ├── join.html      # Player name registration
    ├── role.html      # Player interface with task display
    ├── admin.html     # Admin dashboard
    └── style.css      # Modern animated styling
```

## License

MIT

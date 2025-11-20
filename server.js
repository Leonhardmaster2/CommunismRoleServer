const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const taskPairs = require('./tasks');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

// Player management
const players = {};
let gameStarted = false;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Generate random player ID
function generatePlayerID() {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

// Assign paired tasks to players
function assignPairedTasks() {
  const alivePlayers = Object.values(players).filter(p => p.alive);

  if (alivePlayers.length < 2) {
    console.log('Not enough players for paired tasks (need at least 2)');
    return;
  }

  // Clear existing tasks
  alivePlayers.forEach(p => p.task = null);

  // Shuffle players
  const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);

  // Assign tasks in pairs
  let pairIndex = 0;
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const taskPair = taskPairs[pairIndex % taskPairs.length];

    // First player is the "hunted" (performs behavior)
    shuffled[i].task = taskPair.hunted;
    shuffled[i].taskType = 'hunted';

    // Second player is the "hunter" (identifies behavior)
    shuffled[i + 1].task = taskPair.hunter;
    shuffled[i + 1].taskType = 'hunter';

    // Send tasks via socket
    if (shuffled[i].socket) {
      io.to(shuffled[i].socket).emit('newTask', { task: taskPair.hunted, type: 'hunted' });
    }
    if (shuffled[i + 1].socket) {
      io.to(shuffled[i + 1].socket).emit('newTask', { task: taskPair.hunter, type: 'hunter' });
    }

    pairIndex++;
  }

  // If odd number of players, give the last one a random hunted task
  if (shuffled.length % 2 !== 0) {
    const lastPlayer = shuffled[shuffled.length - 1];
    const randomPair = taskPairs[Math.floor(Math.random() * taskPairs.length)];
    lastPlayer.task = randomPair.hunted;
    lastPlayer.taskType = 'hunted';

    if (lastPlayer.socket) {
      io.to(lastPlayer.socket).emit('newTask', { task: randomPair.hunted, type: 'hunted' });
    }
  }

  console.log(`Paired tasks assigned to ${alivePlayers.length} players`);
}

// Routes
app.get('/join', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'join.html'));
});

app.post('/api/join', (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.json({ success: false, error: 'Name is required' });
  }

  const playerID = generatePlayerID();

  // Initialize player
  players[playerID] = {
    id: playerID,
    name: name.trim(),
    alive: true,
    connected: false,
    socket: null,
    task: null,
    taskType: null
  };

  console.log(`New player joined: ${name} (${playerID})`);

  // Notify admin of new player
  io.emit('playerListUpdate', getPlayerList());

  res.json({ success: true, playerID });
});

app.get('/role/:id', (req, res) => {
  const playerID = req.params.id;

  if (!players[playerID]) {
    return res.status(404).send('Player not found. Please scan the QR code again.');
  }

  res.sendFile(path.join(__dirname, 'public', 'role.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Register player
  socket.on('register', (playerID) => {
    if (players[playerID]) {
      players[playerID].socket = socket.id;
      players[playerID].connected = true;
      socket.playerID = playerID;

      console.log(`Player ${players[playerID].name} (${playerID}) registered with socket ${socket.id}`);

      // Send player their name
      socket.emit('playerInfo', { name: players[playerID].name });

      // Send task if already assigned
      if (players[playerID].task) {
        socket.emit('newTask', {
          task: players[playerID].task,
          type: players[playerID].taskType
        });
      }

      // Notify admin about player list update
      io.emit('playerListUpdate', getPlayerList());
    }
  });

  // Register admin
  socket.on('registerAdmin', () => {
    socket.isAdmin = true;
    console.log('Admin connected');

    // Send current player list
    socket.emit('playerListUpdate', getPlayerList());
  });

  // Admin commands
  socket.on('startGame', () => {
    if (!socket.isAdmin) return;

    gameStarted = true;
    console.log('Game started');
    broadcast('The game has started! Complete your secret task.');
  });

  socket.on('assignRandomTasks', () => {
    if (!socket.isAdmin) return;

    assignPairedTasks();
    broadcast('New tasks have been assigned!');
    io.emit('playerListUpdate', getPlayerList());
  });

  socket.on('forceVoting', () => {
    if (!socket.isAdmin) return;

    broadcast('VOTING PHASE: Discuss and vote who to eliminate!');
    console.log('Voting phase started');
  });

  socket.on('revealResults', (message) => {
    if (!socket.isAdmin) return;

    broadcast(message || 'Voting results revealed!');
    console.log('Voting results revealed');
  });

  socket.on('killPlayer', (playerID) => {
    if (!socket.isAdmin) return;

    kill(playerID);
  });

  socket.on('resetGame', () => {
    if (!socket.isAdmin) return;

    resetGame();
  });

  socket.on('broadcastMessage', (message) => {
    if (!socket.isAdmin) return;

    broadcast(message);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    if (socket.playerID && players[socket.playerID]) {
      players[socket.playerID].connected = false;
      io.emit('playerListUpdate', getPlayerList());
    }
  });
});

// Server commands
function sendRole(playerID, text) {
  const player = players[playerID];
  if (player && player.socket) {
    player.task = text;
    io.to(player.socket).emit('newTask', text);
    console.log(`Task sent to ${playerID}: ${text}`);
  }
}

function broadcast(text) {
  io.emit('systemMessage', text);
  console.log(`Broadcast: ${text}`);
}

function kill(playerID) {
  const player = players[playerID];
  if (player) {
    player.alive = false;

    if (player.socket) {
      io.to(player.socket).emit('dead');
    }

    console.log(`Player ${playerID} has been eliminated`);
    broadcast(`A player has been eliminated!`);
    io.emit('playerListUpdate', getPlayerList());
  }
}

function resetGame() {
  // Clear all players
  Object.keys(players).forEach(playerID => {
    const player = players[playerID];
    if (player.socket) {
      io.to(player.socket).emit('gameReset');
    }
  });

  // Clear player data
  Object.keys(players).forEach(key => delete players[key]);

  gameStarted = false;

  console.log('Game reset');
  broadcast('Game has been reset!');
  io.emit('playerListUpdate', []);
}

function getPlayerList() {
  return Object.keys(players).map(playerID => {
    const player = players[playerID];
    return {
      id: playerID,
      name: player.name,
      alive: player.alive,
      connected: player.connected,
      hasTask: !!player.task,
      taskType: player.taskType
    };
  });
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();

  console.log('\n========================================');
  console.log('Kulturrevolution Game Server Running!');
  console.log('========================================\n');

  console.log('Server accessible at:');
  console.log(`  Local: http://localhost:${PORT}`);

  // Display all network interfaces
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`  Network: http://${iface.address}:${PORT}`);
        console.log(`\n  QR Code URL: http://${iface.address}:${PORT}/join`);
      }
    });
  });

  console.log(`\n  Admin Panel: http://localhost:${PORT}/admin`);
  console.log('\n========================================\n');
});

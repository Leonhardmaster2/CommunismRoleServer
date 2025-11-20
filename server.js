const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const tasks = require('./tasks');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

// Player management
const players = {};
let gameStarted = false;

// Serve static files
app.use(express.static('public'));

// Generate random player ID
function generatePlayerID() {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

// Get random task
function getRandomTask() {
  return tasks[Math.floor(Math.random() * tasks.length)];
}

// Routes
app.get('/join', (req, res) => {
  const playerID = generatePlayerID();

  // Initialize player
  players[playerID] = {
    id: playerID,
    alive: true,
    connected: false,
    socket: null,
    task: null
  };

  console.log(`New player joined: ${playerID}`);

  // Redirect to role page
  res.redirect(`/role/${playerID}`);
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

      console.log(`Player ${playerID} registered with socket ${socket.id}`);

      // Send task if already assigned
      if (players[playerID].task) {
        socket.emit('newTask', players[playerID].task);
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

    Object.keys(players).forEach(playerID => {
      const player = players[playerID];
      if (player.alive) {
        const task = getRandomTask();
        player.task = task;

        if (player.socket) {
          io.to(player.socket).emit('newTask', task);
        }
      }
    });

    console.log('Random tasks assigned to all players');
    broadcast('New tasks have been assigned!');
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
      alive: player.alive,
      connected: player.connected,
      hasTask: !!player.task
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

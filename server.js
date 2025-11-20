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
let currentVotes = {}; // { voterID: targetID }
let suspicionLevels = {}; // { playerID: suspicionScore }

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Generate random player ID
function generatePlayerID() {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

// Assign single hunter and single target
function assignRoles() {
  const alivePlayers = Object.values(players).filter(p => p.alive);

  if (alivePlayers.length < 3) {
    console.log('Not enough players (need at least 3)');
    return;
  }

  // Clear existing tasks and reset roles
  alivePlayers.forEach(p => {
    p.task = null;
    p.taskType = 'comrade';
    p.isImposter = false;
  });

  // Reset votes and suspicion
  currentVotes = {};
  suspicionLevels = {};
  alivePlayers.forEach(p => {
    suspicionLevels[p.id] = 0;
  });

  // Shuffle players
  const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);

  // Pick random task pair
  const taskPair = taskPairs[Math.floor(Math.random() * taskPairs.length)];

  // First player is the TARGET (imposter who performs behavior)
  const target = shuffled[0];
  target.task = taskPair.hunted;
  target.taskType = 'target';
  target.isImposter = true;

  // Second player is the HUNTER (detective who identifies behavior)
  const hunter = shuffled[1];
  hunter.task = taskPair.hunter;
  hunter.taskType = 'hunter';

  // Everyone else is a regular comrade
  for (let i = 2; i < shuffled.length; i++) {
    shuffled[i].task = 'Observe carefully and vote out suspicious players. Work together to find the imposter!';
    shuffled[i].taskType = 'comrade';
  }

  // Send tasks via socket
  if (target.socket) {
    io.to(target.socket).emit('newTask', {
      task: taskPair.hunted,
      type: 'target',
      role: 'IMPOSTER'
    });
  }

  if (hunter.socket) {
    io.to(hunter.socket).emit('newTask', {
      task: taskPair.hunter,
      type: 'hunter',
      role: 'DETECTIVE'
    });
  }

  // Send comrade tasks
  for (let i = 2; i < shuffled.length; i++) {
    if (shuffled[i].socket) {
      io.to(shuffled[i].socket).emit('newTask', {
        task: shuffled[i].task,
        type: 'comrade',
        role: 'COMRADE'
      });
    }
  }

  console.log(`Roles assigned: Target=${target.name}, Hunter=${hunter.name}, ${shuffled.length - 2} Comrades`);

  // Broadcast suspicion levels
  io.emit('suspicionUpdate', getSuspicionData());
}

// Get suspicion data for chart (exponential scaling)
function getSuspicionData() {
  const alivePlayers = Object.values(players).filter(p => p.alive);

  return alivePlayers.map(player => {
    const votes = Object.values(currentVotes).filter(targetID => targetID === player.id).length;
    // Exponential scaling: score = votes^2 to make differences more dramatic
    const score = Math.pow(votes, 2);
    suspicionLevels[player.id] = score;

    return {
      id: player.id,
      name: player.name,
      votes: votes,
      suspicion: score
    };
  }).sort((a, b) => b.suspicion - a.suspicion);
}

// Calculate vote results
function getVoteResults() {
  const voteCounts = {};
  const alivePlayers = Object.values(players).filter(p => p.alive);

  // Initialize all alive players with 0 votes
  alivePlayers.forEach(p => {
    voteCounts[p.id] = 0;
  });

  // Count votes
  Object.values(currentVotes).forEach(targetID => {
    if (voteCounts[targetID] !== undefined) {
      voteCounts[targetID]++;
    }
  });

  // Find player(s) with most votes
  const maxVotes = Math.max(...Object.values(voteCounts));
  const topVoted = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);

  return {
    voteCounts,
    maxVotes,
    topVoted: topVoted.map(id => players[id])
  };
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
    taskType: 'comrade',
    isImposter: false,
    revealedRole: null // Set when eliminated
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

    assignRoles();
    broadcast('Roles have been assigned! The game begins now.');
    io.emit('playerListUpdate', getPlayerList());
  });

  // Player voting
  socket.on('castVote', (targetID) => {
    if (!socket.playerID || !players[socket.playerID]) return;

    const voter = players[socket.playerID];
    if (!voter.alive) return;

    // Record vote
    currentVotes[voter.id] = targetID;
    console.log(`${voter.name} voted for ${players[targetID]?.name || 'unknown'}`);

    // Update and broadcast suspicion levels
    const suspicionData = getSuspicionData();
    io.emit('suspicionUpdate', suspicionData);

    // Confirm vote to player
    socket.emit('voteConfirmed', {
      target: players[targetID]?.name,
      targetID: targetID
    });
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
    // Always reveal as IMPOSTER when killed (to make it look like they were caught)
    player.revealedRole = 'IMPOSTER';

    if (player.socket) {
      io.to(player.socket).emit('dead', {
        revealedRole: 'IMPOSTER',
        wasActualImposter: player.isImposter
      });
    }

    console.log(`Player ${player.name} has been eliminated (revealed as IMPOSTER)`);
    broadcast(`${player.name} has been eliminated and revealed as the IMPOSTER!`);
    io.emit('playerListUpdate', getPlayerList());

    // Clear their vote
    delete currentVotes[playerID];
    io.emit('suspicionUpdate', getSuspicionData());
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

  // Clear votes and suspicion
  currentVotes = {};
  suspicionLevels = {};

  gameStarted = false;

  console.log('Game reset');
  broadcast('Game has been reset!');
  io.emit('playerListUpdate', []);
  io.emit('suspicionUpdate', []);
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
      taskType: player.taskType,
      revealedRole: player.revealedRole,
      isImposter: player.isImposter // Only for admin view
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

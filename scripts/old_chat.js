let peer;

document.addEventListener('DOMContentLoaded', () => {
  peer = new Peer({
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    key: 'peerjs',
  });

  peer.on('open', (id) => {
    console.log('My peer ID is: ' + id);
    registerForChat();
  });

  // On the remote peer's side
  peer.on('connection', (connection) => {
    console.log('Incoming connection from:', connection.peer);
    conn = connection;

    conn.on('open', () => {
      console.log('Connection opened with:', connection.peer);
    });

    conn.on('data', (data) => {
      console.log('Received data:', data);
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  });

  peer.on('reconnect', () => {
    console.log('Reconnected to PeerJS server');
    peer.on('open', (id) => {
      console.log('New peer ID after reconnection:', id);
      registerForChat();
    });
  });

  peer.on('disconnected', () => {
    console.log('Peer disconnected');
    // removePeerIdFromDatabase(peer.id);
  });
});

let remotePeerId = '';
let conn;

// Register on Firebase
function registerForChat(username) {
  const username = document.getElementById('userName').value.trim();
  if (!username) {
    console.error('Error: Username cannot be empty');
    return;
  }
  console.log('Registering ' + username);

  const playerData = {
    uniqueCode: peer.id,
    skillLevel: 'beginner',
    languages: ['English', 'Spanish'],
    lastLoggedIn: new Date().toISOString(),
  };

  const playersRef = database.ref('players/' + username); // Reference to the 'players' node

  // Check if the username already exists
  // playersRef.once('value', (snapshot) => {
  //   if (snapshot.exists()) {
  //     console.error('Error: Username already taken.');
  //   } else {
  //     playersRef
  //       .set(playerData)
  //       .then(() => console.log('Player registered successfully'))
  //       .catch((err) => console.error('Error registering player:', err));
  //   }
  // });

  playersRef
    .set(playerData)
    .then(() => console.log('Player registered successfully'))
    .catch((err) => console.error('Error registering player:', err));
}

function fetchPlayers() {
  const playersRef = database.ref('players');

  playersRef.on('value', (snapshot) => {
    const players = snapshot.val(); // Get all players as an object
    console.log('Players:', players);
  });
}

function fetchPlayer(remoteName) {
  const playerRef = database.ref('players/' + remoteName);

  playerRef
    .once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        remotePeerId = snapshot.val().uniqueCode;
        console.log(remoteName + ' PeerJS code:', remotePeerId);
      } else {
        console.log('No player found with that username.');
      }
    })
    .catch((err) => console.error('Error fetching player data:', err));
}

function connectToPlayer() {
  const playerRef = database.ref('players/' + remoteName);

  playerRef
    .once('value')
    .then((snapshot) => {
      if (snapshot.exists()) {
        remotePeerId = snapshot.val().uniqueCode;
      } else {
        console.log('No player found with that username.');
        return;
      }
    })
    .catch((err) => {
      console.error('Error fetching player data:', err);
      return;
    });

  console.log('remotePeerId=', remotePeerId);
  conn = peer.connect(remotePeerId);

  // Add error handling
  conn.on('error', (err) => {
    console.error('Connection error:', err);
  });

  // get the message to send
  const message = document.getElementById('p2pMessage').value.trim();
  console.log('message=', message);

  conn.on('open', () => {
    console.log('Connected to peer:', remotePeerId);
    // Send a test message
    conn.send(message);
  });

  conn.on('data', (data) => {
    console.log('Received data:', data);
  });
}

function sendRPC(method, params) {
  const rpcMessage = {
    method: method,
    params: params,
  };
  conn.send(JSON.stringify(rpcMessage));
}

function handleRPC(data) {
  console.log('handleRPC function called');
  const rpcMessage = JSON.parse(data);
  console.log('RPC Method:', rpcMessage.method);
  console.log('RPC Params:', rpcMessage.params);

  // Handle the RPC method
  if (rpcMessage.method === 'move') {
    console.log('Player moved to:', rpcMessage.params.position);
  }
}

function sendChat() {
  // get the message to send
  const message = document.getElementById('p2pMessage').value.trim();

  sendRPC('chat', { message });
}

// DEMO functions

// Step 1: registerForChat(your display name)
function demoRegisterForChat() {
  const username = document.getElementById('userName').value.trim();
  registerForChat(username);
}

// Step 2: Get the records of other players
function demoFetchPlayers() {
  fetchPlayers();
}

// Step 3: User picks a player from the list, then connects to that player
function demoFetchPlayer() {
  const remoteName = document.getElementById('remoteName').value.trim();
  fetchPlayer(remoteName);
}

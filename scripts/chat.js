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
    });
  });

  peer.on('disconnected', () => {
    console.log('Peer disconnected');
    // removePeerIdFromDatabase(peer.id);
  });
});

let remotePeerId = '';
let conn;

async function registerForChat(key, player) {
  if (!player.displayName) {
    console.error('Error: user display name cannot be empty');
    return null;
  }

  const playersRef = database.ref('players');

  try {
    // Query Firebase to check if displayName already exists
    const querySnapshot = await playersRef
      .orderByChild('displayName')
      .equalTo(player.displayName)
      .once('value');
    const nameExists = querySnapshot.exists();

    if (key === null) {
      if (nameExists) {
        console.error('Error: display name already exists');
        return null;
      }

      // Create a new player record
      const newPlayerRef = playersRef.push();
      await newPlayerRef.set({
        displayName: player.displayName,
        peerID: player.peerId,
        skillLevel: player.skillLevel,
        languages: player.languages,
        lastOnline: Date.now(),
      });
      // console.log('Player registered successfully!');
      return newPlayerRef.key;
    } else {
      // Check if the record exists
      const existingPlayerRef = playersRef.child(key);
      const existingSnapshot = await existingPlayerRef.once('value');
      if (!existingSnapshot.exists()) {
        console.error('Error: Player record does not exist');
        return null;
      }

      const existingPlayer = existingSnapshot.val();

      // If updating, ensure the new displayName does not conflict
      if (player.displayName !== existingPlayer.displayName && nameExists) {
        console.error('Error: New display name already exists');
        return null;
      }

      // Update the existing player record
      await existingPlayerRef.update({
        displayName: player.displayName,
        peerID: player.peerId,
        skillLevel: player.skillLevel,
        languages: player.languages,
        lastOnline: Date.now(),
      });
      console.log('Player updated successfully!');
      return key;
    }
  } catch (error) {
    console.error('Error handling player record: ', error);
    return null;
  }
}

async function fetchPlayers() {
  const playersRef = database.ref('players');

  try {
    const snapshot = await playersRef.once('value');
    const playersObject = snapshot.val();

    if (!playersObject) {
      console.log('No players found.');
      return [];
    }

    // Convert object to array and include keys
    const playersArray = Object.keys(playersObject).map((key) => ({
      id: key, // Firebase-generated key
      ...playersObject[key], // Player data
    }));

    console.log('Players with keys:', playersArray);
    return playersArray; // Now correctly in scope
  } catch (error) {
    console.error('Error retrieving players:', error);
    return [];
  }
}

async function fetchPlayerByKey(playerKey) {
  try {
    const playerRef = database.ref('players').child(playerKey);

    // Modern approach with get()
    const snapshot = await playerRef.get();

    // Older approach with once()
    // const snapshot = await playerRef.once('value');

    if (snapshot.exists()) {
      return snapshot.val(); // Returns the player data object
    } else {
      console.log('No player found with that key');
      return null;
    }
  } catch (error) {
    console.error('Error retrieving player:', error);
    return null;
  }
}

async function fetchRecentPlayers() {
  const playersRef = database.ref('players');
  const oneHourAgo = Date.now() - 60 * 60 * 1000; // 1 hour ago in milliseconds

  try {
    const snapshot = await playersRef
      .orderByChild('lastOnline')
      .startAt(oneHourAgo)
      .once('value');
    const playersObject = snapshot.val();

    if (!playersObject) {
      console.log('No players online in the last hour.');
      return [];
    }

    // Convert object to an array with keys
    const playersArray = Object.keys(playersObject).map((key) => ({
      id: key,
      ...playersObject[key],
    }));

    // console.log('Players online in the last hour:', playersArray);
    return playersArray;
  } catch (error) {
    console.error('Error retrieving recent players:', error);
    return [];
  }
}

async function connectToPlayer(remoteKey) {
  console.log('Attempting to connect to ' + remoteKey);

  const playerRef = database.ref('players').child(remoteKey);

  try {
    const snapshot = await playerRef.get();

    if (!snapshot.exists()) {
      console.log('No player found with that username.');
      return null;
    }

    const remotePeerId = snapshot.val().peerID;
    console.log('Attempting to connect to peer id ' + remotePeerId);

    const conn = peer.connect(remotePeerId);

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });

    conn.on('open', () => {
      console.log('Connected to peer:', remotePeerId);
      // Send a test message
      // conn.send(message);
    });

    conn.on('data', (data) => {
      console.log('Received data:', data);

      parsedData = JSON.parse(data);

      console.log(
        'Data received. method=' +
          parsedData.method +
          ', params=' +
          JSON.stringify(parsedData.params)
      );
      dispatchMessage(parsedData);
    });

    return conn;
  } catch (err) {
    console.error('Error fetching player data:', err);
    return null;
  }
}

function dispatchMessage(message) {
  switch (message.method) {
    case 'chat':
      console.log(
        'Send ' +
          message.params +
          ' data to function that consumes chat messages'
      );
      // e.g. displayChat(message.params);
      break;
    case 'move':
      console.log(
        'Send ' +
          message.params +
          ' data to function that performs move playback'
      );
      // e.g. playbackMove(message.params);
      break;
    case 'diceRoll':
      console.log(
        'Send ' +
          message.params +
          ' data to function that performs diceRoll playback'
      );
      // e.g. playbackDiceRoll(message.params);
      break;
    case 'challenge':
      console.log(
        'Send ' +
          message.params +
          ' data to function that handles challenge workflow'
      );
      // e.g. handleChallenge(message.params);
      break;
    case 'forfeit':
      console.log(
        'Send ' +
          message.params +
          ' data to function that handles forfeit workflow'
      );
      // e.g. handleForfeit(message.params);
      break;
  }
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

// DEMO functions

// Step 1: When displayName is set, registerForChat(your_display_name)
function demoRegisterForChat() {
  const username = document.getElementById('userName').value.trim();
  console.log('Demo register of ' + username);

  // Trial 1 - Register Mike (should succeed)
  player = {
    displayName: username,
    languages: ['English', 'Spanish'],
    peerId: peer.id,
    skillLevel: 'beginner',
  };

  console.log('Demo register of ' + player);

  registerForChat(null, player);
}

// Step 2: Get the records of other players
function demoFetchPlayers() {
  fetchPlayers();
}

// Step 3: User picks a player from the list, then connects to that player
async function demoConnectToPlayer() {
  const remoteKey = document.getElementById('remoteKey').value.trim();
  conn = await connectToPlayer(remoteKey);
}

// Step 4.1: Send an RPC message, e.g. send a chat message
function demoChat() {
  // get the message to send
  const message = document.getElementById('p2pMessage').value.trim();

  sendRPC('chat', { message });
}

// Step 4.2: Send an RPC message, e.g. a challenge
async function demoChallenge() {
  const userName = document.getElementById('userName').value.trim();
  const remoteName = document.getElementById('remoteName').value.trim();

  console.log('Attempting to challenge ' + remoteName);
  const user = await fetchPlayer(userName);
  console.log('User record for ' + userName + ': ', user);

  if (user) {
    // Get my user object to send as part of the challenge
    sendRPC('challenge', user);
  }
}

// Step 4.3: Send an RPC response to challenge - accept
function demoChallengeResponse() {
  sendRPC('challenge', 'accept'); // or 'reject'
}

async function demoFetchPlayer() {
  const remoteName = document.getElementById('remoteName').value.trim();
  const remotePlayer = await fetchPlayer(remoteName);
  console.log('remotePlayer:', remotePlayer);
}

// Step 4.4: send a dice roll
function demoSendDiceRoll() {
  let sampleRoll = [2, 0, 0, 0];
  sendRPC('diceRoll', sampleRoll);
}

// Step 4.5: send a move
function demoSendMove() {
  let sampleMove = {
    player: 'r',
    from: 24,
    to: 22,
  };

  sendRPC('pieceMove', sampleMove);
}

const BASE_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000/socket.io/?EIO=4&transport=websocket';

async function getToken(username, email, password) {
  await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return data.token;
}

function connectSocketClient(name, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);

    ws.addEventListener('open', () => {
      // Wait for Engine.IO '0' open packet before sending Socket.IO auth
    });

    ws.addEventListener('message', (event) => {
      const msg = String(event.data);

      if (msg === '2') {
        ws.send('3'); // Engine.IO pong
        return;
      }

      if (msg.startsWith('0')) {
        // Socket.IO v4 CONNECT packet with JWT in auth payload
        ws.send(`40${JSON.stringify({ token })}`);
        return;
      }

      if (msg.startsWith('40')) {
        console.log(`[${name}] Connected to Socket.IO`);
        resolve({
          emit: (eventName, payload) => {
            ws.send(`42${JSON.stringify([eventName, payload])}`);
          },
          close: () => ws.close(),
        });
        return;
      }

      if (msg.startsWith('44')) {
        reject(new Error(`[${name}] Auth error: ${msg.slice(2)}`));
        return;
      }

      if (msg.startsWith('42')) {
        const [eventName, data] = JSON.parse(msg.slice(2));
        console.log(`[${name} received ${eventName}]`, data);
      }
    });

    ws.addEventListener('error', (err) => reject(err));
  });
}

async function main() {
  const aditiToken = await getToken('Aditi', 'aditi@example.com', '123456');
  const rohanToken = await getToken('Rohan', 'rohan@example.com', '123456');

  const aditi = await connectSocketClient('Aditi', aditiToken);
  aditi.emit('joinRoom', 'general');

  await new Promise((r) => setTimeout(r, 150));

  const rohan = await connectSocketClient('Rohan', rohanToken);
  rohan.emit('joinRoom', 'general');

  setTimeout(() => {
    aditi.emit('chatMessage', { room: 'general', message: 'Hey team, backend is ready' });
  }, 300);

  setTimeout(() => {
    rohan.emit('chatMessage', { room: 'general', message: 'Testing chat now...' });
  }, 600);

  setTimeout(() => {
    aditi.emit('chatMessage', { room: 'general', message: 'Messages arriving in real time' });
  }, 900);

  setTimeout(() => {
    aditi.close();
    rohan.close();
  }, 1800);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

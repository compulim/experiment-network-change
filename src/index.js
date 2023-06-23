import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { WebSocketServer } from 'ws';
import express from 'express';

const { PORT = 80 } = process.env;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.get('/health.txt', (_, res) => res.send('OK'));
app.get('/api/poll', (_, res) => {
  res.chunkedEncoding = true;

  res.status(200);
  res.setHeader('cache-control', 'no-transform');
  res.write(' '); // iOS: Need to send at least 1 byte of data, otherwise, it won't signal as connected.

  const timeout = setTimeout(() => res.end(), 30000);

  res.on('close', () => {
    console.log('/api/poll closed prematurely');
    clearTimeout(timeout);
  });
});
app.get('/api/sse', (_, res) => {
  res.status(200);
  res.setHeader('content-type', 'text/event-stream');

  const interval = setInterval(() => res.write(`data: ping at ${new Date().toLocaleTimeString()}\n\n`), 2000);

  res.on('close', () => {
    console.log('/api/sse closed');
    clearInterval(interval);
  });
});
app.use(express.static(resolve(fileURLToPath(import.meta.url), '../../public/')));

server.on('upgrade', (req, socket, head) => {
  try {
    if (new URL(req.url, 'http://localhost/').pathname === '/api/ws') {
      wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
    } else {
      socket.destroy();
    }
  } catch (error) {
    socket.destroy();
  }
});

wss.on('connection', ws => {
  const interval = setInterval(() => ws.send(Buffer.from(`ping at ${new Date().toLocaleTimeString()}`)), 2000);

  ws.on('close', () => clearInterval(interval));
  ws.on('message', data => ws.send(`got ${data.byteLength} bytes`));
});

server.listen(PORT, () => console.log(`Listening to http://localhost:${PORT}/.`));

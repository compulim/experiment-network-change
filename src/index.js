import 'dotenv/config';

import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { WebSocketServer } from 'ws';
import express from 'express';
// import { createServer as createSocketServer } from 'net';

import generateServiceBusSharedAccessSignatureToken from './generateServiceBusSharedAccessSignatureToken.js';

const { PORT = 80 } = process.env;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

const CORS_ALLOWED_UNTIL = new Date('2023-07-31');

app.set('query parser', 'simple');

new Date() < CORS_ALLOWED_UNTIL && app.use(cors());

app.get('/health.txt', (_, res) => res.send('OK'));
app.use('/api/poll', (req, res) => {
  const timeoutParam = parseInt(req.query.timeout, 10);

  res.chunkedEncoding = true;
  res.status(200);
  res.setHeader('cache-control', 'no-store');
  res.write(' '); // iOS: Need to send at least 1 byte of data, otherwise, it won't signal as connected.

  const timeout = setTimeout(
    () => res.end(),
    isNaN(timeoutParam) ? 30_000 : Math.max(0, Math.min(120_000, timeoutParam))
  );

  res.on('close', () => {
    console.log('/api/poll closed prematurely');
    clearTimeout(timeout);
  });
});
app.get('/api/sse', (_, res) => {
  res.status(200);
  new Date() < CORS_ALLOWED_UNTIL && res.setHeader('access-control-allow-origin', '*');
  res.setHeader('content-type', 'text/event-stream');

  const interval = setInterval(() => res.write(`data: ping at ${new Date().toLocaleTimeString()}\n\n`), 2000);

  res.on('close', () => {
    console.log('/api/sse closed');
    clearInterval(interval);
  });

  res.write('data: welcome\n\n');
});
app.get('/api/servicebustoken', (_, res) => {
  // https://learn.microsoft.com/en-us/rest/api/servicebus/receive-and-delete-message-destructive-read
  const url = new URL(
    `https://${process.env.SERVICE_BUS_NAMESPACE}.servicebus.windows.net/${process.env.SERVICE_BUS_ENTITY_PATH}/messages/head?timeout=30`
  );

  const token = generateServiceBusSharedAccessSignatureToken(
    url.href,
    process.env.SERVICE_BUS_SHARED_ACCESS_KEY_NAME,
    process.env.SERVICE_BUS_SHARED_ACCESS_KEY
  );

  res.json({
    token,
    url
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

  ws.send(Buffer.from('greeting'));
});

server.listen(PORT, () => console.log(`Listening to http://localhost:${PORT}/.`));

// createSocketServer(() => {
//   console.log('New socket connection.');
// }).listen(5002, () => {
//   console.log('Socket server opened on port 5002.');
// });

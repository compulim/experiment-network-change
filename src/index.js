import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import express from 'express';

const { PORT = 80 } = process.env;

const app = express();
const server = createServer(app);

app.get('/health.txt', (_, res) => res.send('OK'));

app.use(express.static(resolve(fileURLToPath(import.meta.url), '../../public/')));

server.listen(PORT, () => {
  console.log(`Listening to http://localhost:${PORT}/`);
});

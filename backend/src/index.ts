import { createServer } from './server';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const host = 'localhost';
const app = createServer();

app.listen(port, host, () => {
  console.log(`Backend running on http://${host}:${port}`);
  console.log(`CORS enabled for http://localhost:4200`);
});

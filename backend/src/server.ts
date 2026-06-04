import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { gameRouter } from './routes/game.routes';

export function createServer() {
  const app = express();
  app.use(cors({
    origin: 'http://localhost:4200',
    credentials: true
  }));
  app.use(bodyParser.json());
  app.use('/api/game', gameRouter);
  return app;
}

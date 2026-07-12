import path from 'node:path';
import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { buildContractsRouter } from './modules/contracts/contracts.routes.js';
import { buildDocsRouter } from './modules/docs/docs.routes.js';
import { buildOrganisationsRouter } from './modules/organisations/organisations.routes.js';
import { buildRealtimeRouter } from './modules/realtime/realtime.routes.js';

dotenv.config();

const app = express();
const uploadsDirectory = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDirectory));

app.get('/health', (_req, res) => {
  res.status(200).json({ message: 'OK' });
});

app.use('/docs', buildDocsRouter());
app.use('/organisations', buildOrganisationsRouter());
app.use('/contracts', buildContractsRouter());
app.use('/events', buildRealtimeRouter());

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error',
        details: [],
      },
    });
  },
);

const PORT = Number(process.env.PORT ?? 8001);
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

export default app;

import dotenv from 'dotenv';
import express from 'express';
import { buildContractsRouter } from './modules/contracts/contracts.routes.js';
import { buildOrganisationsRouter } from './modules/organisations/organisations.routes.js';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.status(200).json({ message: 'OK' });
});

app.use('/organisations', buildOrganisationsRouter());
app.use('/contracts', buildContractsRouter());

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

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

export default app;

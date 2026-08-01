import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import adminRouter from './routes/admin.js';
import availabilityRouter from './routes/availability.js';
import healthRouter from './routes/health.js';
import contactRouter, { startAppointmentReminderJob } from './routes/contact.js';

const app = express();
const port = Number(process.env.PORT) || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/health', healthRouter);
app.use('/api/contact', contactRouter);
app.use('/api/admin', adminRouter);
app.use('/api/availability', availabilityRouter);
app.use(express.static(clientDist));

app.get('*', (_request, response) => {
  response.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`MRS Medical Services running on port ${port}`);
  startAppointmentReminderJob();
});

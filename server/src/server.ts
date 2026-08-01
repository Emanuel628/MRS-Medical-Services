import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import adminRouter from './routes/admin.js';
import availabilityRouter from './routes/availability.js';
import healthRouter from './routes/health.js';
import contactRouter, { startAppointmentReminderJob } from './routes/contact.js';

const app = express();
const port = Number(process.env.PORT) || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  process.env.SITE_ORIGIN,
  process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
  'https://www.mrsmedicalservices.com',
].filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      formAction: ["'self'", 'https://checkout.stripe.com'],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed.'));
  },
}));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use('/api/contact', rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use('/api/admin', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use(express.json({ limit: '100kb' }));
app.use((request, response, next) => {
  if (request.path.startsWith('/api')) {
    response.setHeader('Cache-Control', 'no-store');
  }
  request.setTimeout(25000);
  response.setTimeout(25000, () => {
    if (!response.headersSent) {
      response.status(504).json({ message: 'Request timed out. Please try again.' });
    }
  });
  next();
});
app.use('/api/health', healthRouter);
app.use('/api/contact', contactRouter);
app.use('/api/admin', adminRouter);
app.use('/api/availability', availabilityRouter);
app.use(express.static(clientDist, {
  setHeaders: (response, filePath) => {
    if (filePath.endsWith('index.html')) {
      response.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      return;
    }

    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  },
}));

app.get('*', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  response.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`MRS Medical Services running on port ${port}`);
  startAppointmentReminderJob();
});

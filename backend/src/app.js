import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authLimiter, generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

// Security headers
app.use(helmet());

// CORS — in development accept any localhost port (Vite bumps the port when busy);
// in production restrict to the explicit FRONTEND_URL.
const allowedOrigin = process.env.FRONTEND_URL;
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / curl requests (no Origin header)
    if (!origin) return callback(null, true);
    // Production: exact match required
    if (process.env.NODE_ENV === 'production') {
      return allowedOrigin && origin === allowedOrigin
        ? callback(null, true)
        : callback(new Error('Not allowed by CORS'));
    }
    // Development: accept any localhost origin regardless of port
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'TradeProof API', time: new Date().toISOString() });
});

// All API routes
app.use('/api', routes);

// 404 & error handler
app.use(notFound);
app.use(errorHandler);

export default app;

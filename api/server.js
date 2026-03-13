'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const winston = require('winston');

// ── Logger ──────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

global.logger = logger;

// ── App ──────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],   // for Swagger UI
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);            // allow server-to-server
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Compression & parsing ─────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.url === '/health',
}));

// ── Rate limiting ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);

// ── Routes ────────────────────────────────────────────────────
const authRouter       = require('./routes/auth');
const candidatesRouter = require('./routes/candidates');
const jobsRouter       = require('./routes/jobs');
const clientsRouter    = require('./routes/clients');
const placementsRouter = require('./routes/placements');
const activitiesRouter = require('./routes/activities');
const analyticsRouter  = require('./routes/analytics');
const pipelineRouter   = require('./routes/pipeline');
const aiRouter         = require('./routes/ai');

app.use('/api/auth',        authRouter);
app.use('/api/candidates',  candidatesRouter);
app.use('/api/jobs',        jobsRouter);
app.use('/api/clients',     clientsRouter);
app.use('/api/placements',  placementsRouter);
app.use('/api/activities',  activitiesRouter);
app.use('/api/analytics',   analyticsRouter);
app.use('/api/pipeline',    pipelineRouter);
app.use('/api/ai',          aiRouter);

// ── Swagger docs ──────────────────────────────────────────────
try {
  const swaggerDoc = YAML.load(path.join(__dirname, 'docs/openapi.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
    customCss: '.swagger-ui .topbar { background-color: #1a56db; }',
    customSiteTitle: 'Recruitment CRM API',
  }));
} catch (e) {
  logger.warn('Swagger docs not found — skipping');
}

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'recruitment-crm-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// ── Root ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'Recruitment CRM API',
    version: '1.0.0',
    description: 'Physical AI & Robotics Specialist Recruitment — REST API',
    docs: '/api/docs',
    health: '/health',
    endpoints: {
      auth:        '/api/auth',
      candidates:  '/api/candidates',
      jobs:        '/api/jobs',
      clients:     '/api/clients',
      placements:  '/api/placements',
      activities:  '/api/activities',
      analytics:   '/api/analytics',
      pipeline:    '/api/pipeline',
      ai:          '/api/ai',
    },
  });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error({ message: err.message, stack: err.stack, url: req.url, method: req.method });
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Recruitment CRM API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Docs: http://localhost:${PORT}/api/docs`);
});

module.exports = app;

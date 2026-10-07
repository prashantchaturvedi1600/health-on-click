import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getDb } from './server/db.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Route imports
import authRoutes from './server/routes/auth.routes.js';
import doctorRoutes from './server/routes/doctor.routes.js';
import appointmentRoutes from './server/routes/appointment.routes.js';
import chatRoutes from './server/routes/chat.routes.js';
import medicalDriveRoutes from './server/routes/medical-drive.routes.js';
import adminRoutes from './server/routes/admin.routes.js';
import notificationRoutes from './server/routes/notifications.routes.js';

async function createServer() {
  const app = express();

  // Initialize SQLite database
  await getDb();
  console.log('[DATABASE] Health On Click persistent SQLite database initialized.');

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // System configuration endpoint
  app.get('/api/config', (_req, res) => {
    res.json({
      appName: 'Health On Click',
      tagline: 'Healthcare, Connected in One Click.',
      emergencyNumber: process.env.EMERGENCY_PHONE_NUMBER || '112',
      smsProviderConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
      adminEmail: process.env.ADMIN_EMAIL || 'prashant37chaturvedi@gmail.com',
    });
  });

  // Mount API routers
  app.use('/api/auth', authRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/medical-drive', medicalDriveRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/notifications', notificationRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  if (!isProd) {
    // Development mode: Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve dist/
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🏥 Health On Click Server running at http://0.0.0.0:${PORT}`);
    console.log(`   Mode: ${isProd ? 'Production' : 'Development'}`);
    console.log(`   Database: ./data/health_on_click.sqlite`);
    console.log(`   Admin Notification Target: ${process.env.ADMIN_EMAIL || 'prashant37chaturvedi@gmail.com'}`);
    console.log(`======================================================\n`);
  });
}

createServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

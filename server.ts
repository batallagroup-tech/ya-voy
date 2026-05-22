import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import twilio from 'twilio';

import dashboardRouter from './src/server/routes/dashboard';
import menuRouter      from './src/server/routes/menu';
import promoRouter     from './src/server/routes/promotions';
import uploadRouter    from './src/server/routes/upload';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares ────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(clerkMiddleware());

// ── Twilio Verify (sin mock) ───────────────────────────────────────
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const VERIFY_SID = process.env.TWILIO_VERIFY_SID!;

app.post('/api/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Telefono requerido' });
    const v = await twilioClient.verify.v2
      .services(VERIFY_SID)
      .verifications.create({ to: phone, channel: 'sms' });
    res.json({ status: v.status });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/verify-code', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Telefono y codigo requeridos' });
    const check = await twilioClient.verify.v2
      .services(VERIFY_SID)
      .verificationChecks.create({ to: phone, code });
    res.json({ status: check.status, valid: check.status === 'approved' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Rutas protegidas con Clerk ─────────────────────────────────────
app.use('/api/dashboard', requireAuth(), dashboardRouter);
app.use('/api/menu',      requireAuth(), menuRouter);
app.use('/api/promos',    requireAuth(), promoRouter);
app.use('/api/upload',    requireAuth(), uploadRouter);

// ── Health check ───────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
export default app;

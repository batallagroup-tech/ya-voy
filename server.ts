import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import twilio from "twilio";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const resend = new Resend(process.env.RESEND_API_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Twilio Verify: Send Code
  app.post("/api/verify/send", async (req, res) => {
    const { phone } = req.body;
    try {
      const verification = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
        .verifications.create({ to: phone, channel: "sms" });
      res.json({ status: verification.status });
    } catch (error: any) {
      console.error("Twilio Send Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Twilio Verify: Check Code
  app.post("/api/verify/check", async (req, res) => {
    const { phone, code } = req.body;
    try {
      const verificationCheck = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
        .verificationChecks.create({ to: phone, code });
      res.json({ status: verificationCheck.status, valid: verificationCheck.valid });
    } catch (error: any) {
      console.error("Twilio Check Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Resend: Send Welcome Email (example)
  app.post("/api/email/welcome", async (req, res) => {
    const { email, name } = req.body;
    try {
      const data = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: email,
        subject: "Bienvenido a YA VOY REPARTIDOR",
        html: `<h1>Hola ${name}</h1><p>Tu solicitud ha sido recibida y está en revisión.</p>`,
      });
      res.json(data);
    } catch (error: any) {
      console.error("Resend Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

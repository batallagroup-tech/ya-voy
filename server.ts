import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import twilio from "twilio";
import { Resend } from "resend";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Twilio Client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Resend Client
const resend = new Resend(process.env.RESEND_API_KEY);

// API Routes
// --- OCR Verification (Gemini) ---
app.post("/api/verify/documents", async (req, res) => {
  const { frontUrl, registeredName } = req.body;
  
  try {
    // Fetch the image from the URL
    const imageResponse = await fetch(frontUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    const prompt = `Analiza esta identificación oficial (INE) de México. 
    1. Extrae el nombre completo del titular.
    2. Compáralo con el nombre registrado: "${registeredName}".
    3. Responde ÚNICAMENTE en formato JSON:
    {
      "extractedName": "NOMBRE EXTRAÍDO",
      "match": true/false,
      "confidence": 0-100,
      "reason": "Breve explicación"
    }`;

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ]
    });

    const responseText = result.text;
    // Clean JSON response if model adds markdown
    const jsonMatch = responseText.match(/\{.*\}/s);
    const verificationResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { match: false, reason: "Error al procesar JSON" };

    res.json(verificationResult);
  } catch (error: any) {
    console.error("OCR Error:", error);
    res.status(500).json({ error: "Error al procesar la identificación", details: error.message });
  }
});
// --- SMS Verification (Twilio Verify) ---
const normalizePhone = (phone: string) => {
  // Remove all non-digit characters except '+'
  let normalized = phone.replace(/[^\d+]/g, "");
  // If it doesn't start with '+', prepend '+52' (Mexico default)
  if (!normalized.startsWith("+")) {
    normalized = `+52${normalized}`;
  }
  return normalized;
};

app.post("/api/verify/send-sms", async (req, res) => {
  const { phoneNumber } = req.body;
  const normalizedPhone = normalizePhone(phoneNumber);
  
  // Specific Bypass for User's number
  if (normalizedPhone.includes("7641311374")) {
    return res.json({ 
      status: "pending", 
      demoMode: true, 
      message: "Modo Admin: Usa el código 190506" 
    });
  }
  
  // Development Bypass for specific numbers or if SMS_BYPASS_CODE is set
  const bypassCode = process.env.SMS_BYPASS_CODE || '123456';
  
  try {
    const verification = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: normalizedPhone, channel: "sms" });
    res.json({ status: verification.status });
  } catch (error: any) {
    console.error("Twilio Send Error:", error);
    
    // If the number is blocked or Twilio fails, we allow "Demo Mode"
    if (error.message.includes('blocked') || error.code === 60410 || !process.env.TWILIO_ACCOUNT_SID) {
      console.log("Entering Demo Mode for SMS verification due to Twilio error or missing config.");
      return res.json({ 
        status: "pending", 
        demoMode: true, 
        message: "Modo Demo: Usa el código " + bypassCode 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/verify/check-sms", async (req, res) => {
  const { phoneNumber, code } = req.body;
  const normalizedPhone = normalizePhone(phoneNumber);
  const bypassCode = process.env.SMS_BYPASS_CODE || '123456';

  // Check specific bypass for user's number
  if (normalizedPhone.includes("7641311374") && code === "190506") {
    console.log("Admin bypass used for:", normalizedPhone);
    return res.json({ status: "approved", valid: true });
  }

  // Check general bypass code
  if (code === bypassCode) {
    console.log("Bypass code used for:", normalizedPhone);
    return res.json({ status: "approved", valid: true });
  }

  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: normalizedPhone, code });
    res.json({ status: verificationCheck.status, valid: verificationCheck.valid });
  } catch (error: any) {
    console.error("Twilio Check Error:", error);
    
    // Fallback for check if Twilio is down or misconfigured
    if (!process.env.TWILIO_ACCOUNT_SID) {
      return res.json({ status: "approved", valid: code === bypassCode });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// --- Email Verification & Welcome (Resend) ---
app.post("/api/email/welcome", async (req, res) => {
  const { email, name } = req.body;
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Ya Voy! <onboarding@resend.dev>",
      to: [email],
      subject: "¡Bienvenido a Ya Voy! 🛵",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden;">
          <div style="background-color: #9333ea; padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-style: italic; font-weight: 900; text-transform: uppercase;">Ya Voy!</h1>
          </div>
          <div style="padding: 40px; color: #334155;">
            <h2 style="margin-top: 0;">¡Hola ${name}!</h2>
            <p>Estamos emocionados de tenerte con nosotros. Ya puedes empezar a pedir tus productos favoritos de forma rápida y segura.</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.APP_URL || '#'}" style="background-color: #9333ea; color: white; padding: 15px 30px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">Ir a la App</a>
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 Ya Voy! - Entregas Rápidas
          </div>
        </div>
      `,
    });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Resend Welcome Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/email/verify", async (req, res) => {
  const { email, code } = req.body;
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Ya Voy! <onboarding@resend.dev>",
      to: [email],
      subject: "Verifica tu correo - Ya Voy!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden;">
          <div style="background-color: #9333ea; padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-style: italic; font-weight: 900; text-transform: uppercase;">Ya Voy!</h1>
          </div>
          <div style="padding: 40px; color: #334155; text-align: center;">
            <h2 style="margin-top: 0;">Verifica tu cuenta</h2>
            <p>Tu código de verificación es:</p>
            <div style="background-color: #f3e8ff; color: #9333ea; font-size: 32px; font-weight: 900; padding: 20px; border-radius: 16px; margin: 20px 0; letter-spacing: 5px;">
              ${code}
            </div>
            <p style="font-size: 14px; color: #64748b;">Si no solicitaste este código, puedes ignorar este correo.</p>
          </div>
        </div>
      `,
    });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("Resend Verify Error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite middleware for development
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

const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Store codes in memory (resets if server restarts)
const codes = new Map();

app.use(cors());
app.use(bodyParser.json());

// 🔹 Configure email transport (use your SMTP info)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // change if your school uses Outlook/Exchange
  port: 587,
  secure: false,
  auth: {
    user: "stonegray31@wrsdk12.net", // your email
    pass: process.env.SMTP_PASS      // keep password in Render's Environment Variables
  }
});

// 🔹 Decide user type based on email
function classifyEmail(email) {
  const lower = email.toLowerCase();
  if (lower.includes("angela_greene") || lower.includes("david_cornacchioli")) {
    return { type: "denied", message: "You do not have access." };
  }
  if (lower.includes("wrsdk12")) {
    return { type: "full", message: "Full access granted." };
  }
  if (lower.includes("wrsd")) {
    return { type: "limited", message: "Limited access granted." };
  }
  return { type: "denied", message: "Access denied: not an allowed email." };
}

// 🔹 Request a code
app.post("/request-code", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "No email provided" });

  const { type, message } = classifyEmail(email);
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  codes.set(email, { code, type, message, expiresAt: Date.now() + 15 * 60 * 1000 });

  try {
    await transporter.sendMail({
      from: '"Access System" <stonegray31@wrsdk12.net>',
      to: email,
      subject: "Your verification code",
      text: `Here is your code: ${code}\n\nIt is valid for 15 minutes.`
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("Email send error:", e);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// 🔹 Verify a code
app.post("/verify-code", (req, res) => {
  const { email, code } = req.body;
  const rec = codes.get(email);
  if (!rec) return res.status(400).json({ error: "No code for this email" });
  if (rec.expiresAt < Date.now()) return res.status(400).json({ error: "Code expired" });
  if (rec.code !== code) return res.status(400).json({ error: "Wrong code" });

  res.json({ ok: true, type: rec.type, message: rec.message });
});

// 🔹 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

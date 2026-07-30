const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (to, otp) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Your Ghar login verification code",
    text: `Your login verification code is ${otp}. It expires in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #051747;">Login Verification</h2>
        <p>Use the code below to complete your login:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #051747;">${otp}</p>
        <p style="color: #64748B;">This code expires in 5 minutes. If you did not attempt to log in, you can ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { transporter, sendOtpEmail };

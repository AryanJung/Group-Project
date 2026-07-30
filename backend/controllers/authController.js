const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RegisterOtp = require("../models/RegisterOtp");
const { sendOtpEmail } = require("../config/email");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const OTP_EXPIRY_MS = 5 * 60 * 1000;

const generateToken = (userId) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "30d" });

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const maskEmail = (email) => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
};

const formatUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role || "renter",
  kycVerified: !!user.kycVerified,
  suspended: !!user.suspended,
  banned: !!user.banned,
  suspendedUntil: user.suspendedUntil || null,
  token: generateToken(user._id),
});

const verifyPassword = async (candidatePassword, storedPassword) => {
  if (!storedPassword) return false;
  if (storedPassword.startsWith("$2")) {
    return bcrypt.compare(candidatePassword, storedPassword);
  }
  return candidatePassword === storedPassword;
};

const generateUsername = async (email, name) => {
  const base = (email.split("@")[0] || name.replace(/\s+/g, "").toLowerCase())
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 20) || "user";

  let username = base;
  let counter = 1;

  while (await User.findOne({ username })) {
    username = `${base}${counter}`;
    counter += 1;
  }

  return username;
};

const generatePhoneNumber = async () => {
  let phoneNumber = `9${Date.now().toString().slice(-9)}`;

  while (await User.findOne({ phoneNumber })) {
    phoneNumber = `9${Math.floor(Math.random() * 1_000_000_000)
      .toString()
      .padStart(9, "0")}`;
  }

  return phoneNumber;
};

/**
 * Step 1: Initiate Registration & send OTP to email
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const allowedRoles = ["renter", "owner"];
    const assignedRole = allowedRoles.includes(role) ? role : "renter";

    const hashedPassword = await bcrypt.hash(password, 10);
    const username = await generateUsername(email, name);
    const phoneNumber = await generatePhoneNumber();

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    // Remove any existing pending registration for this email
    await RegisterOtp.deleteMany({ "userData.email": email });

    await RegisterOtp.create({
      userData: {
        name,
        email,
        password: hashedPassword,
        role: assignedRole,
        username,
        phoneNumber,
      },
      sessionToken,
      otpHash,
      expiresAt,
    });

    await sendOtpEmail(email, otp);

    res.status(200).json({
      requiresOtp: true,
      otpSessionId: sessionToken,
      email: maskEmail(email),
      message: "Verification code sent to your email.",
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error("Register OTP error:", error.message);
    res.status(500).json({
      message: "Unable to send verification code. Check email configuration.",
      error: error.message,
    });
  }
};

/**
 * Step 2: Verify OTP and create User in Database
 */
const verifyRegisterOtp = async (req, res) => {
  try {
    const { otpSessionId, otp } = req.body;

    if (!otpSessionId || !otp) {
      return res.status(400).json({ message: "Verification session and OTP are required" });
    }

    const otpSession = await RegisterOtp.findOne({ sessionToken: otpSessionId });
    if (!otpSession) {
      return res.status(401).json({ message: "Invalid or expired verification session" });
    }

    if (otpSession.expiresAt.getTime() < Date.now()) {
      await RegisterOtp.deleteOne({ _id: otpSession._id });
      return res.status(401).json({ message: "Verification code has expired" });
    }

    const otpMatches = await bcrypt.compare(String(otp).trim(), otpSession.otpHash);
    if (!otpMatches) {
      return res.status(401).json({ message: "Invalid verification code" });
    }

    const { userData } = otpSession;

    // Check once more if email was taken while waiting for OTP
    const userExists = await User.findOne({ email: userData.email });
    if (userExists) {
      await RegisterOtp.deleteOne({ _id: otpSession._id });
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Persist new user upon verification
    const user = await User.create({
      name: userData.name,
      username: userData.username,
      phoneNumber: userData.phoneNumber,
      email: userData.email,
      password: userData.password,
      role: userData.role,
    });

    await RegisterOtp.deleteOne({ _id: otpSession._id });

    res.status(201).json(formatUserResponse(user));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Resend Registration OTP
 */
const resendRegisterOtp = async (req, res) => {
  try {
    const { otpSessionId } = req.body;

    if (!otpSessionId) {
      return res.status(400).json({ message: "Verification session is required" });
    }

    const otpSession = await RegisterOtp.findOne({ sessionToken: otpSessionId });
    if (!otpSession) {
      return res.status(401).json({ message: "Invalid or expired verification session" });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    otpSession.otpHash = otpHash;
    otpSession.expiresAt = expiresAt;
    await otpSession.save();

    await sendOtpEmail(otpSession.userData.email, otp);

    res.json({
      message: "A new verification code has been sent to your email.",
      email: maskEmail(otpSession.userData.email),
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error("Resend OTP error:", error.message);
    res.status(500).json({
      message: "Unable to resend verification code. Check email configuration.",
      error: error.message,
    });
  }
};

/**
 * Direct Login (No OTP required)
 */
const loginUser = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || "").trim();

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) {
      return res.status(401).json({ message: "Username doesn't exist" });
    }

    const passwordMatches = await verifyPassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Wrong password" });
    }

    res.json(formatUserResponse(user));
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      message: "Server error during login",
      error: error.message,
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    res.json(formatUserResponse(req.user));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  registerUser,
  verifyRegisterOtp,
  resendRegisterOtp,
  loginUser,
  getCurrentUser,
};

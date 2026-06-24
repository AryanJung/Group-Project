const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const generateToken = (userId) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "30d" });

const formatUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  token: generateToken(user._id),
});

const verifyPassword = async (candidatePassword, storedPassword) => {
  if (!storedPassword) {
    return false;
  }

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

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const username = await generateUsername(email, name);
    const phoneNumber = await generatePhoneNumber();

    const user = await User.create({
      name,
      username,
      phoneNumber,
      email,
      password: hashedPassword,
    });

    res.status(201).json(formatUserResponse(user));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await verifyPassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json(formatUserResponse(user));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
};

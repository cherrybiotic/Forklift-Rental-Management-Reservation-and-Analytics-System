require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas!'))
  .catch((err) => console.log('Connection failed:', err));

// User Model
const userSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['owner', 'customer'], default: 'customer' },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Forklift Model
const forkliftSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  model:       { type: String, required: true },
  capacity:    { type: Number, required: true },
  ratePerDay:  { type: Number, required: true },
  isAvailable: { type: Boolean, default: true },
  description: { type: String },
}, { timestamps: true });

const Forklift = mongoose.model('Forklift', forkliftSchema);

// Reservation Model
const reservationSchema = new mongoose.Schema({
  customer:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  forklift:  { type: mongoose.Schema.Types.ObjectId, ref: 'Forklift', required: true },
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  totalCost: { type: Number },
  status:    { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  notes:     { type: String },
}, { timestamps: true });

const Reservation = mongoose.model('Reservation', reservationSchema);

// Middleware - Check if user is logged in
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Middleware - Owner only
function ownerOnly(req, res, next) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Owner access only' });
  }
  next();
}

// Register route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username already taken' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, username, password: hashed, role: 'customer' });
    res.json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Wrong password' });

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Owner - Add a forklift
app.post('/api/forklifts', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const forklift = await Forklift.create(req.body);
    res.json(forklift);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Owner & Guest - Get all forklifts
app.get('/api/forklifts', async (req, res) => {
  try {
    const forklifts = await Forklift.find();
    res.json(forklifts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Owner - Get all reservations
app.get('/api/reservations', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('customer', 'username email')
      .populate('forklift', 'name model');
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Owner - Approve or reject a reservation
app.patch('/api/reservations/:id', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Guest - Make a reservation
app.post('/api/reservations', authMiddleware, async (req, res) => {
  try {
    const { forkliftId, startDate, endDate, notes } = req.body;
    const forklift = await Forklift.findById(forkliftId);
    if (!forklift) return res.status(404).json({ message: 'Forklift not found' });

    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const totalCost = days * forklift.ratePerDay;

    const reservation = await Reservation.create({
      customer: req.user.id,
      forklift: forkliftId,
      startDate,
      endDate,
      totalCost,
      notes
    });
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Guest - Get own reservations
app.get('/api/my-reservations', authMiddleware, async (req, res) => {
  try {
    const reservations = await Reservation.find({ customer: req.user.id })
      .populate('forklift', 'name model ratePerDay');
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
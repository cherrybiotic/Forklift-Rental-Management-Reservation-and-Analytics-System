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
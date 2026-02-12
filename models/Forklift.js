const forkliftSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  model:       { type: String, required: true },
  capacity:    { type: Number, required: true },
  ratePerDay:  { type: Number, required: true },
  isAvailable: { type: Boolean, default: true },
  description: { type: String },
}, { timestamps: true });

const Forklift = mongoose.model('Forklift', forkliftSchema);
// models/Employee.js
const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', EmployeeSchema);

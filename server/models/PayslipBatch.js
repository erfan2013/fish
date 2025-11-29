// models/PayslipBatch.js
const mongoose = require('mongoose');

const payslipRowSchema = new mongoose.Schema(
  {
    fullName: String,
    personnelCode: String,
    nationalId: String,
    position: String,
    month: String,
    year: String,

    baseSalary: Number,
    housingAllowance: Number,
    foodAllowance: Number,
    overtime: Number,
    otherBenefits: Number,
    totalBenefits: Number,

    insurance: Number,
    tax: Number,
    otherDeductions: Number,
    totalDeductions: Number,

    netPay: Number,

    email: String,
  },
  { _id: false }
);

const payslipBatchSchema = new mongoose.Schema(
  {
    createdAt: { type: Date, default: Date.now },
    rows: [payslipRowSchema],
    status: {
      type: String,
      enum: ['uploaded', 'sending', 'sent', 'error'],
      default: 'uploaded',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PayslipBatch', payslipBatchSchema);

// server.js

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const { PDFDocument } = require('pdf-lib');

const Employee = require('./models/Employee');
const PayslipBatch = require('./models/PayslipBatch');
const { buildPayslipHtml } = require('./payslipTemplate');

const app = express();

// برای فایل‌ها (اکسل / PDF)
const upload = multer({ dest: 'uploads/' });

// برای نگه‌داشتن PDFهای آپلود‌شده (در حافظه، تا وقتی سرور ری‌استارت نشه)
let uploadedPdfs = [];

// میدل‌ورها
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// اتصال به MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('Mongo error:', err));

// تنظیم nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
console.log('SMTP_USER =>', process.env.SMTP_USER);
console.log(
  'SMTP_PASS length =>',
  process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0
);

// --- کمک‌تابع مپ کردن سطر اکسل به مدل PayslipBatch (سناریوی HTML) ---
function mapRow(r) {
  return {
    fullName: r.fullName || '',
    personnelCode: r.personnelCode || '',
    nationalId: r.nationalId || '',
    position: r.position || '',
    month: r.month || '',
    year: r.year || '',

    baseSalary: Number(r.baseSalary || 0),
    housingAllowance: Number(r.housingAllowance || 0),
    foodAllowance: Number(r.foodAllowance || 0),
    overtime: Number(r.overtime || 0),
    otherBenefits: Number(r.otherBenefits || 0),
    totalBenefits: Number(r.totalBenefits || 0),

    insurance: Number(r.insurance || 0),
    tax: Number(r.tax || 0),
    otherDeductions: Number(r.otherDeductions || 0),
    totalDeductions: Number(r.totalDeductions || 0),

    netPay: Number(r.netPay || 0),

    email: r.email || '',
  };
}

/* =====================================================================
   سناریوی ۱: اکسل → فیش HTML → ایمیل
   (سمت فرانت دیگه استفاده نمی‌کنی ولی API رو نگه می‌داریم)
   ===================================================================== */

app.post('/api/upload-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'فایل اکسل دریافت نشد.' });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = xlsx.utils.sheet_to_json(sheet);

    fs.unlinkSync(filePath);

    const mappedRows = jsonRows.map(mapRow);
    const batch = await PayslipBatch.create({ rows: mappedRows });

    res.json({
      batchId: batch._id,
      rows: mappedRows,
    });
  } catch (err) {
    console.error('UPLOAD EXCEL ERROR:', err);
    res.status(500).json({ message: 'خطا در خواندن فایل اکسل' });
  }
});

app.post('/api/batch/:id/send', async (req, res) => {
  try {
    const batch = await PayslipBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch یافت نشد' });
    }

    batch.status = 'sending';
    await batch.save();

    for (const row of batch.rows) {
      if (!row.email) continue;

      const html = buildPayslipHtml(row);

      await transporter.sendMail({
        from: `"سیستم حقوق و دستمزد" <${process.env.SMTP_USER}>`,
        to: row.email,
        subject: `فیش حقوقی - ${row.month || ''} ${row.year || ''}`,
        html,
      });
    }

    batch.status = 'sent';
    await batch.save();

    res.json({ message: 'ایمیل‌ها با موفقیت ارسال شدند.' });
  } catch (err) {
    console.error('SEND ERROR:', err);
    res.status(500).json({
      message: 'خطا در ارسال ایمیل‌ها',
      error: err.message || String(err),
    });
  }
});

/* =====================================================================
   سناریوی ۲: PDF مرج‌شده + اکسل ایمیل‌ها
   ===================================================================== */

// API: آپلود یک فایل PDF مرج‌شده و جدا کردن صفحه‌ها
app.post('/api/upload-pdfs', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'فایل PDF دریافت نشد.' });
    }

    const filePath = req.file.path;
    const bytes = await fsp.readFile(filePath);
    const pdfDoc = await PDFDocument.load(bytes);
    const pageCount = pdfDoc.getPageCount();

    uploadedPdfs = [];

    for (let i = 0; i < pageCount; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);

      const newBytes = await newPdf.save();
      const singleName = `${req.file.filename}_page_${i + 1}.pdf`;
      const singlePath = path.join('uploads', singleName);

      await fsp.writeFile(singlePath, newBytes);

      uploadedPdfs.push({
        id: singleName,
        originalName: `${req.file.originalname} - صفحه ${i + 1}`,
        url: `/uploads/${singleName}`,
        path: singlePath,
        pageNumber: i + 1,
      });
    }

    // fs.unlinkSync(filePath); // اگر خواستی فایل اصلی حذف شود

    res.json({ pdfs: uploadedPdfs });
  } catch (err) {
    console.error('UPLOAD MERGED PDF ERROR:', err);
    res.status(500).json({ message: 'خطا در پردازش فایل PDF مرج‌شده' });
  }
});

// API: آپلود اکسل ایمیل‌ها + ذخیره در Mongo
app.post('/api/upload-email-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'فایل اکسل دریافت نشد.' });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonRows = xlsx.utils.sheet_to_json(sheet);

    fs.unlinkSync(filePath);

    const rawEmails = jsonRows
      .filter((r) => r.email)
      .map((r) => ({
        name: r.fullName || r.name || '',
        email: r.email,
      }));

    // ذخیره / آپدیت در Mongo
    for (const e of rawEmails) {
      await Employee.findOneAndUpdate(
        { email: e.email },
        { fullName: e.name },
        { upsert: true, new: true }
      );
    }

    // لیست نهایی از Mongo
    const employees = await Employee.find().sort({ fullName: 1 });
    const emails = employees.map((e) => ({
      id: e._id,
      name: e.fullName,
      email: e.email,
    }));

    res.json({ emails });
  } catch (err) {
    console.error('UPLOAD EMAIL EXCEL ERROR:', err);
    res.status(500).json({ message: 'خطا در خواندن فایل اکسل ایمیل‌ها' });
  }
});

// API: گرفتن لیست ایمیل‌ها برای فرانت
app.get('/api/emails', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ fullName: 1 });
    const emails = employees.map((e) => ({
      id: e._id,
      name: e.fullName,
      email: e.email,
    }));
    res.json({ emails });
  } catch (err) {
    console.error('GET EMAILS ERROR:', err);
    res.status(500).json({ message: 'خطا در خواندن ایمیل‌ها' });
  }
});

// API: افزودن یک ایمیل جدید
app.post('/api/emails', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'ایمیل اجباری است.' });
    }

    const existing = await Employee.findOne({ email });
    let doc;
    if (existing) {
      existing.fullName = name || existing.fullName || '';
      doc = await existing.save();
    } else {
      doc = await Employee.create({
        fullName: name || '',
        email,
      });
    }

    res.json({
      id: doc._id,
      name: doc.fullName,
      email: doc.email,
    });
  } catch (err) {
    console.error('CREATE EMAIL ERROR:', err);
    res.status(500).json({ message: 'خطا در افزودن ایمیل' });
  }
});

// API: حذف یک ایمیل
app.delete('/api/emails/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'ایمیل حذف شد.' });
  } catch (err) {
    console.error('DELETE EMAIL ERROR:', err);
    res.status(500).json({ message: 'خطا در حذف ایمیل' });
  }
});

// API: ارسال PDF ها بر اساس مپینگ pdfId → email + subject/body/cc
app.post('/api/send-mapped-pdfs', async (req, res) => {
  const { mappings, subject, body, cc } = req.body;

  if (!Array.isArray(mappings) || mappings.length === 0) {
    return res.status(400).json({ message: 'هیچ مپینگی ارسال نشده است.' });
  }

  const finalSubject = subject && subject.trim().length > 0
    ? subject.trim()
    : 'فیش حقوقی شما';

  const finalBody = body && body.trim().length > 0
    ? body.trim()
    : 'فیش حقوقی شما به پیوست این ایمیل ارسال شده است.';

  try {
    for (const m of mappings) {
      const pdf = uploadedPdfs.find((p) => p.id === m.pdfId);
      if (!pdf || !m.email) continue;

      const mailOptions = {
        from: `"سیستم حقوق و دستمزد" <${process.env.SMTP_USER}>`,
        to: m.email,
        subject: finalSubject,
        text: finalBody,
        attachments: [
          {
            filename: pdf.originalName,
            path: pdf.path,
          },
        ],
      };

      if (cc && typeof cc === 'string' && cc.trim().length > 0) {
        mailOptions.cc = cc.trim();
      }

      await transporter.sendMail(mailOptions);
    }

    res.json({ message: 'PDF ها با موفقیت ارسال شدند.' });
  } catch (err) {
    console.error('SEND PDF ERROR:', err);
    res.status(500).json({
      message: 'خطا در ارسال PDF ها',
      error: err.message || String(err),
    });
  }
});

// شروع سرور
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));

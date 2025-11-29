// test-smtp.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function main() {
  console.log('SMTP_USER =', process.env.SMTP_USER);
  console.log('SMTP_PASS length =', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    // اول فقط verify
    await transporter.verify();
    console.log('SMTP اتصال برقرار شد، auth اوکی است.');

    // بعد یک ایمیل تست به خودت
    const info = await transporter.sendMail({
      from: `"Test Payslip" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: 'SMTP Test from fish-hoghoghi',
      text: 'اگر این ایمیل را دریافت کردی یعنی تنظیمات ایمیل برای پروژه درست است.',
    });

    console.log('Email sent, messageId =', info.messageId);
  } catch (err) {
    console.error('SMTP TEST ERROR:', err);
  }
}

main();

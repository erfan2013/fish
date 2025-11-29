// src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import './App.css';

const API_BASE = 'http://localhost:4000';

function App() {
  // کدام صفحه: mapping یا emails
  const [activeView, setActiveView] = useState('mapping');

  // فایل‌های ورودی
  const [emailExcelFile, setEmailExcelFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  // داده‌ها
  const [emails, setEmails] = useState([]); // {id, name, email}
  const [pdfs, setPdfs] = useState([]);     // از سرور
  const [emailMap, setEmailMap] = useState({}); // { pdfId: email }

  // متن ایمیل برای همه
  const [emailSubject, setEmailSubject] = useState('فیش حقوقی شما');
  const [emailBody, setEmailBody] = useState(
    'همکار گرامی،\nفیش حقوقی شما به پیوست این ایمیل ارسال شده است.'
  );
  const [ccEmails, setCcEmails] = useState(''); // مثلاً boss@company.com, hr@company.com

  // وضعیت‌ها و پیام
  const [message, setMessage] = useState('');
  const [sendingPdfs, setSendingPdfs] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingPdfs, setLoadingPdfs] = useState(false);

  // فرم اضافه کردن ایمیل
  const [newEmailName, setNewEmailName] = useState('');
  const [newEmailAddress, setNewEmailAddress] = useState('');

  // لود ایمیل‌ها روی شروع
  const fetchEmails = async () => {
    try {
      setLoadingEmails(true);
      const res = await axios.get(`${API_BASE}/api/emails`);
      if (res.data && res.data.emails) {
        setEmails(res.data.emails);
      }
    } catch (err) {
      console.error(err);
      setMessage('خطا در خواندن لیست ایمیل‌ها.');
    } finally {
      setLoadingEmails(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  // آپلود اکسل ایمیل‌ها
  const handleEmailExcelChange = (e) => {
    setEmailExcelFile(e.target.files[0] || null);
  };

  const uploadEmailExcel = async () => {
    if (!emailExcelFile) {
      setMessage('لطفاً فایل اکسل ایمیل‌ها را انتخاب کنید.');
      return;
    }
    const formData = new FormData();
    formData.append('file', emailExcelFile);

    try {
      setMessage('');
      setLoadingEmails(true);
      const res = await axios.post(`${API_BASE}/api/upload-email-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEmails(res.data.emails || []);
      setMessage('فایل ایمیل‌ها با موفقیت خوانده شد.');
    } catch (err) {
      console.error(err);
      setMessage('خطا در خواندن فایل ایمیل‌ها.');
    } finally {
      setLoadingEmails(false);
    }
  };

  // آپلود PDF مرج‌شده
  const handlePdfFileChange = (e) => {
    setPdfFile(e.target.files[0] || null);
  };

  const uploadPdfs = async () => {
    if (!pdfFile) {
      setMessage('لطفاً فایل PDF مرج‌شده فیش‌ها را انتخاب کنید.');
      return;
    }
    const formData = new FormData();
    formData.append('file', pdfFile);

    try {
      setMessage('');
      setLoadingPdfs(true);
      const res = await axios.post(`${API_BASE}/api/upload-pdfs`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPdfs(res.data.pdfs || []);
      setEmailMap({});
      setMessage('فایل PDF مرج‌شده پردازش شد و صفحه‌ها جدا شدند.');
    } catch (err) {
      console.error(err);
      setMessage('خطا در پردازش فایل PDF.');
    } finally {
      setLoadingPdfs(false);
    }
  };

  // گزینه‌های Select برای هر ردیف (حذف ایمیل‌های استفاده‌شده در ردیف‌های دیگر)
  const getOptionsForPdf = (pdfId) => {
    const usedEmails = new Set(
      Object.entries(emailMap)
        .filter(([pId, val]) => pId !== pdfId && val)
        .map(([, val]) => val)
    );

    return emails
      .filter((e) => !usedEmails.has(e.email))
      .map((em) => ({
        value: em.email,
        label: em.name ? `${em.name} - ${em.email}` : em.email,
      }));
  };

  const getSelectedOption = (pdfId) => {
    const email = emailMap[pdfId];
    if (!email) return null;
    const em = emails.find((e) => e.email === email);
    const label = em && em.name ? `${em.name} - ${em.email}` : email;
    return { value: email, label };
  };

  const mappedCount = pdfs.filter((p) => emailMap[p.id]).length;

  // ارسال PDFها
  const sendMappedPdfs = async () => {
    const mappings = pdfs
      .filter((pdf) => emailMap[pdf.id])
      .map((pdf) => ({
        pdfId: pdf.id,
        email: emailMap[pdf.id],
      }));

    if (mappings.length === 0) {
      setMessage('لطفاً برای هر فیش PDF یک ایمیل انتخاب کنید.');
      return;
    }

    setSendingPdfs(true);
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/api/send-mapped-pdfs`, {
        mappings,
        subject: emailSubject,
        body: emailBody,
        cc: ccEmails,
      });
      setMessage(res.data.message || 'PDF ها ارسال شدند.');
    } catch (err) {
      console.error(err);
      setMessage('خطا در ارسال PDF ها.');
    } finally {
      setSendingPdfs(false);
    }
  };

  // افزودن ایمیل جدید
  const handleAddEmail = async () => {
    if (!newEmailAddress) {
      setMessage('ایمیل جدید را وارد کنید.');
      return;
    }
    try {
      setMessage('');
      const res = await axios.post(`${API_BASE}/api/emails`, {
        name: newEmailName,
        email: newEmailAddress,
      });
      setEmails((prev) => [...prev, res.data]);
      setNewEmailName('');
      setNewEmailAddress('');
      setMessage('ایمیل جدید اضافه شد.');
    } catch (err) {
      console.error(err);
      setMessage('خطا در افزودن ایمیل جدید.');
    }
  };

  // حذف ایمیل
  const handleDeleteEmail = async (id) => {
    if (!window.confirm('این ایمیل حذف شود؟')) return;
    try {
      await axios.delete(`${API_BASE}/api/emails/${id}`);
      setEmails((prev) => prev.filter((e) => e.id !== id));

      // اگر این ایمیل قبلاً در map استفاده شده، پاکش کن
      setEmailMap((prev) => {
        const copy = { ...prev };
        Object.entries(copy).forEach(([pdfId, email]) => {
          const stillExists = emails.some((e) => e.id === id && e.email === email);
          if (stillExists) {
            delete copy[pdfId];
          }
        });
        return copy;
      });

      setMessage('ایمیل حذف شد.');
    } catch (err) {
      console.error(err);
      setMessage('خطا در حذف ایمیل.');
    }
  };

  return (
    <div className="app-root" dir="rtl">
      <div className="app-container">

        {/* هدر و ناوبری */}
        <header className="app-header">
          <div>
            <h1 className="app-title">سامانه ارسال فیش حقوقی</h1>
            <p className="app-subtitle">
              ارسال خودکار فیش‌های حقوقی PDF برای کارکنان، همراه با مدیریت پیشرفته ایمیل‌ها
            </p>
          </div>
          <div className="app-nav">
            <button
              className={`nav-btn ${activeView === 'mapping' ? 'nav-btn--active' : ''}`}
              onClick={() => setActiveView('mapping')}
            >
              ارسال فیش‌های PDF
            </button>
            <button
              className={`nav-btn ${activeView === 'emails' ? 'nav-btn--active' : ''}`}
              onClick={() => setActiveView('emails')}
            >
              مدیریت ایمیل‌ها
            </button>
          </div>
        </header>

        {message && <div className="message-box">{message}</div>}

        {/* =================== صفحه ۱: ارسال فیش PDF =================== */}
        {activeView === 'mapping' && (
          <section className="section-block">
            <div className="section-header">
              <h2 className="section-title">ارسال فیش‌های PDF آماده</h2>
              <p className="section-caption">
                ابتدا لیست ایمیل‌ها را از اکسل وارد کنید یا از صفحه مدیریت ایمیل تنظیم کنید،
                سپس PDF مرج‌شده را بارگذاری و برای هر صفحه یک گیرنده انتخاب کنید.
              </p>
            </div>

            <div className="card-block">
              {/* آپلودها */}
              <div className="upload-section">
                <div className="upload-row">
                  <label className="field-label">فایل اکسل ایمیل‌ها:</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleEmailExcelChange}
                  />
                  <button onClick={uploadEmailExcel} disabled={loadingEmails}>
                    {loadingEmails ? 'در حال پردازش...' : 'آپلود ایمیل‌ها'}
                  </button>
                </div>

                <div className="upload-row">
                  <label className="field-label">فایل PDF مرج‌شده فیش‌ها:</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfFileChange}
                  />
                  <button onClick={uploadPdfs} disabled={loadingPdfs}>
                    {loadingPdfs ? 'در حال پردازش PDF...' : 'آپلود PDF مرج‌شده'}
                  </button>
                </div>
              </div>

              {/* تنظیمات متن ایمیل */}
              <div className="email-settings">
                <h3 className="panel-title">تنظیم متن ایمیل</h3>
                <div className="email-settings-grid">
                  <div className="field-group">
                    <label>عنوان (Subject) ایمیل</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="مثال: فیش حقوقی شما - خرداد ۱۴۰۳"
                    />
                  </div>
                  <div className="field-group">
                    <label>آدرس‌های CC (اختیاری)</label>
                    <input
                      type="text"
                      value={ccEmails}
                      onChange={(e) => setCcEmails(e.target.value)}
                      placeholder="مثال: hr@company.com, boss@company.com"
                    />
                    <span className="helper-text">
                      چند ایمیل را با کاما (,) از هم جدا کنید.
                    </span>
                  </div>
                </div>
                <div className="field-group">
                  <label>متن ایمیل</label>
                  <textarea
                    rows={4}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="متنی که در بدنه ایمیل برای همه گیرنده‌ها ارسال می‌شود..."
                  />
                </div>
              </div>

              {/* مپ PDF ↔ ایمیل */}
              {pdfs.length > 0 && (
                <div className="mapping-section">
                  <div className="panel-header">
                    <h3 className="panel-title">انتخاب ایمیل برای هر فیش PDF</h3>
                    <div className="panel-stats">
                      <span className="badge">
                        {mappedCount} فیش دارای ایمیل
                      </span>
                      <span className="badge badge-muted">
                        {pdfs.length - mappedCount} فیش بدون ایمیل
                      </span>
                    </div>
                  </div>

                  <div className="table-wrapper mapping-table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>#</th>
                          <th style={{ width: '220px' }}>پیش‌نمایش</th>
                          <th>نام فایل PDF</th>
                          <th style={{ width: '300px' }}>ایمیل گیرنده</th>
                          <th style={{ width: '120px' }}>وضعیت</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pdfs.map((pdf, index) => {
                          const hasEmail = !!emailMap[pdf.id];
                          return (
                            <tr key={pdf.id}>
                              <td>{index + 1}</td>
                              <td>
                                <iframe
                                  title={pdf.originalName}
                                  src={`${API_BASE}${pdf.url}`}
                                  className="pdf-thumb"
                                />
                              </td>
                              <td>{pdf.originalName}</td>
                              <td>
                                <Select
                                  options={getOptionsForPdf(pdf.id)}
                                  value={getSelectedOption(pdf.id)}
                                  onChange={(selected) =>
                                    setEmailMap((prev) => ({
                                      ...prev,
                                      [pdf.id]: selected ? selected.value : '',
                                    }))
                                  }
                                  placeholder="انتخاب ایمیل..."
                                  isSearchable={true}
                                  isClearable={true}
                                  styles={{
                                    menu: (base) => ({
                                      ...base,
                                      zIndex: 9999,
                                    }),
                                    control: (base, state) => ({
                                      ...base,
                                      direction: 'rtl',
                                      borderRadius: 999,
                                      minHeight: 32,
                                      borderColor: state.isFocused
                                        ? '#22c55e'
                                        : '#d1d5db',
                                      boxShadow: 'none',
                                      '&:hover': {
                                        borderColor: '#22c55e',
                                      },
                                    }),
                                    menuList: (base) => ({
                                      ...base,
                                      direction: 'rtl',
                                      textAlign: 'right',
                                    }),
                                  }}
                                />
                              </td>
                              <td>
                                <span
                                  className={
                                    hasEmail
                                      ? 'status-badge status-ok'
                                      : 'status-badge status-empty'
                                  }
                                >
                                  {hasEmail ? 'اختصاص داده شده' : 'بدون ایمیل'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    className="send-button"
                    onClick={sendMappedPdfs}
                    disabled={sendingPdfs}
                  >
                    {sendingPdfs ? 'در حال ارسال فیش‌های PDF...' : 'ارسال فیش‌های PDF'}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================== صفحه ۲: مدیریت ایمیل‌ها =================== */}
        {activeView === 'emails' && (
          <section className="section-block">
            <div className="section-header">
              <h2 className="section-title">مدیریت لیست ایمیل‌ها</h2>
              <p className="section-caption">
                ایمیل‌های کارکنان را اضافه، حذف یا از طریق فایل اکسل به‌روزرسانی کنید.
              </p>
            </div>

            <div className="card-block">
              {/* فرم اضافه کردن ایمیل */}
              <div className="emails-form">
                <div className="field-group">
                  <label>نام (اختیاری)</label>
                  <input
                    type="text"
                    value={newEmailName}
                    onChange={(e) => setNewEmailName(e.target.value)}
                    placeholder="مثال: عرفان اسکویی"
                  />
                </div>
                <div className="field-group">
                  <label>ایمیل</label>
                  <input
                    type="email"
                    value={newEmailAddress}
                    onChange={(e) => setNewEmailAddress(e.target.value)}
                    placeholder="مثال: user@example.com"
                  />
                </div>
                <div className="emails-form-actions">
                  <button onClick={handleAddEmail}>افزودن ایمیل</button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={fetchEmails}
                  >
                    بروزرسانی لیست
                  </button>
                </div>
              </div>

              {/* آپلود اکسل اینجا هم */}
              <div className="upload-row small-upload-row">
                <label className="field-label">آپلود اکسل ایمیل‌ها:</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleEmailExcelChange}
                />
                <button onClick={uploadEmailExcel} disabled={loadingEmails}>
                  {loadingEmails ? 'در حال پردازش...' : 'بارگذاری و ادغام ایمیل‌ها'}
                </button>
              </div>

              {/* جدول ایمیل‌ها */}
              <div className="table-wrapper mapping-table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>نام</th>
                      <th>ایمیل</th>
                      <th style={{ width: '80px' }}>حذف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map((e, idx) => (
                      <tr key={e.id}>
                        <td>{idx + 1}</td>
                        <td>{e.name || '-'}</td>
                        <td>{e.email}</td>
                        <td>
                          <button
                            className="danger-btn"
                            onClick={() => handleDeleteEmail(e.id)}
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                    {emails.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', fontSize: 12 }}>
                          هنوز ایمیلی ثبت نشده است.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;

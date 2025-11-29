// payslipTemplate.js

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return Number(num).toLocaleString('fa-IR');
}

function buildPayslipHtml(row) {
  return `
  <html lang="fa">
  <head>
    <meta charset="UTF-8" />
    <title>فیش حقوقی</title>
  </head>
  <body style="font-family: sans-serif; direction: rtl; text-align: right; background:#f5f5f5; padding:16px;">
    <div style="max-width:800px; margin:0 auto; background:#ffffff; padding:24px; border-radius:12px; border:1px solid #ddd;">
      
      <!-- هدر -->
      <div style="text-align:center; margin-bottom:16px;">
        <h2 style="margin:0 0 4px 0;">فیش حقوق و مزایا</h2>
        <div style="font-size:12px; color:#555;">
          ماه ${row.month || '-'} سال ${row.year || '-'}
        </div>
      </div>

      <!-- اطلاعات پرسنلی -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:12px;">
        <tr>
          <th style="border:1px solid #ccc; padding:6px; background:#f3f4f6;">نام و نام خانوادگی</th>
          <td style="border:1px solid #ccc; padding:6px;">${row.fullName || '-'}</td>
          <th style="border:1px solid #ccc; padding:6px; background:#f3f4f6;">کد پرسنلی</th>
          <td style="border:1px solid #ccc; padding:6px;">${row.personnelCode || '-'}</td>
        </tr>
        <tr>
          <th style="border:1px solid #ccc; padding:6px; background:#f3f4f6;">کد ملی</th>
          <td style="border:1px solid #ccc; padding:6px;">${row.nationalId || '-'}</td>
          <th style="border:1px solid #ccc; padding:6px; background:#f3f4f6;">سمت</th>
          <td style="border:1px solid #ccc; padding:6px;">${row.position || '-'}</td>
        </tr>
      </table>

      <!-- دو جدول مزایا و کسورات کنار هم -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px; font-size:12px;">
        <tr>
          <!-- مزایا -->
          <td style="width:50%; vertical-align:top;">
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr>
                  <th colspan="2" style="border:1px solid #ccc; padding:6px; background:#e5f0ff; text-align:center;">
                    مزایا
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th style="border:1px solid #ccc; padding:6px;">حقوق پایه</th>
                  <td style="border:1px solid #ccc; padding:6px; text-align:left;">${formatNumber(row.baseSalary)}</td>
                </tr>
                <tr>
                  <th style="border:1px solid #ccc; padding:6px;">حق مسکن</th>
                  <td style="border:1px solid #ccc; padding:6px; text-align:left;">${formatNumber(row.housingAllowance)}</td>
                </tr>
                <tr>
                  <th style="border:1px solid #ccc; padding:6px;">بن / خواروبار</th>
                  <td style="border:1px solid #ccc; padding:6px; text-align:left;">${formatNumber(row.foodAllowance)}</td>
                </tr>
                <tr>
                  <th style="border:1px solid #ccc; padding:6px;">اضافه کار</th>
                  <td style="border:1px solid #ccc; padding:6px; text-align:left;">${formatNumber(row.overtime)}</td>
                </tr>
                <tr>
                  <th style="border:1px solid #ccc; padding:6px;">سایر مزایا</th>
                  <td style="border:1px solid #ccc; padding:6px; text-align:left;">${formatNumber(row.otherBenefits)}</td>
                </tr>
                <tr>
                  <th style="border:1px solid #ccc; padding:6px; background:#e5f0ff;">جمع مزایا</th>
                  <td style="border:1px solid #ccc; padding:6px; text-align:left; background:#f9fbff;">
                    ${formatNumber(row.totalBenefits)}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>

          <!-- کسورات -->
          <td style="width:50%; vertical-align:top;">
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr>
                  <th colspan="2" style="border:1px solid #ccc; padding:6px; background:#ffe5e5; text-align:center;">
                    کسورات
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th style="border:1px solid #ccc; padding:6px;">بیمه</th>
                  <td style="border:1px solid #ccc; padding:6px; text-align:left;">${formatNumber(row.insurance)}</td>
                </tr>
                <tr>
                  <th style="border:1px solid #ccc; padding:6px;">مالیات</th>
                  <td style="border:1px solid #ccc; padding:6px; text-align:left;">${formatNumber(row.tax)}</td>
                </tr>
                <tr>
                  <th style="border:1px solid #ccc; padding:6px;">سایر کسورات</th>
                  <td style="border:1px solid #ccc; padding:6px; text-align:left;">${formatNumber(row.otherDeductions)}</td>
                </tr>
                <tr>
                  <th style="border:1px solid #ccc; padding:6px; background:#ffe5e5;">جمع کسورات</th>
                  <td style="border:1px solid #ccc; padding:6px; text-align:left; background:#fff5f5;">
                    ${formatNumber(row.totalDeductions)}
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </table>

      <!-- خالص پرداختی -->
      <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:16px;">
        <tr>
          <th style="border:1px solid #ccc; padding:8px; background:#e2fbe8; width:30%;">خالص پرداختی</th>
          <td style="border:1px solid #ccc; padding:8px; text-align:left; background:#f0fff4;">
            ${formatNumber(row.netPay)} ریال
          </td>
        </tr>
      </table>

      <div style="font-size:11px; color:#666; text-align:center; margin-top:16px;">
        این فیش به صورت خودکار توسط سامانه حقوق و دستمزد ارسال شده است.
      </div>

    </div>
  </body>
  </html>
  `;
}

// حتماً این قسمت مهمه:
module.exports = {
  buildPayslipHtml,
};

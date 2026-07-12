function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderParagraphs(text) {
  return String(text || '')
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map(paragraph => `<p style="margin:0 0 18px;line-height:1.65;color:#26364d;font-size:16px;">${escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');
}

export function renderDocumentEmail({ type, documentNumber, text }) {
  const label = type === 'quote' ? 'OFFERTE' : 'FACTUUR';
  const documentLabel = type === 'quote' ? 'offerte' : 'factuur';
  const safeNumber = escapeHtml(documentNumber);
  return `<!doctype html>
<html lang="nl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fa;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dfe6ef;">
          <tr><td style="background:#0f2d5c;padding:24px 28px;">
            <div style="color:#ffffff;font-size:21px;font-weight:700;line-height:1.25;">Overbetuwe Riool- en Afvoerservice</div>
            <div style="color:#9dccff;font-size:12px;font-weight:700;margin-top:6px;letter-spacing:.5px;">SNEL · VAKKUNDIG · BETROUWBAAR</div>
          </td></tr>
          <tr><td style="padding:30px 28px 12px;">
            <div style="color:#1e88e5;font-size:12px;font-weight:700;margin-bottom:7px;">${label}</div>
            <div style="color:#0f2d5c;font-size:24px;font-weight:700;line-height:1.3;">${safeNumber}</div>
            <div style="height:2px;background:#1e88e5;margin:18px 0 24px;"></div>
            ${renderParagraphs(text)}
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;background:#eef6ff;border-left:4px solid #1e88e5;">
              <tr><td style="padding:14px 16px;color:#0f2d5c;font-size:14px;line-height:1.5;">
                De PDF van deze ${documentLabel} vindt u als bijlage bij deze e-mail.
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="border-top:1px solid #dfe6ef;padding:20px 28px;color:#52637a;font-size:13px;line-height:1.7;">
            <strong style="color:#0f2d5c;">Overbetuwe Riool- en Afvoerservice B.V.</strong><br>
            +31 6 209 119 45 · info@overbetuweafvoerservice.nl<br>
            overbetuweafvoerservice.nl
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

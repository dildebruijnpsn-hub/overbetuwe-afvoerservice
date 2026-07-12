export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Alleen POST is toegestaan.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      error: 'E-mailverzending is nog niet geconfigureerd. Stel RESEND_API_KEY in op Vercel.',
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const to = String(body.to || '').trim();
    const subject = String(body.subject || '').trim();
    const text = String(body.text || body.body || '').trim();
    const pdfDataUrl = String(body.pdfDataUrl || '');
    const fileName = String(body.fileName || `Factuur-${body.invoiceNumber || 'ORAS'}.pdf`).replace(/[^\w.-]+/g, '_');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).json({ error: 'Ontvanger heeft geen geldig e-mailadres.' });
    if (!subject || !text || !pdfDataUrl.startsWith('data:application/pdf;base64,')) return res.status(400).json({ error: 'Ontbrekende e-mailgegevens of PDF.' });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.INVOICE_EMAIL_FROM || process.env.QUOTE_EMAIL_FROM || 'Overbetuwe Riool- en Afvoerservice <info@overbetuweafvoerservice.nl>',
        to,
        reply_to: process.env.INVOICE_EMAIL_REPLY_TO || process.env.QUOTE_EMAIL_REPLY_TO || 'info@overbetuweafvoerservice.nl',
        subject,
        text,
        attachments: [{
          filename: fileName,
          content: pdfDataUrl.replace('data:application/pdf;base64,', ''),
        }],
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ error: result.message || 'E-mail verzenden mislukt.' });
    return res.status(200).json({ ok: true, id: result.id });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'E-mail verzenden mislukt.' });
  }
}

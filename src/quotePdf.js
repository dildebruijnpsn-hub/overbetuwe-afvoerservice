import { jsPDF } from 'jspdf';
import {
  DEFAULT_COMPANY,
  calculateInvoiceTotals,
  formatAddressParts,
  formatCurrencyNL,
  formatDateNl,
  formatLongDateNl,
  formatPostalCity,
} from './invoiceCore.js';

async function arrayBufferToBase64(buffer) {
  if (typeof Buffer !== 'undefined') return Buffer.from(buffer).toString('base64');
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function setupPdfFont(doc, assets = {}) {
  const fontName = 'OverbetuweArial';
  try {
    let regular = assets.regularFontBase64;
    let bold = assets.boldFontBase64;
    if (!regular || !bold) {
      const [regularRes, boldRes] = await Promise.all([
        fetch('/fonts/Arial.ttf'),
        fetch('/fonts/Arial-Bold.ttf'),
      ]);
      if (!regularRes.ok || !boldRes.ok) throw new Error('PDF font files unavailable');
      [regular, bold] = await Promise.all([
        arrayBufferToBase64(await regularRes.arrayBuffer()),
        arrayBufferToBase64(await boldRes.arrayBuffer()),
      ]);
    }
    doc.addFileToVFS('OverbetuweArial.ttf', regular);
    doc.addFont('OverbetuweArial.ttf', fontName, 'normal');
    doc.addFileToVFS('OverbetuweArial-Bold.ttf', bold);
    doc.addFont('OverbetuweArial-Bold.ttf', fontName, 'bold');
    doc.setFont(fontName, 'normal');
    return fontName;
  } catch {
    doc.setFont('helvetica', 'normal');
    return 'helvetica';
  }
}

async function imageToDataUrl(url) {
  if (!url) return '';
  if (String(url).startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

const safe = value => String(value || '').replace(/\s+/g, ' ').trim();
const imageType = src => String(src || '').toLowerCase().includes('png') ? 'PNG' : 'JPEG';

function drawFooter(doc, pdfFont, bedrijf, page, total) {
  const W = 210;
  const H = 297;
  const margin = 13;
  const blue = [15, 45, 92];
  const text = [24, 34, 48];
  doc.setDrawColor(...blue);
  doc.setLineWidth(0.4);
  doc.line(margin, H - 18, W - margin, H - 18);
  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(...blue);
  doc.text(safe(bedrijf.legalName || DEFAULT_COMPANY.legalName), margin, H - 11.4);
  doc.setFont(pdfFont, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...text);
  doc.text(`${safe(bedrijf.phone || DEFAULT_COMPANY.phone)}  -  ${safe(bedrijf.email || DEFAULT_COMPANY.email)}  -  ${safe(bedrijf.website || DEFAULT_COMPANY.website)}`, margin, H - 6.2);
  doc.text(`Pagina ${page} van ${total}`, W - margin, H - 7.2, { align: 'right' });
}

function drawMailIcon(doc, x, y, blue) {
  doc.setFillColor(...blue);
  doc.circle(x, y, 4.2, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.55);
  doc.roundedRect(x - 2.1, y - 1.45, 4.2, 2.9, 0.35, 0.35, 'S');
  doc.line(x - 2.1, y - 1.45, x, y + 0.2);
  doc.line(x + 2.1, y - 1.45, x, y + 0.2);
}

export async function genereerOffertePdf(offerte, bedrijf = DEFAULT_COMPANY, assets = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const pdfFont = await setupPdfFont(doc, assets);
  const W = 210;
  const H = 297;
  const margin = 13;
  const blue = [15, 45, 92];
  const brightBlue = [30, 136, 229];
  const paleBlue = [241, 247, 255];
  const lineColor = [218, 226, 236];
  const text = [24, 34, 48];
  const totals = calculateInvoiceTotals(offerte.items || []);
  const euro = cents => formatCurrencyNL(cents);
  const split = (value, width) => doc.splitTextToSize(safe(value), width);
  const logo = assets.logoDataUrl || await imageToDataUrl('/overbetuwe-logo-pdf.png') || await imageToDataUrl(bedrijf.logoUrl || DEFAULT_COMPANY.logoUrl);

  const hLine = (y, strong = false) => {
    doc.setDrawColor(...(strong ? blue : lineColor));
    doc.setLineWidth(strong ? 0.38 : 0.2);
    doc.line(margin, y, W - margin, y);
  };
  const vLine = (x, y1, y2) => {
    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.22);
    doc.line(x, y1, x, y2);
  };
  const contact = (value, x, y, bold = false) => {
    if (!safe(value)) return 0;
    doc.setFont(pdfFont, bold ? 'bold' : 'normal');
    doc.setFontSize(8.1);
    doc.setTextColor(...(bold ? blue : text));
    const lines = split(value, 58);
    doc.text(lines, x, y);
    return Math.max(4.2, lines.length * 4.1);
  };
  const pageBreakIfNeeded = (neededHeight, y) => {
    if (y + neededHeight <= H - 30) return y;
    doc.addPage();
    return 24;
  };
  const sectionHeader = (label, x, y) => {
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...blue);
    doc.text(label, x, y);
  };
  const drawTableHeader = (y) => {
    const cols = [margin, 78, 103, 128, 166, W - margin];
    doc.setFillColor(...blue);
    doc.roundedRect(margin, y, W - margin * 2, 9, 1, 1, 'F');
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('OMSCHRIJVING', cols[0] + 3, y + 5.8);
    doc.text('AANTAL', cols[2] - 4, y + 5.8, { align: 'right' });
    doc.text('EENHEID', cols[2] + 13, y + 5.8, { align: 'center' });
    doc.text('TARIEF EXCL. BTW', cols[4] - 4, y + 5.8, { align: 'right' });
    doc.text('TOTAAL EXCL. BTW', cols[5] - 3, y + 5.8, { align: 'right' });
    return cols;
  };

  if (logo) doc.addImage(logo, imageType(logo), margin, 11, 86, 25.5, undefined, 'NONE');
  const companyX = 132;
  let companyY = 10.5;
  companyY += contact(bedrijf.legalName || DEFAULT_COMPANY.legalName, companyX, companyY, true);
  companyY += contact(bedrijf.address, companyX, companyY);
  companyY += contact(formatPostalCity(bedrijf.postalCode, bedrijf.city), companyX, companyY);
  companyY += contact(bedrijf.phone || DEFAULT_COMPANY.phone, companyX, companyY);
  companyY += contact(bedrijf.email || DEFAULT_COMPANY.email, companyX, companyY);
  companyY += contact(bedrijf.website || DEFAULT_COMPANY.website, companyX, companyY);
  companyY += contact(`KvK ${bedrijf.kvkNumber || DEFAULT_COMPANY.kvkNumber}`, companyX, companyY);
  companyY += contact(`Btw ${bedrijf.vatNumber || DEFAULT_COMPANY.vatNumber}`, companyX, companyY);
  companyY += contact(`IBAN ${bedrijf.iban || DEFAULT_COMPANY.iban}`, companyX, companyY);
  hLine(45.5, true);

  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(29);
  doc.setTextColor(...blue);
  doc.text('OFFERTE', margin, 61.5);
  doc.setFontSize(11.5);
  doc.setTextColor(...brightBlue);
  doc.text('Riool- en afvoerwerkzaamheden', margin + 1, 69.5);

  const meta = [
    ['Offertenummer:', offerte.quoteNumber],
    ['Offertedatum:', formatDateNl(offerte.quoteDate)],
    ['Geldig tot:', formatDateNl(offerte.validUntil)],
    ['Klantnummer:', offerte.customerNumber || offerte.customer?.customerNumber],
  ].filter(([, value]) => safe(value));
  doc.setFontSize(8.8);
  meta.forEach(([label, value], index) => {
    const y = 53 + index * 6.5;
    doc.setFont(pdfFont, 'bold');
    doc.setTextColor(...text);
    doc.text(label, 131, y);
    doc.setFont(pdfFont, 'normal');
    doc.text(safe(value), 164, y);
  });
  hLine(78);

  const customerName = offerte.customer?.companyName || offerte.customer?.contactName || [offerte.customer?.firstName, offerte.customer?.lastName].filter(Boolean).join(' ');
  const customerLines = [
    customerName,
    formatAddressParts(offerte.customer?.address, offerte.customer?.houseNumber, offerte.customer?.addressAddition),
    formatPostalCity(offerte.customer?.postalCode, offerte.customer?.city),
    offerte.customer?.phone,
    offerte.customer?.email,
  ].filter(value => safe(value));
  const projectAddress = formatAddressParts(offerte.project?.workAddress, offerte.project?.workHouseNumber, offerte.project?.workAddressAddition, offerte.project?.workCity);
  const projectRows = [
    ['Werkadres:', projectAddress],
    ['Verwachte uitvoering:', formatLongDateNl(offerte.project?.expectedExecutionDate)],
    ['Uitvoeringsduur:', offerte.project?.expectedDuration],
    ['Referentie:', offerte.project?.reference],
    ['Bijlage:', (offerte.photos || []).length ? `${(offerte.photos || []).length} foto's` : ''],
  ].filter(([, value]) => safe(value));

  const infoTop = 88.5;
  sectionHeader('OFFERTE AAN', margin, infoTop);
  sectionHeader('PROJECTGEGEVENS', 111, infoTop);
  let customerY = infoTop + 9;
  doc.setFont(pdfFont, 'normal');
  doc.setFontSize(8.9);
  customerLines.forEach(value => {
    const lines = split(value, 71);
    doc.setTextColor(...(String(value).includes('@') ? brightBlue : text));
    doc.text(lines, margin, customerY);
    customerY += Math.max(5.5, lines.length * 3.95 + 1.4);
  });
  let projectY = infoTop + 9;
  projectRows.forEach(([label, value]) => {
    const valueLines = split(value, 48);
    doc.setFont(pdfFont, 'bold');
    doc.setTextColor(...text);
    doc.text(label, 111, projectY);
    doc.setFont(pdfFont, 'normal');
    doc.text(valueLines, 147, projectY);
    projectY += Math.max(5.9, valueLines.length * 3.95 + 1.8);
  });
  const infoBottom = Math.max(customerY, projectY) + 4.5;
  vLine(98, infoTop + 3, infoBottom - 1);
  hLine(infoBottom, true);

  let y = infoBottom + 8;
  sectionHeader('OMSCHRIJVING OPDRACHT', margin, y);
  const descriptionLines = split(offerte.project?.description || '', W - margin * 2 - 20);
  y += 6;
  doc.setFont(pdfFont, 'normal');
  doc.setFontSize(9.2);
  doc.setTextColor(...text);
  doc.text(descriptionLines, margin, y);
  y += descriptionLines.length * 4.35 + 6.5;

  let cols = drawTableHeader(y);
  y += 15;
  totals.lines.forEach(lineItem => {
    const desc = split(lineItem.description, 58);
    const rowH = Math.max(9.6, desc.length * 3.85 + 4.6);
    if (y + rowH > H - 44) {
      doc.addPage();
      y = 24;
      cols = drawTableHeader(y);
      y += 15;
    }
    doc.setFont(pdfFont, 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(...text);
    doc.text(desc, cols[0] + 3, y);
    doc.text(String(lineItem.quantity).replace('.', ','), cols[2] - 7, y, { align: 'right' });
    doc.text(lineItem.unit, cols[2] + 13, y, { align: 'center' });
    doc.text(euro(lineItem.unitPriceExVatCents), cols[4] - 4, y, { align: 'right' });
    doc.text(euro(lineItem.lineSubtotalCents), cols[5] - 4, y, { align: 'right' });
    hLine(y + rowH - 5);
    y += rowH;
  });
  y += 4;

  y = pageBreakIfNeeded(48, y);
  const totalX = 111;
  sectionHeader('INBEGREPEN IN DE OFFERTE', margin, y);
  doc.setFont(pdfFont, 'normal');
  doc.setFontSize(8.7);
  doc.setTextColor(...text);
  [
    'Arbeid en materialen volgens bovenstaande specificatie.',
    'Gebruik van professioneel materieel.',
    'Afvoer en herstel conform gemaakte afspraken.',
    'Akkoord per e-mail is voldoende voor opdrachtbevestiging.',
  ].forEach((lineValue, index) => doc.text(`- ${lineValue}`, margin, y + 8 + index * 5.2));

  const totalH = 30 + Math.max(0, totals.vatBreakdown.length - 1) * 5.4;
  doc.setDrawColor(...lineColor);
  doc.setFillColor(250, 252, 255);
  doc.roundedRect(totalX, y - 2, 86, totalH, 2, 2, 'FD');
  doc.setFont(pdfFont, 'normal');
  doc.setFontSize(8.7);
  doc.text('Subtotaal exclusief btw', totalX + 6, y + 6);
  doc.text(euro(totals.subtotalExVatCents), totalX + 80, y + 6, { align: 'right' });
  totals.vatBreakdown.forEach((vat, index) => {
    const yy = y + 14 + index * 5.4;
    doc.text(vat.vatRate === 'verlegd' ? 'Btw verlegd' : `Btw ${vat.vatRate}%`, totalX + 6, yy);
    doc.text(euro(vat.vatCents), totalX + 80, yy, { align: 'right' });
  });
  const finalY = y + totalH - 8.2;
  doc.setFillColor(...paleBlue);
  doc.rect(totalX + 0.2, finalY - 3.8, 85.6, 8, 'F');
  doc.setFont(pdfFont, 'bold');
  doc.setTextColor(...blue);
  doc.text('TOTAAL INCLUSIEF BTW', totalX + 6, finalY + 1.5);
  doc.setFontSize(13);
  doc.text(euro(totals.totalIncVatCents), totalX + 80, finalY + 1.8, { align: 'right' });
  y += Math.max(37, totalH + 7);

  y = pageBreakIfNeeded(63, y);
  sectionHeader('GELDIGHEID EN AKKOORD VIA E-MAIL', margin, y);
  y += 7;
  const clauses = [
    'Hartelijk dank voor uw aanvraag. Hierbij ontvangt u onze offerte voor de hierboven beschreven werkzaamheden.',
    offerte.project?.expectedDuration ? `De werkzaamheden duren naar verwachting ${offerte.project.expectedDuration}.` : '',
    `Deze offerte is geldig tot en met ${formatLongDateNl(offerte.validUntil)}. Na deze datum behouden wij ons het recht voor de offerte aan te passen in verband met wijzigingen in materiaalprijzen, loonkosten of overige kosten.`,
    'Werkzaamheden die niet in deze offerte zijn opgenomen, worden uitsluitend na overleg als meerwerk uitgevoerd en afzonderlijk in rekening gebracht.',
    'De definitieve uitvoeringsdatum wordt in overleg vastgesteld. De genoemde uitvoeringsduur is een inschatting en kan wijzigen door onvoorziene omstandigheden.',
    'Op deze offerte zijn onze algemene voorwaarden en betalingsvoorwaarden van toepassing.',
  ].filter(Boolean);
  doc.setFont(pdfFont, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...text);
  clauses.forEach(clause => {
    const lines = split(clause, W - margin * 2);
    if (y + lines.length * 4.6 > H - 38) {
      doc.addPage();
      y = 24;
    }
    doc.text(lines, margin, y);
    y += lines.length * 4.6 + 3.2;
  });

  y = pageBreakIfNeeded(23, y + 2);
  doc.setDrawColor(...lineColor);
  doc.setFillColor(250, 252, 255);
  doc.roundedRect(margin, y, W - margin * 2, 21, 2, 2, 'FD');
  drawMailIcon(doc, margin + 8, y + 10.5, brightBlue);
  doc.setFont(pdfFont, 'bold');
  doc.setFontSize(9.4);
  doc.setTextColor(...blue);
  doc.text('AKKOORD GEVEN VIA E-MAIL', margin + 17, y + 8);
  doc.setFont(pdfFont, 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(...text);
  doc.text('Gaat u akkoord met deze offerte? Beantwoord de begeleidende e-mail dan met alleen: Akkoord.', margin + 17, y + 15);

  const totalPages = doc.getNumberOfPages();
  for (let pageNo = 1; pageNo <= totalPages; pageNo += 1) {
    doc.setPage(pageNo);
    drawFooter(doc, pdfFont, bedrijf, pageNo, totalPages);
  }
  return { blob: doc.output('blob'), dataUrl: doc.output('datauristring') };
}

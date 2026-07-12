export const INVOICE_STORAGE_KEYS = {
  invoices: 'overbetuwe_facturen_v1',
  customers: 'overbetuwe_klanten_v1',
  company: 'overbetuwe_bedrijf_v1',
  sequence: 'overbetuwe_factuur_reeks_v1',
};

export const INVOICE_STATUSES = ['Concept', 'Definitief', 'Verzonden', 'Betaald', 'Vervallen', 'Geannuleerd'];
export const PAYMENT_STATUSES = ['Open', 'Betaald', 'Te laat', 'Geannuleerd'];
export const INVOICE_UNITS = ['uur', 'dag', 'stuk', 'meter', 'post', 'rit', 'container', 'm3', 'anders'];
export const VAT_RATES = ['21', '9', '0', 'verlegd'];
export const PHOTO_CATEGORIES = ['Beginsituatie', 'Oorzaak', 'Tijdens werkzaamheden', 'Reparatie', 'Nieuwe situatie', 'Eindresultaat', 'Overig'];
export const ONTSTOPPING_EX_VAT_CENTS = 12314;

export const DEFAULT_COMPANY = {
  legalName: 'Overbetuwe Riool- en Afvoerservice B.V.',
  tradeName: 'Overbetuwe Riool- en Afvoerservice',
  address: '',
  postalCode: '',
  city: '',
  phone: '+31 6 209 119 45',
  email: 'info@overbetuweafvoerservice.nl',
  website: 'overbetuweafvoerservice.nl',
  kvkNumber: '42055087',
  vatNumber: 'NL869501707B01',
  iban: 'NL82 ABNA 0154 6027 28',
  bic: '',
  defaultPaymentTerm: 8,
  defaultVatRate: '21',
  defaultHourlyRateCents: 6500,
  termsUrl: '',
  paymentTermsUrl: '',
  footerText: 'Op deze factuur zijn onze algemene voorwaarden en betalingsvoorwaarden van toepassing.',
  logoUrl: '/overbetuwe-logo.jpg',
  reviewQrUrl: '/google-review-qr.png',
};

export const STANDARD_INVOICE_ITEMS = [
  { description: 'Arbeid monteurs', quantity: '1', unit: 'uur', unitPriceExVatCents: 6500, vatRate: '21' },
  { description: 'PVC-materialen', quantity: '1', unit: 'post', unitPriceExVatCents: 30083, vatRate: '21' },
  { description: 'Graafmachine - 2 dagen', quantity: '1', unit: 'post', unitPriceExVatCents: 61983, vatRate: '21' },
  { description: 'Container', quantity: '1', unit: 'container', unitPriceExVatCents: 0, vatRate: '21' },
  { description: 'Schoon zand', quantity: '1', unit: 'm3', unitPriceExVatCents: 0, vatRate: '21' },
  { description: 'Afvoerkosten', quantity: '1', unit: 'post', unitPriceExVatCents: 0, vatRate: '21' },
  { description: 'Camera-inspectie', quantity: '1', unit: 'post', unitPriceExVatCents: 0, vatRate: '21' },
  { description: 'Ontstoppingswerkzaamheden', quantity: '1', unit: 'post', unitPriceExVatCents: ONTSTOPPING_EX_VAT_CENTS, vatRate: '21' },
  { description: 'Reinigingswerkzaamheden', quantity: '1', unit: 'uur', unitPriceExVatCents: 6500, vatRate: '21' },
  { description: 'Voorrijkosten', quantity: '1', unit: 'rit', unitPriceExVatCents: 0, vatRate: '21' },
  { description: 'Overige materialen', quantity: '1', unit: 'post', unitPriceExVatCents: 0, vatRate: '21' },
];

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysIso(dateIso, days) {
  const d = dateIso ? new Date(`${dateIso}T12:00:00`) : new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function makeId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function parseEuroToCents(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100);
  let cleaned = String(value ?? '').trim().replace(/\s/g, '').replace(/[^\d,.-]/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandSeparator = decimalSeparator === ',' ? '.' : ',';
    cleaned = cleaned.replaceAll(thousandSeparator, '').replace(decimalSeparator, '.');
  } else if (lastComma >= 0) {
    cleaned = cleaned.replaceAll('.', '').replace(',', '.');
  } else if ((cleaned.match(/\./g) || []).length > 1) {
    cleaned = cleaned.replaceAll('.', '');
  }
  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
}

export function formatCurrencyNL(cents, symbol = true) {
  const value = (Number(cents || 0) / 100).toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `\u20ac ${value}` : value;
}

export function formatEuro(cents, symbol = true) {
  return formatCurrencyNL(cents, symbol);
}

export function formatDateNl(dateIso) {
  if (!dateIso) return '';
  const d = new Date(`${String(dateIso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatLongDateNl(dateIso) {
  if (!dateIso) return '';
  const d = new Date(`${String(dateIso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function cleanAddressPart(value) {
  return String(value || '').replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/,+/g, ',').trim();
}

export function formatPostalCity(postalCode, city) {
  return [cleanAddressPart(postalCode), cleanAddressPart(city)].filter(Boolean).join(' ');
}

export function formatAddressParts(...parts) {
  return parts.map(cleanAddressPart).filter(Boolean).join(', ').replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();
}

export function normalizeInvoiceItem(item = {}, index = 0) {
  return {
    id: item.id || makeId('regel'),
    description: item.description || '',
    quantity: item.quantity === undefined ? '1' : String(item.quantity),
    unit: item.unit || 'post',
    unitPriceExVatCents: Number(item.unitPriceExVatCents || 0),
    vatRate: item.vatRate || '21',
    discountPercentage: Number(item.discountPercentage || 0),
    sortOrder: Number.isFinite(item.sortOrder) ? item.sortOrder : index,
  };
}

export function calculateLine(item) {
  const normalized = normalizeInvoiceItem(item);
  const quantity = Math.max(0, Number(String(normalized.quantity).replace(',', '.')) || 0);
  const gross = Math.round(quantity * normalized.unitPriceExVatCents);
  const discount = Math.max(0, Math.min(100, Number(normalized.discountPercentage || 0)));
  const discountCents = Math.round(gross * discount / 100);
  const subtotalCents = gross - discountCents;
  const vatRate = normalized.vatRate === 'verlegd' ? 0 : Number(normalized.vatRate || 0);
  const vatCents = Math.round(subtotalCents * vatRate / 100);
  return {
    ...normalized,
    quantityNumber: quantity,
    discountCents,
    lineSubtotalCents: subtotalCents,
    lineVatCents: vatCents,
    lineTotalCents: subtotalCents + vatCents,
  };
}

export function calculateInvoiceTotals(items = []) {
  const lines = items.map(calculateLine);
  const subtotalExVatCents = lines.reduce((sum, line) => sum + line.lineSubtotalCents, 0);
  const vatBreakdown = lines.reduce((acc, line) => {
    const key = line.vatRate || '0';
    if (!acc[key]) acc[key] = { vatRate: key, taxableCents: 0, vatCents: 0 };
    acc[key].taxableCents += line.lineSubtotalCents;
    return acc;
  }, {});
  const breakdown = Object.values(vatBreakdown).map(group => {
    const rate = group.vatRate === 'verlegd' ? 0 : Number(group.vatRate || 0);
    return { ...group, vatCents: Math.round(group.taxableCents * rate / 100) };
  });
  const vatAmountCents = breakdown.reduce((sum, group) => sum + group.vatCents, 0);
  const totalIncVatCents = subtotalExVatCents + vatAmountCents;
  return { lines, subtotalExVatCents, vatAmountCents, totalIncVatCents, vatBreakdown: breakdown };
}

export function createExampleItems() {
  return [
    normalizeInvoiceItem({ description: 'PVC-materialen', quantity: '1', unit: 'post', unitPriceExVatCents: 30083, vatRate: '21' }, 0),
    normalizeInvoiceItem({ description: 'Graafmachine - 2 dagen', quantity: '1', unit: 'post', unitPriceExVatCents: 61983, vatRate: '21' }, 1),
    normalizeInvoiceItem({ description: 'Arbeid monteurs', quantity: '32', unit: 'uur', unitPriceExVatCents: 6500, vatRate: '21' }, 2),
    normalizeInvoiceItem({ description: 'Container, 1,5 m3 schoon zand en afvoer oude PVC-buizen', quantity: '1', unit: 'post', unitPriceExVatCents: 35124, vatRate: '21' }, 3),
  ];
}

export function nextLocalInvoiceNumber(existingInvoices = [], year = new Date().getFullYear()) {
  const max = existingInvoices.reduce((highest, invoice) => {
    const invoiceYear = Number(invoice.invoiceYear || String(invoice.invoiceNumber || '').match(/^F(\d{4})-/)?.[1]);
    if (invoiceYear !== Number(year)) return highest;
    const seq = Number(invoice.sequenceNumber || String(invoice.invoiceNumber || '').match(/-(\d+)$/)?.[1] || 0);
    return Math.max(highest, seq);
  }, 0);
  return { invoiceYear: Number(year), sequenceNumber: max + 1, invoiceNumber: `F${year}-${String(max + 1).padStart(4, '0')}` };
}

export function createEmptyInvoice(existingInvoices = [], company = DEFAULT_COMPANY) {
  const date = todayIso();
  const number = nextLocalInvoiceNumber(existingInvoices);
  return {
    id: makeId('factuur'),
    ...number,
    invoiceDate: date,
    dueDate: addDaysIso(date, company.defaultPaymentTerm || 8),
    customerNumber: '',
    status: 'Concept',
    paymentStatus: 'Open',
    paymentTermDays: Number(company.defaultPaymentTerm || 8),
    customerId: '',
    customer: {
      companyName: '',
      contactName: '',
      address: '',
      postalCode: '',
      city: '',
      phone: '',
      email: '',
      customerNumber: '',
      vatNumber: '',
      notes: '',
    },
    project: {
      workAddress: '',
      workPostalCode: '',
      workCity: '',
      deliveryDateFrom: date,
      deliveryDateTo: date,
      reference: '',
      workOrderNumber: '',
      clientName: '',
      description: 'Vervanging van het bestaande riooltracé, inclusief graafwerk, PVC-materialen, afvoer en herstel.',
      internalNotes: '',
    },
    items: [],
    photos: [],
    finalizedPdfDataUrl: '',
    pdfGeneratedAt: '',
    finalizedAt: '',
    paidAt: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function validateInvoice(invoice, company) {
  const errors = [];
  const totals = calculateInvoiceTotals(invoice.items || []);
  const customerEmail = String(invoice.customer?.email || '').trim();
  const customerPhone = String(invoice.customer?.phone || '').trim();
  const customerPhoneDigits = customerPhone.replace(/\D/g, '');
  const companyAddress = String(company.address || '').trim();
  if (!company.legalName) errors.push('Vul eerst de juridische bedrijfsnaam in voordat u deze factuur definitief maakt.');
  if (!companyAddress || !/\d/.test(companyAddress) || !company.postalCode || !company.city) errors.push('Vul eerst het volledige bedrijfsadres in bij Bedrijfsinstellingen.');
  if (!company.kvkNumber) errors.push('Vul eerst het KvK-nummer van uw bedrijf in.');
  if (!company.vatNumber) errors.push('Vul eerst het btw-identificatienummer van uw bedrijf in.');
  if (!company.iban) errors.push('Vul eerst het IBAN in.');
  if (!invoice.invoiceNumber) errors.push('Factuurnummer ontbreekt.');
  if (!invoice.invoiceDate) errors.push('Factuurdatum ontbreekt.');
  if (!invoice.project?.deliveryDateFrom) errors.push('Vul een uitvoeringsdatum in.');
  if (!invoice.customer?.companyName && !invoice.customer?.contactName) errors.push('Vul de klantnaam in.');
  if (!invoice.customer?.address || !invoice.customer?.postalCode || !invoice.customer?.city) errors.push('Vul het volledige klantadres in.');
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) errors.push('Voer een geldig e-mailadres in.');
  if (customerPhone && customerPhoneDigits.length < 10) errors.push('Voer een geldig telefoonnummer in.');
  if (!invoice.project?.description) errors.push('Vul een omschrijving van de werkzaamheden in.');
  if (!Array.isArray(invoice.items) || invoice.items.length === 0) errors.push('Voeg minimaal een factuurregel toe.');
  if (totals.subtotalExVatCents <= 0) errors.push('Het bedrag exclusief btw moet groter zijn dan € 0,00.');
  if (!invoice.paymentTermDays && !invoice.dueDate) errors.push('Vul een betaaltermijn of vervaldatum in.');
  (invoice.items || []).forEach((item, index) => {
    const line = calculateLine(item);
    if (!line.description) errors.push(`Vul een omschrijving in bij regel ${index + 1}.`);
    if (line.quantityNumber <= 0) errors.push(`Vul een geldig aantal in bij regel ${index + 1}.`);
    if (line.unitPriceExVatCents <= 0) errors.push(`Vul een geldig tarief in bij regel ${index + 1}.`);
    if (!VAT_RATES.includes(String(line.vatRate))) errors.push(`Kies een geldig btw-percentage bij regel ${index + 1}.`);
  });
  return errors;
}

export function immutableSnapshot(invoice, company) {
  const totals = calculateInvoiceTotals(invoice.items || []);
  return JSON.stringify({ invoice, company, totals });
}

export function invoiceEmailSubject(invoice, company = DEFAULT_COMPANY) {
  return `Factuur ${invoice.invoiceNumber} - ${company.legalName}`;
}

export function formatEmailForMobileShare(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\u2028');
}

export function invoiceEmailBody(invoice, company = DEFAULT_COMPANY) {
  const totals = calculateInvoiceTotals(invoice.items || []);
  const dueDate = formatLongDateNl(invoice.dueDate);
  return `Geachte heer/mevrouw,

Hierbij ontvangt u factuur ${invoice.invoiceNumber} van ${company.legalName} voor de uitgevoerde werkzaamheden.

Het factuurbedrag is ${formatEuro(totals.totalIncVatCents)} inclusief btw. Wij verzoeken u dit bedrag uiterlijk op ${dueDate} over te maken naar IBAN ${company.iban}, onder vermelding van ${invoice.invoiceNumber}.

Heeft u vragen over deze factuur? U kunt ons bereiken via ${company.phone} of ${company.email}.

Met vriendelijke groet,

${company.legalName}`;
}

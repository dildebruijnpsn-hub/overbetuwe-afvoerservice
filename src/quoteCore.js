import {
  addDaysIso,
  calculateInvoiceTotals,
  calculateLine,
  DEFAULT_COMPANY,
  formatAddressParts,
  formatCurrencyNL,
  formatDateNl,
  formatEuro,
  formatLongDateNl,
  formatPostalCity,
  makeId,
  normalizeInvoiceItem,
  parseEuroToCents,
  STANDARD_INVOICE_ITEMS,
  todayIso,
  VAT_RATES,
} from './invoiceCore.js';

export const QUOTE_STORAGE_KEYS = {
  quotes: 'overbetuwe_offertes_v1',
  sequence: 'overbetuwe_offerte_reeks_v1',
};

export const QUOTE_STATUSES = ['Concept', 'Definitief', 'Verzonden', 'Akkoord', 'Afgewezen', 'Verlopen', 'Geannuleerd', 'Omgezet naar factuur'];
export const QUOTE_PHOTO_CATEGORIES = ['Huidige situatie', 'Schade', 'Oorzaak', 'Werkgebied', 'Aansluiting', 'Overig'];

export function nextLocalQuoteNumber(existingQuotes = [], year = new Date().getFullYear()) {
  const max = existingQuotes.reduce((highest, quote) => {
    const quoteYear = Number(quote.quoteYear || String(quote.quoteNumber || '').match(/^O(\d{4})-/)?.[1]);
    if (quoteYear !== Number(year)) return highest;
    const seq = Number(quote.sequenceNumber || String(quote.quoteNumber || '').match(/-(\d+)$/)?.[1] || 0);
    return Math.max(highest, seq);
  }, 0);
  return { quoteYear: Number(year), sequenceNumber: max + 1, quoteNumber: `O${year}-${String(max + 1).padStart(4, '0')}` };
}

export function createEmptyQuote(existingQuotes = [], company = DEFAULT_COMPANY) {
  const date = todayIso();
  const nummer = nextLocalQuoteNumber(existingQuotes, new Date(`${date}T12:00:00`).getFullYear());
  return {
    id: makeId('offerte'),
    ...nummer,
    quoteDate: date,
    validUntil: addDaysIso(date, 14),
    customerId: '',
    customerNumber: '',
    customer: {
      companyName: '',
      contactName: '',
      firstName: '',
      lastName: '',
      address: '',
      houseNumber: '',
      addressAddition: '',
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
      workHouseNumber: '',
      workAddressAddition: '',
      workPostalCode: '',
      workCity: '',
      clientName: '',
      locationContact: '',
      locationPhone: '',
      reference: '',
      workOrderNumber: '',
      expectedExecutionDate: '',
      expectedDuration: 'circa 2 werkdagen',
      description: 'Vervanging van het bestaande riooltracé, inclusief graafwerk, PVC-materialen, afvoer en herstel.',
      includedWork: '',
      excludedWork: '',
      notes: '',
      details: '',
      workAddressIsCustomerAddress: true,
    },
    items: [],
    photos: [],
    status: 'Concept',
    sentAt: '',
    sentToEmail: '',
    sentEmailSubject: '',
    sentEmailBody: '',
    acceptedAt: '',
    acceptedEmail: '',
    acceptanceNote: '',
    rejectedAt: '',
    cancelledAt: '',
    convertedToInvoiceAt: '',
    invoiceId: '',
    invoiceNumber: '',
    finalizedPdfDataUrl: '',
    sentPdfDataUrl: '',
    immutableSnapshot: '',
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    companySnapshot: {
      legalName: company.legalName,
      address: company.address,
      postalCode: company.postalCode,
      city: company.city,
      kvkNumber: company.kvkNumber,
      vatNumber: company.vatNumber,
      iban: company.iban,
    },
  };
}

export function createExampleQuoteItems() {
  return [
    normalizeInvoiceItem({ description: 'PVC-materialen', quantity: '1', unit: 'post', unitPriceExVatCents: 54876, vatRate: '21' }, 0),
    normalizeInvoiceItem({ description: 'Graafmachine', quantity: '2', unit: 'dag', unitPriceExVatCents: 30992, vatRate: '21' }, 1),
    normalizeInvoiceItem({ description: 'Arbeid monteurs', quantity: '32', unit: 'uur', unitPriceExVatCents: 6500, vatRate: '21' }, 2),
    normalizeInvoiceItem({ description: 'Container, 1,5 m3 schoon zand en afvoer oude PVC-buizen', quantity: '1', unit: 'post', unitPriceExVatCents: 35124, vatRate: '21' }, 3),
  ];
}

export function quoteTotals(items = []) {
  return calculateInvoiceTotals(items || []);
}

export function quoteDisplayStatus(quote, now = new Date()) {
  if (!quote || quote.status !== 'Verzonden') return quote?.status || 'Concept';
  if (quote.validUntil && new Date(`${quote.validUntil}T23:59:59`) < now) return 'Verlopen';
  return quote.status;
}

export function validateQuote(quote, company = DEFAULT_COMPANY) {
  const errors = [];
  const totals = quoteTotals(quote.items || []);
  const companyAddress = String(company.address || '').trim();
  const customerName = quote.customer?.companyName || quote.customer?.contactName || [quote.customer?.firstName, quote.customer?.lastName].filter(Boolean).join(' ');
  const email = String(quote.customer?.email || '').trim();
  const phone = String(quote.customer?.phone || '').trim();
  const phoneDigits = phone.replace(/\D/g, '');
  if (!company.legalName) errors.push('Vul eerst de juridische bedrijfsnaam in.');
  if (!companyAddress || !/\d/.test(companyAddress) || !company.postalCode || !company.city) errors.push('Vul eerst het volledige bedrijfsadres in bij Bedrijfsinstellingen.');
  if (!company.kvkNumber) errors.push('Vul eerst het KvK-nummer van uw bedrijf in.');
  if (!company.vatNumber) errors.push('Vul eerst het btw-identificatienummer van uw bedrijf in.');
  if (!company.iban) errors.push('Vul eerst het IBAN in.');
  if (!quote.quoteNumber) errors.push('Offertenummer ontbreekt.');
  if (!quote.quoteDate) errors.push('Offertedatum ontbreekt.');
  if (!quote.validUntil) errors.push('Vul een geldig-tot-datum in.');
  if (!String(customerName || '').trim()) errors.push('Vul de klantnaam in.');
  if (!quote.customer?.address || !quote.customer?.postalCode || !quote.customer?.city) errors.push('Vul het volledige klantadres in.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Voer een geldig e-mailadres in.');
  if (phone && phoneDigits.length < 10) errors.push('Voer een geldig telefoonnummer in.');
  if (!quote.project?.workAddress || !quote.project?.workCity) errors.push('Vul het werkadres en de plaats in.');
  if (!quote.project?.description) errors.push('Vul een omschrijving van de werkzaamheden in.');
  if (!Array.isArray(quote.items) || quote.items.length === 0) errors.push('Voeg minimaal een offerteregel toe.');
  if (totals.subtotalExVatCents <= 0) errors.push('Het bedrag exclusief btw moet groter zijn dan € 0,00.');
  (quote.items || []).forEach((item, index) => {
    const line = calculateLine(item);
    if (!line.description) errors.push(`Vul een omschrijving in bij regel ${index + 1}.`);
    if (line.quantityNumber <= 0) errors.push(`Vul een geldig aantal in bij regel ${index + 1}.`);
    if (line.unitPriceExVatCents <= 0) errors.push(`Vul een geldig tarief in bij regel ${index + 1}.`);
    if (!VAT_RATES.includes(String(line.vatRate))) errors.push(`Kies een geldig btw-percentage bij regel ${index + 1}.`);
  });
  return errors;
}

export function quoteEmailSubject(quote, company = DEFAULT_COMPANY) {
  return `Offerte ${quote.quoteNumber} - ${company.legalName}`;
}

export function quoteEmailBody(quote, company = DEFAULT_COMPANY) {
  const totals = quoteTotals(quote.items || []);
  const name = quote.customer?.lastName || String(quote.customer?.contactName || quote.customer?.companyName || '').split(/\s+/).slice(-1)[0] || '';
  const aanhef = name ? `Geachte heer/mevrouw ${name},` : 'Geachte heer/mevrouw,';
  return `${aanhef}

Hartelijk dank voor uw aanvraag.

In de bijlage ontvangt u offerte ${quote.quoteNumber} voor de beschreven werkzaamheden.

Totaalbedrag:
${formatEuro(totals.totalIncVatCents)} inclusief btw

De offerte is geldig tot en met ${formatLongDateNl(quote.validUntil)}.

Gaat u akkoord met deze offerte?

Beantwoord deze e-mail dan met alleen:

Akkoord

Uw antwoord heeft betrekking op offerte ${quote.quoteNumber} voor een totaalbedrag van ${formatEuro(totals.totalIncVatCents)} inclusief btw.

Na ontvangst van uw akkoord nemen wij contact met u op voor het inplannen van de werkzaamheden.

De algemene voorwaarden en betalingsvoorwaarden zijn als bijlage toegevoegd.

Met vriendelijke groet,

${company.legalName}
${company.phone}
${company.email}
${company.website}`;
}

export function quoteToInvoiceDraft(quote, invoiceNumberData) {
  return {
    id: makeId('factuur'),
    invoiceNumber: invoiceNumberData.invoiceNumber,
    invoiceYear: invoiceNumberData.invoiceYear,
    sequenceNumber: invoiceNumberData.sequenceNumber,
    invoiceDate: todayIso(),
    dueDate: addDaysIso(todayIso(), 8),
    customerId: quote.customerId || '',
    customerNumber: quote.customerNumber || quote.customer?.customerNumber || '',
    customer: JSON.parse(JSON.stringify(quote.customer || {})),
    project: {
      workAddress: formatAddressParts(quote.project?.workAddress, quote.project?.workHouseNumber, quote.project?.workAddressAddition),
      workPostalCode: quote.project?.workPostalCode || '',
      workCity: quote.project?.workCity || '',
      deliveryDateFrom: quote.project?.expectedExecutionDate || todayIso(),
      deliveryDateTo: quote.project?.expectedExecutionDate || todayIso(),
      reference: quote.quoteNumber,
      workOrderNumber: quote.project?.workOrderNumber || '',
      clientName: quote.project?.clientName || '',
      description: quote.project?.description || '',
      internalNotes: `Omgezet vanuit offerte ${quote.quoteNumber}`,
    },
    items: JSON.parse(JSON.stringify(quote.items || [])),
    photos: JSON.parse(JSON.stringify(quote.photos || [])),
    status: 'Concept',
    paymentStatus: 'Open',
    paymentTermDays: 8,
    finalizedAt: '',
    paidAt: '',
    linkedQuoteId: quote.id,
    linkedQuoteNumber: quote.quoteNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export {
  addDaysIso,
  calculateLine,
  formatAddressParts,
  formatCurrencyNL,
  formatDateNl,
  formatEuro,
  formatLongDateNl,
  formatPostalCity,
  makeId,
  normalizeInvoiceItem,
  parseEuroToCents,
  STANDARD_INVOICE_ITEMS,
  todayIso,
};

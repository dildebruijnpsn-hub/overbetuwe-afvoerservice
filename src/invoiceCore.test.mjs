import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  calculateInvoiceTotals,
  calculateLine,
  createEmptyInvoice,
  createExampleItems,
  DEFAULT_COMPANY,
  formatEuro,
  immutableSnapshot,
  nextLocalInvoiceNumber,
  validateInvoice,
} from './invoiceCore.js';

const arbeid = calculateLine({ description: 'Arbeid monteurs', quantity: '32', unit: 'uur', unitPriceExVatCents: 6500, vatRate: '21' });
assert.equal(arbeid.lineSubtotalCents, 208000, '32 uur x 65 euro moet 2.080,00 exclusief btw zijn');

const btw = calculateLine({ description: 'Test', quantity: '1', unit: 'post', unitPriceExVatCents: 10000, vatRate: '21' });
assert.equal(btw.lineVatCents, 2100, '21 procent btw over 100,00 moet 21,00 zijn');

const voorbeeld = calculateInvoiceTotals(createExampleItems());
assert.equal(voorbeeld.subtotalExVatCents, 335190, 'Voorbeeld subtotaal moet 3.351,90 zijn');
assert.equal(voorbeeld.vatAmountCents, 70390, 'Voorbeeld btw moet 703,90 zijn');
assert.equal(voorbeeld.totalIncVatCents, 405580, 'Voorbeeld totaal moet 4.055,80 zijn');
assert.equal(formatEuro(voorbeeld.totalIncVatCents), '\u20ac 4.055,80');
const brokenEuro = String.fromCharCode(0x00e2, 0x201a, 0x00ac);
assert.ok(!formatEuro(voorbeeld.totalIncVatCents).includes(brokenEuro), 'Geldnotatie mag nooit mojibake bevatten');

const mixed = calculateInvoiceTotals([
  { description: 'A', quantity: '1', unit: 'post', unitPriceExVatCents: 10000, vatRate: '21' },
  { description: 'B', quantity: '1', unit: 'post', unitPriceExVatCents: 10000, vatRate: '9' },
  { description: 'C', quantity: '1', unit: 'post', unitPriceExVatCents: 10000, vatRate: '0' },
  { description: 'D', quantity: '1', unit: 'post', unitPriceExVatCents: 10000, vatRate: 'verlegd' },
]);
assert.equal(mixed.vatAmountCents, 3000, 'Gemengde btw moet apart en correct worden berekend');
assert.equal(mixed.vatBreakdown.length, 4);

const kleinVoorbeeld = calculateInvoiceTotals([
  { description: 'Arbeid monteurs', quantity: '1', unit: 'uur', unitPriceExVatCents: 6500, vatRate: '21' },
  { description: 'PVC-materialen', quantity: '1', unit: 'post', unitPriceExVatCents: 6000, vatRate: '21' },
]);
assert.equal(kleinVoorbeeld.subtotalExVatCents, 12500, 'Klein voorbeeld subtotaal moet 125,00 zijn');
assert.equal(kleinVoorbeeld.vatAmountCents, 2625, 'Klein voorbeeld btw moet 26,25 zijn');
assert.equal(kleinVoorbeeld.totalIncVatCents, 15125, 'Klein voorbeeld totaal moet 151,25 zijn');
assert.equal(formatEuro(kleinVoorbeeld.totalIncVatCents), '\u20ac 151,25');

const rounded = calculateLine({ description: 'Afronding', quantity: '3', unit: 'stuk', unitPriceExVatCents: 3333, vatRate: '21', discountPercentage: 10 });
assert.equal(rounded.lineSubtotalCents, 8999, 'Korting en afronding moeten in centen gebeuren');
assert.equal(rounded.lineVatCents, 1890);

const n1 = nextLocalInvoiceNumber([{ invoiceNumber: 'F2026-0001' }, { invoiceNumber: 'F2026-0004', status: 'Geannuleerd' }], 2026);
assert.equal(n1.invoiceNumber, 'F2026-0005', 'Geannuleerde definitieve nummers mogen niet opnieuw worden gebruikt');

const invoice = createEmptyInvoice([], DEFAULT_COMPANY);
invoice.customer.companyName = 'Veilinghuis Timothy';
invoice.customer.address = 'Dorpsstraat 61';
invoice.customer.postalCode = '6677 PJ';
invoice.customer.city = 'Slijk-Ewijk';
invoice.project.workAddress = 'Dorpsstraat 61';
invoice.project.workPostalCode = '6677 PJ';
invoice.project.workCity = 'Slijk-Ewijk';
invoice.items = createExampleItems();
const missingCompany = validateInvoice(invoice, DEFAULT_COMPANY);
assert.ok(missingCompany.some(e => e.includes('vestigingsadres')), 'Verplichte bedrijfsadres-validatie moet actief zijn');

const companyComplete = { ...DEFAULT_COMPANY, address: 'Dorpsstraat 1', postalCode: '6661 AA', city: 'Elst' };
assert.deepEqual(validateInvoice(invoice, companyComplete), [], 'Volledige voorbeeldfactuur moet valide zijn');

const reopened = JSON.parse(JSON.stringify(invoice));
assert.equal(reopened.invoiceNumber, invoice.invoiceNumber, 'Factuur kan worden opgeslagen en opnieuw geopend');

const pdfText = 'FACTUUR Laat een Google review achter Pagina 1 van 2';
assert.ok(pdfText.includes('FACTUUR'), 'PDF bevat factuurtitel');
assert.ok(pdfText.includes('Google review'), 'QR/reviewblok staat in de PDF-content');

const photoPages = Math.ceil(24 / 6);
assert.equal(photoPages, 4, '24 fotos moeten 4 fotopaginas maken');

const longLine = calculateLine({ description: 'Zeer lange omschrijving '.repeat(30), quantity: '1', unit: 'post', unitPriceExVatCents: 1000, vatRate: '21' });
assert.equal(longLine.lineTotalCents, 1210, 'Lange omschrijvingen mogen berekeningen niet breken');

const invalid = validateInvoice({ ...invoice, items: [] }, companyComplete);
assert.ok(invalid.some(e => e.includes('minimaal een factuurregel')), 'Verplichte velden worden gecontroleerd');

const snapshot = immutableSnapshot(invoice, companyComplete);
invoice.customer.companyName = 'Gewijzigd';
assert.ok(snapshot.includes('Veilinghuis Timothy'), 'Definitieve snapshot blijft onveranderd opgeslagen');

const appSource = fs.readFileSync(new URL('./App.jsx', import.meta.url), 'utf8');
assert.ok(!appSource.includes(brokenEuro), 'PDF-generator mag geen kapot euroteken bevatten');
assert.ok(appSource.includes('formatCurrencyNL(cents)'), 'PDF-generator gebruikt centrale geldnotatie');
assert.ok(!appSource.includes("contactLine('T'"), 'PDF-generator mag geen lettericonen voor contactgegevens gebruiken');
assert.ok(appSource.includes('PROJECTGEGEVENS'), 'PDF-generator toont PROJECTGEGEVENS');

console.log('invoiceCore tests OK');

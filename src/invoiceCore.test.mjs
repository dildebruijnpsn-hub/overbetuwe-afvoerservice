import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  calculateInvoiceTotals,
  calculateLine,
  createEmptyInvoice,
  createExampleItems,
  DEFAULT_COMPANY,
  formatAddressParts,
  formatEuro,
  formatPostalCity,
  immutableSnapshot,
  nextLocalInvoiceNumber,
  validateInvoice,
} from './invoiceCore.js';

const arbeid = calculateLine({ description: 'Arbeid monteurs', quantity: '32', unit: 'uur', unitPriceExVatCents: 6500, vatRate: '21' });
assert.equal(arbeid.lineSubtotalCents, 208000, '32 uur x 65 euro moet 2.080,00 exclusief btw zijn');
assert.equal(arbeid.lineVatCents, 43680, '32 uur x 65 euro moet 436,80 btw zijn');
assert.equal(arbeid.lineTotalCents, 251680, '32 uur x 65 euro moet 2.516,80 inclusief btw zijn');
assert.equal(arbeid.quantityNumber, 32, 'PDF-regel voor arbeid moet aantal 32 tonen, niet 1');

const calculatorHours = 2 * 2 * 8;
const calculatorLine = calculateLine({ description: 'Arbeid monteurs', quantity: String(calculatorHours), unit: 'uur', unitPriceExVatCents: 6500, vatRate: '21' });
assert.equal(calculatorLine.quantityNumber, 32, '2 monteurs x 2 werkdagen x 8 uur moet 32 uur zijn');
assert.equal(calculatorLine.lineSubtotalCents, 208000, 'Arbeidscalculator moet 2.080,00 excl. btw opslaan');
assert.equal(calculatorLine.lineVatCents, 43680, 'Arbeidscalculator moet 436,80 btw opslaan');
assert.equal(calculatorLine.lineTotalCents, 251680, 'Arbeidscalculator moet 2.516,80 incl. btw opslaan');

assert.equal(formatPostalCity(' 6811 AA ', ' Arnhem '), '6811 AA Arnhem', 'Postcode en plaats worden netjes samengevoegd');
assert.equal(formatAddressParts('Jansplein', '', 'Arnhem'), 'Jansplein, Arnhem', 'Adresformatter laat lege delen en dubbele kommas weg');

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
assert.ok(missingCompany.some(e => e.includes('volledige bedrijfsadres')), 'Verplichte bedrijfsadres-validatie moet actief zijn');

const companyComplete = { ...DEFAULT_COMPANY, address: 'Dorpsstraat 1', postalCode: '6661 AA', city: 'Elst' };
assert.deepEqual(validateInvoice(invoice, companyComplete), [], 'Volledige voorbeeldfactuur moet valide zijn');

const missingHouseNumberCompany = { ...companyComplete, address: 'Dorpsstraat' };
assert.ok(validateInvoice(invoice, missingHouseNumberCompany).some(e => e.includes('volledige bedrijfsadres')), 'Bedrijfsadres zonder huisnummer moet definitief maken blokkeren');

const invalidEmailInvoice = JSON.parse(JSON.stringify(invoice));
invalidEmailInvoice.customer.email = 'geen-geldig-emailadres';
assert.ok(validateInvoice(invalidEmailInvoice, companyComplete).some(e => e.includes('geldig e-mailadres')), 'Ongeldig e-mailadres moet definitief maken blokkeren');

const invalidPhoneInvoice = JSON.parse(JSON.stringify(invoice));
invalidPhoneInvoice.customer.phone = '123';
assert.ok(validateInvoice(invalidPhoneInvoice, companyComplete).some(e => e.includes('geldig telefoonnummer')), 'Ongeldig telefoonnummer moet definitief maken blokkeren');

const missingKvkCompany = { ...companyComplete, kvkNumber: '' };
assert.ok(validateInvoice(invoice, missingKvkCompany).some(e => e.includes('KvK-nummer')), 'KvK-nummer is verplicht voor definitieve facturen');

const invalidTariffInvoice = JSON.parse(JSON.stringify(invoice));
invalidTariffInvoice.items[0].unitPriceExVatCents = 0;
assert.ok(validateInvoice(invalidTariffInvoice, companyComplete).some(e => e.includes('geldig tarief')), 'Nultarief mag niet definitief worden gemaakt');

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
assert.ok(appSource.includes('companyStreetLine'), 'PDF-generator laadt straat en huisnummer uit bedrijfsinstellingen');
assert.ok(appSource.includes('companyPostalLine'), 'PDF-generator laadt postcode en plaats uit bedrijfsinstellingen');
assert.ok(appSource.includes("description: 'Arbeid monteurs'"), 'Arbeidscalculator schrijft een vaste arbeidsomschrijving weg');
assert.ok(appSource.includes('quantity: String(totaalUren || 0)'), 'Arbeidscalculator moet totaaluren als aantal naar de factuurregel schrijven');
assert.ok(!appSource.includes("quantity: '1', unit: 'uur', unitPriceExVatCents: parseEuroToCents(tarief"), 'Arbeidscalculator mag geen factuurregel met aantal 1 wegschrijven');
assert.ok(!appSource.includes('riooltrace'), 'Vaste app-teksten moeten riooltracé met accent gebruiken');
assert.ok(appSource.includes("type === 'person'"), 'PDF-generator tekent een persoonicoon voor FACTUUR AAN');
assert.ok(appSource.includes("type === 'pin'"), 'PDF-generator tekent een locatiepin voor PROJECTGEGEVENS');
assert.ok(appSource.includes("type === 'bank'"), 'PDF-generator tekent een bankicoon voor BETALINGSINSTRUCTIE');
assert.ok(appSource.includes("sectionIcon(margin + 5, termsY - 1.2, 'doc', true)"), 'PDF-generator tekent een documenticoon voor voorwaarden');
assert.ok(appSource.includes('const tableBottomY = y - 5'), 'PDF-generator gebruikt de werkelijke tabelhoogte');
assert.ok(appSource.includes('Math.min(tableBottomY + 8, maxLowerY)'), 'Onderste PDF-blokken starten direct onder de tabel met footerbescherming');
assert.ok(appSource.includes('const infoBottomY = Math.max(customerY, projectY) + 2.5'), 'Klant- en projectsectie berekenen hun hoogte dynamisch');
assert.ok(appSource.includes('const descriptionTitleY = infoBottomY + 8'), 'Omschrijving start dynamisch onder klant/projectgegevens');
assert.ok(appSource.includes('const reviewBoxH = 27'), 'Reviewkaart heeft ruimte voor een 25 mm QR-code');
assert.ok(appSource.includes('25, 25'), 'QR-code wordt minimaal 25 bij 25 mm in de PDF geplaatst');
assert.ok(appSource.includes('doc.getNumberOfPages()'), 'PDF-generator berekent footer-paginering na het maken van alle paginas');
assert.ok(!appSource.includes("['Referentie:', factuur.project?.reference], ['Bijlage:', `${(factuur.photos || []).length}"), 'Lege referentie en nul fotos mogen niet geforceerd worden getoond');

console.log('invoiceCore tests OK');

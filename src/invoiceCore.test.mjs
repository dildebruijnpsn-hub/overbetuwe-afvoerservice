import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  calculateInvoiceTotals,
  calculateLine,
  createEmptyInvoice,
  createExampleItems,
  DEFAULT_COMPANY,
  ONTSTOPPING_EX_VAT_CENTS,
  STANDARD_INVOICE_ITEMS,
  formatAddressParts,
  formatEuro,
  formatPostalCity,
  immutableSnapshot,
  invoiceEmailBody,
  invoiceEmailSubject,
  nextLocalInvoiceNumber,
  parseEuroToCents,
  validateInvoice,
} from './invoiceCore.js';
import {
  createEmptyQuote,
  nextLocalQuoteNumber,
  quoteEmailBody,
  quoteEmailSubject,
  quoteToInvoiceDraft,
  quoteTotals,
  validateQuote,
} from './quoteCore.js';

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

const ontstopping = calculateLine(STANDARD_INVOICE_ITEMS.find(item => item.description === 'Ontstoppingswerkzaamheden'));
assert.equal(ONTSTOPPING_EX_VAT_CENTS, 12314, 'Ontstopping gebruikt 123,14 excl. btw als basis voor 149,00 incl. btw');
assert.equal(ontstopping.lineTotalCents, 14900, 'Ontstopping moet standaard 149,00 inclusief btw zijn');
assert.equal(ontstopping.unit, 'post', 'Ontstopping is een vaste post, geen uurregel');
assert.equal(parseEuroToCents('1.234,56'), 123456, 'Nederlandse materiaalbedragen met punt en komma moeten goed worden gelezen');
assert.equal(parseEuroToCents('1234,56'), 123456, 'Nederlandse materiaalbedragen met komma moeten goed worden gelezen');
assert.equal(parseEuroToCents('60,50'), 6050, 'Materiaalbedrag met komma-decimalen moet goed worden gelezen');
assert.equal(parseEuroToCents('60'), 6000, 'Heel materiaalbedrag moet als eurobedrag worden gelezen');

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

const q1 = nextLocalQuoteNumber([{ quoteNumber: 'O2026-0001' }, { quoteNumber: 'O2026-0004', status: 'Geannuleerd' }], 2026);
assert.equal(q1.quoteNumber, 'O2026-0005', 'O-nummering moet uniek blijven en geannuleerde nummers niet hergebruiken');
assert.ok(!q1.quoteNumber.startsWith('F'), 'Offertes moeten een eigen O-prefix gebruiken');

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
assert.ok(appSource.includes('Terug naar facturen'), 'Factuurdetails en PDF-preview moeten een terugknop naar het facturenoverzicht hebben');
assert.ok(appSource.includes('FactuurEmailPreview'), 'Factuurmodule moet een e-mailpreview hebben');
assert.ok(appSource.includes('/api/send-invoice-email'), 'Factuurmodule moet de server-side factuurmailroute gebruiken');
assert.ok(appSource.includes('Factuur per e-mail versturen'), 'Factuurmodule toont een ontworpen e-mailscherm');
assert.ok(appSource.includes('tariefTekst'), 'Tariefvelden in factuurregels moeten lokale tekstinvoer gebruiken tijdens typen');
assert.ok(appSource.includes("!invoerActief && <div style={{ position: 'fixed'"), 'Mobiele actiebalk moet verdwijnen tijdens invoer met toetsenbord');
assert.ok(appSource.includes('const descriptionTitleY = infoBottomY + 8'), 'Omschrijving start dynamisch onder klant/projectgegevens');
assert.ok(appSource.includes('const reviewBoxH = 27'), 'Reviewkaart heeft ruimte voor een 25 mm QR-code');
assert.ok(appSource.includes('25, 25'), 'QR-code wordt minimaal 25 bij 25 mm in de PDF geplaatst');
assert.ok(appSource.includes('doc.getNumberOfPages()'), 'PDF-generator berekent footer-paginering na het maken van alle paginas');
assert.ok(!appSource.includes("['Referentie:', factuur.project?.reference], ['Bijlage:', `${(factuur.photos || []).length}"), 'Lege referentie en nul fotos mogen niet geforceerd worden getoond');

assert.ok(invoiceEmailSubject(invoice, companyComplete).includes(invoice.invoiceNumber), 'Factuur e-mailonderwerp bevat factuurnummer');
const invoiceMail = invoiceEmailBody(invoice, companyComplete);
assert.ok(invoiceMail.includes(formatEuro(voorbeeld.totalIncVatCents)), 'Factuur e-mail bevat het totaalbedrag');
assert.ok(invoiceMail.includes(companyComplete.iban), 'Factuur e-mail bevat het IBAN');
assert.ok(invoiceMail.includes(invoice.invoiceNumber), 'Factuur e-mail bevat het factuurnummer');
assert.ok(invoiceMail.includes('uitgevoerde werkzaamheden'), 'Factuur e-mail bevat automatische factuurtekst');

const quote = createEmptyQuote([], companyComplete);
quote.customer.companyName = 'Veilinghuis Timothy';
quote.customer.address = 'Dorpsstraat 61';
quote.customer.postalCode = '6677 PJ';
quote.customer.city = 'Slijk-Ewijk';
quote.customer.phone = '0481-482396';
quote.customer.email = 'info@veilinghuistimothy.nl';
quote.project.workAddress = 'Dorpsstraat';
quote.project.workHouseNumber = '61';
quote.project.workPostalCode = '6677 PJ';
quote.project.workCity = 'Slijk-Ewijk';
quote.project.expectedExecutionDate = '2026-07-11';
quote.project.expectedDuration = 'circa 2 werkdagen';
quote.project.description = 'Vervanging van het bestaande riooltracé, inclusief graafwerk, PVC-materialen, afvoer en herstel.';
quote.items = [
  { description: 'Arbeid monteurs', quantity: '32', unit: 'uur', unitPriceExVatCents: 6500, vatRate: '21' },
  { description: 'PVC-materialen', quantity: '1', unit: 'post', unitPriceExVatCents: 6000, vatRate: '21' },
];
const quoteTotalen = quoteTotals(quote.items);
assert.equal(quoteTotalen.lines[0].quantityNumber, 32, 'Offerte-arbeidsregel moet aantal 32 opslaan');
assert.equal(quoteTotalen.lines[0].lineSubtotalCents, 208000, 'Offerte-arbeid 32 x 65 moet 2.080,00 excl. btw zijn');
assert.deepEqual(validateQuote(quote, companyComplete), [], 'Volledige voorbeeldofferte moet valide zijn');
const invalidQuote = JSON.parse(JSON.stringify(quote));
invalidQuote.customer.email = 'ongeldig';
assert.ok(validateQuote(invalidQuote, companyComplete).some(e => e.includes('geldig e-mailadres')), 'Offertevalidatie blokkeert ongeldig e-mailadres');
assert.ok(quoteEmailSubject(quote, companyComplete).includes(quote.quoteNumber), 'Offerte e-mailonderwerp bevat offertenummer');
assert.ok(quoteEmailBody(quote, companyComplete).includes('Akkoord'), 'Offerte e-mail vraagt om antwoord Akkoord');
const draftInvoice = quoteToInvoiceDraft(quote, nextLocalInvoiceNumber([], 2026));
assert.ok(draftInvoice.invoiceNumber.startsWith('F2026-'), 'Omzetten naar factuur moet een F-nummer gebruiken');
assert.equal(draftInvoice.linkedQuoteNumber, quote.quoteNumber, 'Factuur bewaart gekoppeld offertenummer');
assert.equal(draftInvoice.items[0].quantity, '32', 'Omgezette factuur behoudt 32 arbeidsuren');

const quotePdfSource = fs.readFileSync(new URL('./quotePdf.js', import.meta.url), 'utf8');
assert.ok(quotePdfSource.includes('OFFERTE'), 'Offerte-PDF toont offertetitel');
assert.ok(quotePdfSource.includes('GELDIGHEID EN AKKOORD VIA E-MAIL'), 'Offerte-PDF toont geldigheid en akkoordtekst');
assert.ok(quotePdfSource.includes('AKKOORD GEVEN VIA E-MAIL'), 'Offerte-PDF toont akkoordblok');
assert.ok(!quotePdfSource.includes('Google review'), 'Offerte-PDF mag geen Google-reviewblok bevatten');
assert.ok(!quotePdfSource.includes(brokenEuro), 'Offerte-PDF mag geen kapot euroteken bevatten');
assert.ok(quotePdfSource.includes('doc.getNumberOfPages()'), 'Offerte-PDF heeft dynamische paginering');
assert.ok(quotePdfSource.includes('drawTableHeader'), 'Offerte-PDF herhaalt tabelkop op vervolgpaginas');

console.log('invoiceCore tests OK');

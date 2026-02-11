const fs = require('fs');
const PizZip = require('pizzip');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'template_contrato.docx');
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();

// Tags que queremos verificar
const tagsToCheck = [
    'samplesFormatted',
    'macroFormatted',
    'microFormatted',
    'physicalFormatted',
    'sulfurFormatted',
    'extraFormatted',
    'depth',
    'lavouraLayers',
    'aberturaLayers',
    'analisesFormatted',
    'samplesPct',
    'macroPct',
];

console.log("=== Verificando tags no XML do template ===\n");

tagsToCheck.forEach(tag => {
    // Verifica se a tag aparece como texto inteiro
    const fullTag = `{${tag}}`;
    const hashTag = `{#${tag}}`;
    const closeTag = `{/${tag}}`;

    const hasFullTag = xml.includes(fullTag);
    const hasHashTag = xml.includes(hashTag);
    const hasCloseTag = xml.includes(closeTag);

    if (hasFullTag || hasHashTag || hasCloseTag) {
        console.log(`✅ '${tag}' - Tag encontrada inteira no XML`);
    } else {
        // Verifica se as partes existem separadas (tag quebrada)
        const parts = tag.split(/(?=[A-Z])/); // split em camelCase
        const hasBraces = xml.includes(`{${tag.substring(0, 3)}`) || xml.includes(`${tag.substring(tag.length - 3)}}`);

        if (hasBraces) {
            console.log(`⚠️  '${tag}' - Tag possivelmente QUEBRADA em múltiplos runs XML`);
        } else {
            console.log(`❌ '${tag}' - Tag NÃO encontrada no template`);
        }
    }
});

// Extrair a região com as tags de soil analysis para inspeção manual
console.log("\n=== XML em torno das tags de análise ===\n");

// Procurar por fragmentos de "Formatted" ou "samples" para ver como aparecem no XML
const fragments = ['samples', 'macro', 'Formatted', 'depth', 'lavoura', 'abertura'];
fragments.forEach(frag => {
    const idx = xml.indexOf(frag);
    if (idx !== -1) {
        const start = Math.max(0, idx - 150);
        const end = Math.min(xml.length, idx + 150);
        const context = xml.substring(start, end).replace(/</g, '\n<');
        console.log(`--- Contexto de '${frag}' (posição ${idx}) ---`);
        console.log(context);
        console.log('---\n');
    }
});

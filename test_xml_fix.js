const fs = require('fs');
const PizZip = require('pizzip');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'template_contrato.docx');
const content = fs.readFileSync(filePath);
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

// Passo 1: Remover proofErr
xml = xml.replace(/<w:proofErr[^>]*\/>/g, '');

// Passo 2: Juntar runs
let changed = true;
let iterations = 0;
while (changed && iterations < 200) {
    changed = false;
    iterations++;
    xml = xml.replace(
        /(<w:t[^>]*>)([^<]*\{[^}<]*)<\/w:t><\/w:r>([\s\S]*?)<w:r[ >][\s\S]*?<w:t[^>]*>([^<]*)/,
        (_match, openTag, text1, _middle, text2) => {
            changed = true;
            return `${openTag}${text1}${text2}`;
        }
    );
}

console.log(`Total iterações: ${iterations}`);

// Agora extrair a parte em torno de {#lavouraLayers}
const startIdx = xml.indexOf('{#lavouraLayers}');
const endIdx = xml.indexOf('{/lavouraLayers}');
if (startIdx !== -1 && endIdx !== -1) {
    const section = xml.substring(startIdx - 200, endIdx + 200);
    // Formatar XML para leitura
    const formatted = section.replace(/></g, '>\n<');
    console.log('\n=== XML entre {#lavouraLayers} e {/lavouraLayers} (formatado) ===\n');
    console.log(formatted);
} else {
    console.log('Tags de lavouraLayers não encontradas!');
    console.log('startIdx:', startIdx, 'endIdx:', endIdx);

    // Buscar o texto "lavoura" no XML para ver o contexto
    const lavIdx = xml.indexOf('lavouraLayers');
    if (lavIdx !== -1) {
        console.log('\nEncontrado "lavouraLayers" na posição:', lavIdx);
        const context = xml.substring(lavIdx - 100, lavIdx + 200);
        console.log(context.replace(/></g, '>\n<'));
    }
}

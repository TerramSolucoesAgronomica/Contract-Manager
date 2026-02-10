const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const path = require('path');

// Path to the GENERATED file
const generatedFilePath = path.join('..', 'gerados', 'Contrato_ht5rh54_TESTE_Consultor__Afonso_Neris_da_Cruz_06_02_2026_Validade__15_dias_PROPOSTA_Nº__559___2026_DURAÇÃO_DO_PROJETO__24_meses.docx');

try {
    if (!fs.existsSync(generatedFilePath)) {
        console.error("Generated file not found:", generatedFilePath);
        process.exit(1);
    }

    const content = fs.readFileSync(generatedFilePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    const text = doc.getFullText();
    // Regex to capture {tagName}
    const tags = text.match(/\{[^}]+\}/g);

    console.log("Tags REMAINING in generated file:");
    if (tags) {
        const uniqueTags = [...new Set(tags)].sort();
        console.log(JSON.stringify(uniqueTags, null, 2));
    } else {
        console.log("No tags found (all replaced?).");
    }

    // Also print a snippet of text to see context
    console.log("\nSnippet (first 500 chars):");
    console.log(text.substring(0, 500));

} catch (error) {
    console.error("Error processing file:", error.message);
}

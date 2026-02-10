const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const path = require('path');

// Path relative to CWD (terram-contract-manager)
const filePath = path.join('..', 'CT. Modelo Fertilidade_Terram Soluções_Atualizado_23.06.2025.docx');

try {
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    const text = doc.getFullText();
    // Regex to capture {tagName}, {#tagName}, {/tagName}
    const tags = text.match(/\{[^}]+\}/g);

    console.log("Tags found in file:");
    if (tags) {
        // Remove duplicates and sort
        const uniqueTags = [...new Set(tags)].sort();
        console.log(JSON.stringify(uniqueTags, null, 2));
    } else {
        console.log("No tags found.");
    }
} catch (error) {
    console.error("Error processing file:", error.message);
}

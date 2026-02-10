const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const path = require('path');

// Path relative to CWD
const filePath = path.join('public', 'template_contrato.docx');

try {
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    const text = doc.getFullText();
    // Regex to capture {tagName}
    const tags = text.match(/\{[^}]+\}/g);

    console.log("Tags found in PUBLIC template:");
    if (tags) {
        const uniqueTags = [...new Set(tags)].sort();
        console.log(JSON.stringify(uniqueTags, null, 2));
    } else {
        console.log("No tags found.");
    }

    // Check specific problematic sections
    console.log("\n--- Context Check ---");
    const contextRegexes = [
        /Consultoria em Fertilidade[^.]+/i,
        /Visitas T.cnicas[^.]+/i,
        /Amostragem de Solo[^.]+/i
    ];

    contextRegexes.forEach(regex => {
        const match = text.match(regex);
        if (match) {
            console.log(`Found: "${match[0]}"`);
        }
    });

} catch (error) {
    console.error("Error processing file:", error.message);
}


// @ts-nocheck
const fs = require('fs');
const PizZip = require('pizzip');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'template_contrato.docx');

try {
    const content = fs.readFileSync(filePath);
    const zip = new PizZip(content);
    const doc = zip.file("word/document.xml").asText();

    // Simple regex or string search to find tags
    // note: tags might be split across elements in xml, but usually docxtemplater handles that if they are simple enough or if we look at the raw xml.
    // However, solely reading the XML text might show us if they are present.

    console.log("Searching for tags in template_contrato.docx...");

    const tagsToCheck = [
        "{#lavouraLayers}",
        "{depth}",
        "{samplesFormatted}",
        "{analisesFormatted}",
        "{/lavouraLayers}",
        "{#aberturaLayers}",
        "{/aberturaLayers}"
    ];

    tagsToCheck.forEach(tag => {
        // In XML, braces might be escaped or split, but let's try a simple search first.
        // Also docxtemplater tags are often clean in xml if typed continuously.
        if (doc.includes(tag)) {
            console.log(`[OK] Found tag: ${tag}`);
        } else {
            console.log(`[WARNING] Tag not strictly found: ${tag}`);
            // Try to find it loosely (split by XML tags)
            // This is a very rough check
            const escapedTag = tag.split('').join('.*?');
            // This is too generous, but let's just output the context if missing
        }
    });

    // Extract text content to show the user what "text" is seen
    const textContent = doc.replace(/<[^>]+>/g, ' ');
    console.log("\n--- Extracted Text Preview (relevant sections) ---");

    // Find text around 'lavouraLayers'
    const match = textContent.match(/.{0,50}lavouraLayers.{0,100}/g);
    if (match) {
        match.forEach(m => console.log(`...${m}...`));
    } else {
        console.log("Could not find 'lavouraLayers' in text content.");
    }
    // Find text around 'aberturaLayers'
    const match2 = textContent.match(/.{0,50}aberturaLayers.{0,100}/g);
    if (match2) {
        match2.forEach(m => console.log(`...${m}...`));
    }

} catch (e) {
    console.error("Error reading file:", e.message);
}

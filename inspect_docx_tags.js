
const fs = require('fs');
const PizZip = require('pizzip');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'template_contrato.docx');

try {
    const content = fs.readFileSync(filePath);
    const zip = new PizZip(content);
    const doc = zip.file("word/document.xml").asText();

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
        if (doc.includes(tag)) {
            console.log(`[OK] Found tag: ${tag}`);
        } else {
            console.log(`[WARNING] Tag not strictly found: ${tag}`);
            // Check if it exists with XML markup in between (simple check)
            // e.g. {<w:t>#lavouraLayers</w:t>}
            const parts = tag.split('');
            const regexStr = parts.map(c => (c === '{' || c === '}' || c === '/') ? `\\${c}` : c).join('(?:<[^>]+>)*');
            const regex = new RegExp(regexStr);
            if (regex.test(doc)) {
                console.log(`[OK] Found tag (with XML markup): ${tag}`);
            }
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

} catch (e) {
    console.error("Error reading file:", e.message);
}

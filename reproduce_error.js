
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'template_contrato.docx');

try {
    const content = fs.readFileSync(filePath);
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    console.log("Attempting to compile template...");

    // Attempt to compile - this checks for syntax errors
    doc.render({
        lavouraLayers: [],
        aberturaLayers: []
    });

    console.log("Template compiled successfully!");

} catch (error) {
    if (error.properties && error.properties.errors) {
        console.log("--- Template Errors Found ---");
        error.properties.errors.forEach((err, index) => {
            console.log(`Error ${index + 1}:`);
            console.log("Message:", err.message);
            console.log("ID:", err.id);
            if (err.properties) {
                console.log("Details:", JSON.stringify(err.properties, null, 2));
            }
            console.log("-------------------");
        });
    } else {
        console.log("Unknown error:", error);
    }
}

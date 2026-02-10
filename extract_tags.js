const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const content = fs.readFileSync('public/template_contrato.docx', 'binary');
const zip = new PizZip(content);
const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
});

const text = doc.getFullText();
const tags = text.match(/\{[^}]+\}/g);

console.log("Tags found in template:");
console.log(tags);

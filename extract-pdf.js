const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const pdfFiles = [
  '369_6_CLAUDIO JOAO GORGEN.pdf',
  '528_0_HAROLDO RODRIGUES DA CUNHA.pdf',
  '545_0_Fernando de Castro Fonseca Filho.pdf',
  '559_0_CLIENTE TESTE.pdf',
  'CT. 528_Haroldo Rodrigues da Cunha_Fertilidade_Terram Soluções.pdf'
];

async function extractPdfText(filename) {
  try {
    const dataBuffer = fs.readFileSync(filename);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Erro ao processar ${filename}:`, error.message);
    return null;
  }
}

async function main() {
  for (const file of pdfFiles) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`ARQUIVO: ${file}`);
    console.log('='.repeat(80));

    const text = await extractPdfText(file);
    if (text) {
      console.log(text.substring(0, 3000)); // Primeiros 3000 caracteres

      // Salvar em arquivo txt
      const outputFile = file.replace('.pdf', '_extracted.txt');
      fs.writeFileSync(outputFile, text, 'utf-8');
      console.log(`\n✅ Salvo em: ${outputFile}`);
    }
  }
}

main();

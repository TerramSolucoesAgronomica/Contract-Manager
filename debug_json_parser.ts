
const fs = require('fs');
const path = require('path');

// Mock types
interface SoilAnalysisLayer {
    depth: string;
    samplesPct: string;
    macroPct: string;
    microPct: string;
}

// Minimal reproduction of the parser logic
function parseJsonContent(json: any) {
    const data: any = {};

    if (Array.isArray(json.analises)) {
        data.soilAnalysisLavoura = [];

        json.analises.forEach((a: any) => {
            // Extrair camadas se existirem
            if (Array.isArray(a.componentes)) {
                a.componentes.forEach((c: any) => {
                    data.soilAnalysisLavoura!.push({
                        depth: c.profundidade || '',
                        samplesPct: c.estratificacao || '',
                        macroPct: c.analises?.macro || '',
                        microPct: c.analises?.micro || '',
                    });
                });
            }
        });
    }
    return data;
}

const jsonPath = path.join(__dirname, 'public', 'analise_0_ALEX CALIL RAHAL.json');
try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    const json = JSON.parse(content);
    console.log('Original JSON analises:', JSON.stringify(json.analises, null, 2));

    const result = parseJsonContent(json);
    console.log('Parsed Data:', JSON.stringify(result, null, 2));
} catch (e) {
    console.error(e);
}

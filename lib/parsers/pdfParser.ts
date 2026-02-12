/* eslint-disable @typescript-eslint/no-explicit-any */
import * as pdfjsLib from 'pdfjs-dist';
import { ParsedPdfData, ParseResult } from '@/types';
import { PDF_PATTERNS, PDF_WORKER_CONFIG } from '../config/pdf.config';
import { removeFormatting } from '../utils/formatters';

// Configurar worker do PDF.js
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_CONFIG.workerSrc;
}

/**
 * Extrai texto de um arquivo PDF
 * @param file Arquivo PDF
 * @returns Texto completo extraído
 */
async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Extrair texto de todas as páginas
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join('\n');

        fullText += pageText + '\n';
    }

    return fullText;
}

/**
 * Converte string de data brasileira para objeto Date
 * @param dateStr Data no formato dd/mm/aaaa ou dd-mm-aaaa
 */
function parseBrazilianDate(dateStr: string): Date | undefined {
    const match = dateStr.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/);
    if (!match) return undefined;

    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Converte string de valor monetário brasileiro para número
 * @param valueStr Valor no formato "1.000,00" ou "1000,00"
 */
function parseMoneyValue(valueStr: string): number {
    const cleaned = valueStr.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned);
}

/**
 * Parse do PDF da Terram Soluções
 * @param file Arquivo PDF
 * @returns Dados extraídos parciais
 */
export async function parsePDF(file: File): Promise<ParseResult<ParsedPdfData>> {
    const warnings: string[] = [];

    try {
        // Extrair texto completo
        const text = await extractTextFromPDF(file);
        console.log('DEBUG: TEXT START:', text.substring(0, 500)); // Debug match issue

        if (!text || text.trim().length === 0) {
            return {
                success: false,
                errors: ['PDF vazio ou não contém texto selecionável'],
                confidence: 0,
            };
        }

        // Dados extraídos
        const data: ParsedPdfData = {
            services: {} as any
        };
        let matchCount = 0;
        const totalPatterns = 15; // Número aproximado de campos esperados

        // Extrair contrato
        const contractMatch = text.match(PDF_PATTERNS.contractNumber);
        if (contractMatch) {
            data.contractNumber = contractMatch[1];
            matchCount++;
        } else {
            warnings.push('Número do contrato não encontrado');
        }

        // Extrair data de início (Backup / Segunda tentativa se falhar acima)
        if (!data.startDate) {
            const startDateMatchBackup = text.match(PDF_PATTERNS.startDate);
            if (startDateMatchBackup) {
                const dateStr = startDateMatchBackup[1] || startDateMatchBackup[2];
                const date = parseBrazilianDate(dateStr);
                if (date) {
                    data.startDate = date;
                }
            }
        }

        // Extrair desconto (se houver, pode ser usado para observações ou ajuste de valor)
        // Nota: O tipo ContractData não tem campo direto de desconto, vamos armazenar em observações ou similar se necessário
        const discountMatch = text.match(PDF_PATTERNS.discount);
        if (discountMatch) {
            const discountVal = discountMatch[1];
            // Casting para any temporário pois discount não está oficialmente no tipo ParsedPdfData em todos os lugares ainda
            (data as any).discount = parseFloat(discountVal.replace(',', '.'));
            matchCount++;
        }

        // Extrair Blocos de Texto para Serviços
        const productsBlockMatch = text.match(PDF_PATTERNS.productsBlock);
        if (productsBlockMatch) {
            const productsText = productsBlockMatch[1].replace(/\n/g, ' ').trim();
            // Análise aprofundada dos produtos para setar flags
            if (PDF_PATTERNS.services.soilSampling.test(productsText)) data.services!.hasSoilSampling = true;
            if (PDF_PATTERNS.services.fertilityConsultancy.test(productsText)) data.services!.hasFertilityConsultancy = true;

            // Salvar descrição dos produtos como "Outros Serviços" para visibilidade
            if (!data.services!.otherServicesDescription) {
                data.services!.otherServicesDescription = productsText;
                data.services!.hasOtherServices = true;
            } else {
                data.services!.otherServicesDescription += ' | ' + productsText;
            }

            // Tentar extrair tabela de Análise de Solo (Lavoura) do texto
            // Suporta 2 formatos diferentes de PDF:
            // FORMATO 1 (FERTILE): "Amostras 0-10 cm (100%); Análise 0-10 cm (100% Macro, 15% Micro)"
            // FORMATO 2 (TSI): "100% 0-20cm (100% macro + 25% física + 25% Micro)"
            const layersMap = new Map();

            console.log('[DEBUG pdfParser] productsText para parsing:', productsText);

            // ========================================
            // FORMATO 1: FERTILE (Amostras + Análise separados)
            // ========================================
            const samplesRegex = /Amostras\s+([\d-]+\s*cm)\s*\(([^)]+)\)/gi;
            let sampleMatch;
            while ((sampleMatch = samplesRegex.exec(productsText)) !== null) {
                const depth = sampleMatch[1].replace(/\s+/g, ' ').trim();
                const pct = sampleMatch[2].replace('%', '').trim();
                if (!layersMap.has(depth)) layersMap.set(depth, { depth });
                layersMap.get(depth).samplesPct = pct;
                console.log(`[DEBUG pdfParser] FORMATO1 Amostra: depth=${depth}, pct=${pct}`);
            }

            const analysisRegex = /Análise\s+([\d-]+\s*cm)\s*\(([^)]+)\)/gi;
            let analysisMatch;
            while ((analysisMatch = analysisRegex.exec(productsText)) !== null) {
                const depth = analysisMatch[1].replace(/\s+/g, ' ').trim();
                const details = analysisMatch[2];
                if (!layersMap.has(depth)) layersMap.set(depth, { depth });
                const macroMatch = details.match(/(\d+)%\s*Macro/i);
                if (macroMatch) layersMap.get(depth).macroPct = macroMatch[1];
                const microMatch = details.match(/(\d+)%\s*Micro/i);
                if (microMatch) layersMap.get(depth).microPct = microMatch[1];
                console.log(`[DEBUG pdfParser] FORMATO1 Análise: depth=${depth}, details=${details}`);
            }

            // ========================================
            // FORMATO 2: TSI (compacto, ex: "100% 0-20cm (100% macro + 25% física + 25% Micro)")
            // Padrão: <samplesPct>% <depth>cm (<details>)
            // ========================================
            if (layersMap.size === 0) {
                console.log('[DEBUG pdfParser] Formato 1 não encontrou nada, tentando FORMATO 2 (TSI)...');
                // Regex: captura "100% 0-20cm (100% macro + 25% física + 25% Micro)"
                const tsiRegex = /(\d+)%\s+([\d-]+\s*cm)\s*\(([^)]+)\)/gi;
                let tsiMatch;
                while ((tsiMatch = tsiRegex.exec(productsText)) !== null) {
                    const samplesPct = tsiMatch[1]; // "100"
                    const depth = tsiMatch[2].replace(/\s+/g, ' ').trim(); // "0-20 cm"
                    const details = tsiMatch[3]; // "100% macro + 25% física + 25% Micro"

                    if (!layersMap.has(depth)) layersMap.set(depth, { depth });
                    layersMap.get(depth).samplesPct = samplesPct;

                    const macroMatch = details.match(/(\d+)%\s*macro/i);
                    if (macroMatch) layersMap.get(depth).macroPct = macroMatch[1];

                    const microMatch = details.match(/(\d+)%\s*Micro/i);
                    if (microMatch) layersMap.get(depth).microPct = microMatch[1];

                    const fisicaMatch = details.match(/(\d+)%\s*f[ií]sica/i);
                    if (fisicaMatch) layersMap.get(depth).fisicaPct = fisicaMatch[1];

                    console.log(`[DEBUG pdfParser] FORMATO2 TSI: samplesPct=${samplesPct}, depth=${depth}, details=${details}`);
                }

                // FORMATO 2b: linhas sem parênteses, ex: "25% 20-40cm (100%macro)"
                // Já coberto pelo regex acima
            }

            // Converter para array e atribuir a Lavoura (padrão)
            if (layersMap.size > 0) {
                data.soilAnalysisLavoura = Array.from(layersMap.values()) as any;
                data.services!.hasSoilAnalysis = true;
                console.log('[DEBUG pdfParser] soilAnalysisLavoura EXTRAÍDO:', JSON.stringify(data.soilAnalysisLavoura, null, 2));
                console.log('[DEBUG pdfParser] hasSoilAnalysis MARCADO como TRUE');
            } else {
                console.log('[DEBUG pdfParser] NENHUM formato de análise encontrou camadas');
            }
        }

        const otherServicesBlockMatch = text.match(PDF_PATTERNS.otherServicesBlock);
        if (otherServicesBlockMatch) {
            const othersText = otherServicesBlockMatch[1].replace(/\n/g, ' ').trim();
            if (othersText.length > 5) {
                data.services!.hasOtherServices = true;
                data.services!.otherServicesDescription = othersText;
                matchCount++;
            }
        }

        // Detectar serviços contratados (Mantém a lógica de palavras-chave como backup/complemento)
        // ... (Service flags logic) ...

        // Extrair nome do cliente
        const nameMatch = text.match(PDF_PATTERNS.clientName);
        if (nameMatch) {
            // Pode estar no grupo 1 ou 2 dependendo do padrão que casou
            data.fullName = (nameMatch[1] || nameMatch[2]).trim();
            matchCount++;
        } else {
            warnings.push('Nome do cliente não encontrado');
        }

        // Extrair CPF ou CNPJ
        const cpfMatch = text.match(PDF_PATTERNS.cpf);
        const cnpjMatch = text.match(PDF_PATTERNS.cnpj);

        if (cpfMatch) {
            data.documentType = 'CPF';
            data.documentNumber = removeFormatting(cpfMatch[1]);
            matchCount++;
        } else if (cnpjMatch) {
            data.documentType = 'CNPJ';
            data.documentNumber = removeFormatting(cnpjMatch[1]);
            matchCount++;
        } else {
            warnings.push('CPF/CNPJ não encontrado');
        }

        // Extrair email
        const emailMatch = text.match(PDF_PATTERNS.email);
        if (emailMatch) {
            data.email = emailMatch[1];
            matchCount++;
        }

        // Extrair telefone
        const phoneMatch = text.match(PDF_PATTERNS.phone);
        if (phoneMatch) {
            // Pode estar no grupo 1 ou 2
            data.phone = removeFormatting(phoneMatch[1] || phoneMatch[2]);
            matchCount++;
        }

        // Extrair dados da Fazenda e Grade (Tabela)
        const farmMatch = text.match(PDF_PATTERNS.farmTable);
        if (farmMatch) {
            data.farmName = farmMatch[1].trim();
            // Inicializa services se não existir
            if (!data.services) data.services = {} as any;
            data.services!.samplingGridSize = farmMatch[2];

            // Se área não foi pega pelo padrão genérico, pega daqui
            if (!data.totalAreaHectares) {
                const areaValue = farmMatch[3].replace('.', '').replace(',', '.');
                data.totalAreaHectares = parseFloat(areaValue);
            }
            matchCount += 2; // Fazenda + Grade
        } else {
            // Tenta pegar grade isolada se não achou na tabela
            const gridMatch = text.match(PDF_PATTERNS.samplingGridSize);
            if (gridMatch) {
                if (!data.services) data.services = {} as any;
                data.services!.samplingGridSize = gridMatch[1];
            }
            warnings.push('Tabela de fazendas não encontrada');
        }

        // Extrair área (se ainda não tem)
        if (!data.totalAreaHectares) {
            const areaMatch = text.match(PDF_PATTERNS.area);
            if (areaMatch) {
                // Grupo 1 ou 2
                const areaValue = (areaMatch[1] || areaMatch[2]).replace('.', '').replace(',', '.');
                data.totalAreaHectares = parseFloat(areaValue);
                matchCount++;
            } else {
                warnings.push('Área não encontrada');
            }
        }

        // Extrair valor total
        const totalValueMatch = text.match(PDF_PATTERNS.totalValue);
        if (totalValueMatch) {
            data.totalValue = parseMoneyValue(totalValueMatch[1]);
            matchCount++;
        }

        // Extrair preço por hectare
        const pricePerHaMatch = text.match(PDF_PATTERNS.pricePerHectare);
        if (pricePerHaMatch) {
            data.pricePerHectare = parseMoneyValue(pricePerHaMatch[1]);
            matchCount++;
        }



        // Extrair vigência
        const durationMatch = text.match(PDF_PATTERNS.durationMonths);
        if (durationMatch) {
            data.durationMonths = parseInt(durationMatch[1]);
            matchCount++;
        }

        // Detectar serviços contratados
        if (!data.services) data.services = {} as any;
        data.services!.hasFertilityConsultancy = PDF_PATTERNS.services.fertilityConsultancy.test(text);
        data.services!.hasSoilSampling = PDF_PATTERNS.services.soilSampling.test(text);
        data.services!.hasDigitalAgriculture = PDF_PATTERNS.services.digitalAgriculture.test(text);
        data.services!.hasTsiPremium = PDF_PATTERNS.services.tsiPremium.test(text);
        data.services!.hasTsiAbertura = PDF_PATTERNS.services.tsiAbertura.test(text);
        data.services!.hasNemaScan = PDF_PATTERNS.services.nemaScan.test(text);

        // Garantir campos obrigatórios de serviços
        if (data.services!.hasSoilAnalysis === undefined) data.services!.hasSoilAnalysis = false;
        if (data.services!.hasCompactionSamples === undefined) data.services!.hasCompactionSamples = false;
        if (data.services!.hasCalibration === undefined) data.services!.hasCalibration = false;
        if (data.services!.hasOtherServices === undefined) data.services!.hasOtherServices = false;

        // Extrair parcelas (tabela de pagamentos)
        const payments: any[] = [];
        let paymentMatch;
        let paymentNumber = 1;

        // Reset regex para buscar todas as ocorrências
        PDF_PATTERNS.paymentRow.lastIndex = 0;

        while ((paymentMatch = PDF_PATTERNS.paymentRow.exec(text)) !== null) {
            const dueDate = parseBrazilianDate(paymentMatch[1]);
            const value = parseMoneyValue(paymentMatch[2]);

            // Filtrar datas inválidas ou muito antigas (ex: datas de cabeçalho)
            if (dueDate && value && dueDate.getFullYear() > 2020) {
                payments.push({
                    number: paymentNumber++,
                    dueDate,
                    value,
                });
            }
        }

        if (payments.length > 0) {
            data.payments = payments;
            matchCount++;
        } else {
            warnings.push('Tabela de parcelas não encontrada');
        }

        // Calcular confiança baseado nos campos encontrados
        const confidence = Math.round((matchCount / totalPatterns) * 100);

        console.log('DEBUG: FINAL DATA:', JSON.stringify(data, null, 2)); // Debug result

        return {
            success: true,
            data,
            warnings: warnings.length > 0 ? warnings : undefined,
            confidence,
        };

    } catch (error: any) {
        return {
            success: false,
            errors: [`Erro ao processar PDF: ${error.message}`],
            confidence: 0,
        };
    }
}

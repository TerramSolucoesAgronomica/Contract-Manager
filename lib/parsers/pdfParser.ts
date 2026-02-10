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
            .join(' ');

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

        if (!text || text.trim().length === 0) {
            return {
                success: false,
                errors: ['PDF vazio ou não contém texto selecionável'],
                confidence: 0,
            };
        }

        // Dados extraídos
        const data: ParsedPdfData = {};
        let matchCount = 0;
        const totalPatterns = 15; // Número aproximado de campos esperados

        // Extrair número do contrato
        const contractMatch = text.match(PDF_PATTERNS.contractNumber);
        if (contractMatch) {
            data.contractNumber = contractMatch[1];
            matchCount++;
        } else {
            warnings.push('Número do contrato não encontrado');
        }

        // Extrair nome do cliente
        const nameMatch = text.match(PDF_PATTERNS.clientName);
        if (nameMatch) {
            data.fullName = nameMatch[1].trim();
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
            data.phone = removeFormatting(phoneMatch[1]);
            matchCount++;
        }

        // Extrair área
        const areaMatch = text.match(PDF_PATTERNS.area);
        if (areaMatch) {
            const areaValue = areaMatch[1].replace('.', '').replace(',', '.');
            data.totalAreaHectares = parseFloat(areaValue);
            matchCount++;
        } else {
            warnings.push('Área não encontrada');
        }

        // Extrair valor total
        const totalValueMatch = text.match(PDF_PATTERNS.totalValue);
        if (totalValueMatch) {
            data.totalValue = parseMoneyValue(totalValueMatch[1]);
            matchCount++;
        }

        // Extrair preço por hectare
        const pricePerHaMatch = text.match(PDF_PATTERNS.pricePerHa);
        if (pricePerHaMatch) {
            data.pricePerHectare = parseMoneyValue(pricePerHaMatch[1]);
            matchCount++;
        }

        // Extrair data de início
        const startDateMatch = text.match(PDF_PATTERNS.startDate);
        if (startDateMatch) {
            const date = parseBrazilianDate(startDateMatch[1]);
            if (date) {
                data.startDate = date;
                matchCount++;
            }
        }

        // Extrair vigência
        const durationMatch = text.match(PDF_PATTERNS.durationMonths);
        if (durationMatch) {
            data.durationMonths = parseInt(durationMatch[1]);
            matchCount++;
        }

        // Detectar serviços contratados
        data.services = {
            hasFertilityConsultancy: PDF_PATTERNS.services.fertilityConsultancy.test(text),
            hasSoilSampling: PDF_PATTERNS.services.soilSampling.test(text),
            hasDigitalAgriculture: PDF_PATTERNS.services.digitalAgriculture.test(text),
            hasTsiPremium: PDF_PATTERNS.services.tsiPremium.test(text),
            hasTsiAbertura: PDF_PATTERNS.services.tsiAbertura.test(text),
            hasNemaScan: PDF_PATTERNS.services.nemaScan.test(text),
            hasSoilAnalysis: false,
            hasCompactionSamples: false,
            hasCalibration: false,
            hasOtherServices: false,
        };

        // Extrair parcelas (tabela de pagamentos)
        const payments: any[] = [];
        let paymentMatch;
        let paymentNumber = 1;

        // Reset regex para buscar todas as ocorrências
        PDF_PATTERNS.paymentRow.lastIndex = 0;

        while ((paymentMatch = PDF_PATTERNS.paymentRow.exec(text)) !== null) {
            const dueDate = parseBrazilianDate(paymentMatch[1]);
            const value = parseMoneyValue(paymentMatch[2]);

            if (dueDate && value) {
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

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx';
import { ParsedExcelData, ParseResult } from '@/types';
import { removeFormatting } from '../utils/formatters';

/**
 * Mapeia células do Excel para campos do contrato
 * NOTA: Adapte os índices conforme estrutura real da planilha
 */
const EXCEL_CELL_MAPPING = {
    // Exemplo: A2 = Nome, B2 = CPF, etc.
    fullName: 'A2',
    documentNumber: 'B2',
    email: 'C2',
    phone: 'D2',
    contractNumber: 'E2',
    totalAreaHectares: 'F2',
    pricePerHectare: 'G2',
    totalValue: 'H2',
    // Adicione mais conforme necessário
};

/**
 * Parse de planilha Excel
 * @param file Arquivo Excel (.xlsx ou .xls)
 * @returns Dados extraídos parciais
 */
export async function parseExcel(file: File): Promise<ParseResult<ParsedExcelData>> {
    const warnings: string[] = [];

    try {
        // Ler arquivo como ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Pegar primeira sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return {
                success: false,
                errors: ['Planilha vazia'],
                confidence: 0,
            };
        }

        const worksheet = workbook.Sheets[sheetName];

        // Converter para JSON
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
            return {
                success: false,
                errors: ['Planilha sem dados'],
                confidence: 0,
            };
        }

        const data: ParsedExcelData = {};
        let matchCount = 0;
        const totalFields = Object.keys(EXCEL_CELL_MAPPING).length;

        // Extrair dados baseado no mapeamento
        // Exemplo: se fullName está em A2, pegamos jsonData[1][0]

        // Nome (linha 2, coluna A = índice [1][0])
        const fullName = worksheet['A2']?.v;
        if (fullName) {
            data.fullName = String(fullName).trim();
            matchCount++;
        }

        // Documento (linha 2, coluna B)
        const documentNumber = worksheet['B2']?.v;
        if (documentNumber) {
            const cleaned = removeFormatting(String(documentNumber));
            data.documentNumber = cleaned;
            data.documentType = cleaned.length === 11 ? 'CPF' : 'CNPJ';
            matchCount++;
        }

        // Email
        const email = worksheet['C2']?.v;
        if (email) {
            data.email = String(email).trim();
            matchCount++;
        }

        // Telefone
        const phone = worksheet['D2']?.v;
        if (phone) {
            data.phone = removeFormatting(String(phone));
            matchCount++;
        }

        // Número do contrato
        const contractNumber = worksheet['E2']?.v;
        if (contractNumber) {
            data.contractNumber = String(contractNumber).trim();
            matchCount++;
        }

        // Área
        const area = worksheet['F2']?.v;
        if (area) {
            data.totalAreaHectares = parseFloat(String(area).replace(',', '.'));
            matchCount++;
        }

        // Preço por hectare
        const pricePerHa = worksheet['G2']?.v;
        if (pricePerHa) {
            data.pricePerHectare = parseFloat(String(pricePerHa).replace(',', '.'));
            matchCount++;
        }

        // Valor total
        const totalValue = worksheet['H2']?.v;
        if (totalValue) {
            data.totalValue = parseFloat(String(totalValue).replace(',', '.'));
            matchCount++;
        }

        // Calcular confiança
        const confidence = Math.round((matchCount / totalFields) * 100);

        if (matchCount === 0) {
            warnings.push('Nenhum dado foi extraído. Verifique se a planilha está no formato esperado.');
        }

        return {
            success: matchCount > 0,
            data,
            warnings: warnings.length > 0 ? warnings : undefined,
            confidence,
        };

    } catch (error: any) {
        return {
            success: false,
            errors: [`Erro ao processar Excel: ${error.message}`],
            confidence: 0,
        };
    }
}

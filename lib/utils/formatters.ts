import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Formata um valor monetário para o formato brasileiro
 * @param value Valor numérico
 * @returns String formatada (ex: "R$ 1.000,00")
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

/**
 * Formata uma data para o formato brasileiro
 * @param date Data a ser formatada
 * @returns String no formato dd/mm/aaaa
 */
export function formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('pt-BR').format(dateObj);
}

/**
 * Formata CPF: 000.000.000-00
 * @param cpf CPF sem formatação
 * @returns CPF formatado
 */
export function formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;

    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ: 00.000.000/0000-00
 * @param cnpj CNPJ sem formatação
 * @returns CNPJ formatado
 */
export function formatCNPJ(cnpj: string): string {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;

    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formata CPF ou CNPJ automaticamente
 * @param document CPF ou CNPJ sem formatação
 * @returns Documento formatado
 */
export function formatDocument(document: string): string {
    const cleaned = document.replace(/\D/g, '');

    if (cleaned.length === 11) {
        return formatCPF(cleaned);
    } else if (cleaned.length === 14) {
        return formatCNPJ(cleaned);
    }

    return document;
}

/**
 * Formata CEP: 00000-000
 * @param cep CEP sem formatação
 * @returns CEP formatado
 */
export function formatCEP(cep: string): string {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return cep;

    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Formata telefone brasileiro
 * @param phone Telefone sem formatação
 * @returns Telefone formatado: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 11) {
        // Celular: (00) 00000-0000
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
        // Fixo: (00) 0000-0000
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }

    return phone;
}

/**
 * Remove formatação de um documento (CPF/CNPJ/CEP)
 * @param value Valor formatado
 * @returns Apenas números
 */
export function removeFormatting(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Calcula o valor total baseado em área e preço por hectare
 * @param areaHectares Área em hectares
 * @param pricePerHectare Preço por hectare
 * @returns Valor total
 */
export function calculateTotalValue(areaHectares: number, pricePerHectare: number): number {
    return areaHectares * pricePerHectare;
}

/**
 * Gera número de parcelas distribuindo o valor total
 * @param totalValue Valor total
 * @param numberOfPayments Número de parcelas
 * @returns Array de valores das parcelas
 */
export function distributePayments(totalValue: number, numberOfPayments: number): number[] {
    const baseValue = totalValue / numberOfPayments;
    const payments = Array(numberOfPayments).fill(baseValue);

    // Ajusta última parcela para compensar arredondamentos
    const sum = payments.reduce((a, b) => a + b, 0);
    const difference = totalValue - sum;
    payments[payments.length - 1] += difference;

    return payments;
}

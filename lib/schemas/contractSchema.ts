import { z } from 'zod';
import { isValidCPF, isValidCNPJ, isValidCEP, isValidEmail, isValidPhone, isValidUF } from '../utils/validators';

// Schema para endereço
export const addressSchema = z.object({
    street: z.string().min(5, 'Rua deve ter pelo menos 5 caracteres'),
    complement: z.string().optional(),
    neighborhood: z.string().min(3, 'Bairro deve ter pelo menos 3 caracteres'),
    city: z.string().min(3, 'Cidade deve ter pelo menos 3 caracteres'),
    state: z.string().length(2, 'UF deve ter 2 letras').refine(isValidUF, 'UF inválida'),
    zipCode: z.string().refine(isValidCEP, 'CEP inválido'),
});

// Schema para parcela de pagamento
export const paymentSchema = z.object({
    number: z.number().int().positive('Número da parcela deve ser positivo'),
    dueDate: z.date(),
    value: z.number().positive('Valor deve ser maior que zero'),
    status: z.enum(['pending', 'paid', 'overdue']).optional(),
});

// Schema para serviços contratados
export const contractedServicesSchema = z.object({
    hasFertilityConsultancy: z.boolean(),
    hasSoilSampling: z.boolean(),
    hasDigitalAgriculture: z.boolean(),
    hasTsiPremium: z.boolean(),
    hasTsiAbertura: z.boolean(),
    hasNemaScan: z.boolean(),
    hasSoilAnalysis: z.boolean(),
    hasCompactionSamples: z.boolean(),
    hasCalibration: z.boolean(),
    hasOtherServices: z.boolean(),
    otherServicesDescription: z.string().optional(),
    samplingGridSize: z.string().optional(),
    technicalVisitsAmount: z.coerce.number().int().nonnegative().optional(),
    compactionGridSize: z.string().optional(),
    calibrationTotal: z.string().optional(),
}).refine(
    (data) => {
        // Se marcou "outros serviços", descrição é obrigatória
        if (data.hasOtherServices && !data.otherServicesDescription) {
            return false;
        }
        return true;
    },
    {
        message: 'Descrição de outros serviços é obrigatória quando marcado',
        path: ['otherServicesDescription'],
    }
);

// Schema para análise de solo
export const soilAnalysisSchema = z.object({
    depth: z.string().min(1, 'Profundidade é obrigatória'),
    samplesPct: z.string().optional(),
    macroPct: z.string().optional(),
    microPct: z.string().optional(),
    physicalPct: z.string().optional(),
    sulfurPct: z.string().optional(),
    extraPct: z.string().optional(),
});

// Schema principal do contrato
export const contractDataSchema = z.object({
    // Dados do Contratante
    fullName: z.string().min(5, 'Nome completo deve ter pelo menos 5 caracteres'),
    documentType: z.enum(['CPF', 'CNPJ']),
    documentNumber: z.string().refine(
        (val) => {
            const cleaned = val.replace(/\D/g, '');
            if (cleaned.length === 11) return isValidCPF(val);
            if (cleaned.length === 14) return isValidCNPJ(val);
            return false;
        },
        'CPF ou CNPJ inválido'
    ),
    rg: z.string().optional(),
    rgIssuer: z.string().optional(),
    ie: z.string().optional(),
    address: addressSchema,
    email: z.string().email('Email inválido').refine(isValidEmail, 'Formato de email inválido'),
    phone: z.string().refine(isValidPhone, 'Telefone inválido'),

    // Dados do Contrato
    contractNumber: z.string().min(1, 'Número do contrato é obrigatório'),
    startDate: z.date(),
    durationMonths: z.number().int().positive('Duração deve ser maior que zero'),

    // Dados da Fazenda/Área
    farmName: z.string().optional(),
    totalAreaHectares: z.number().positive('Área deve ser maior que zero'),

    // Valores Financeiros
    pricePerHectare: z.number().positive('Preço por hectare deve ser maior que zero'),
    totalValue: z.number().positive('Valor total deve ser maior que zero'),
    payments: z.array(paymentSchema).min(1, 'Pelo menos uma parcela é obrigatória'),

    // Serviços Contratados
    services: contractedServicesSchema,

    // Dados Técnicos
    soilAnalyses: z.array(soilAnalysisSchema).optional(),

    // Testemunhas
    witness1Name: z.string().optional(),
    witness1Document: z.string().optional(),
    witness2Name: z.string().optional(),
    witness2Document: z.string().optional(),

    // Metadados
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
}).refine(
    (data) => {
        // Validação: soma das parcelas deve ser igual ao valor total
        const paymentsSum = data.payments.reduce((sum, p) => sum + p.value, 0);
        return Math.abs(paymentsSum - data.totalValue) < 0.01; // Tolerância de 1 centavo
    },
    {
        message: 'Soma das parcelas deve ser igual ao valor total',
        path: ['payments'],
    }
);

// Schema para formulário (versão simplificada para react-hook-form)
export const contractFormSchema = z.object({
    // Contratante
    fullName: z.string().min(5, 'Nome completo deve ter pelo menos 5 caracteres'),
    documentType: z.enum(['CPF', 'CNPJ']),
    documentNumber: z.string().min(11, 'Documento inválido'),
    rg: z.string().optional(),
    rgIssuer: z.string().optional(),
    ie: z.string().optional(),

    // Endereço
    street: z.string().min(5, 'Rua deve ter pelo menos 5 caracteres'),
    complement: z.string().optional(),
    neighborhood: z.string().min(3, 'Bairro deve ter pelo menos 3 caracteres'),
    city: z.string().min(3, 'Cidade deve ter pelo menos 3 caracteres'),
    state: z.string().length(2, 'UF deve ter 2 letras'),
    zipCode: z.string().min(8, 'CEP inválido'),

    // Contato
    email: z.string().email('Email inválido'),
    phone: z.string().min(10, 'Telefone inválido'),

    // Contrato
    contractNumber: z.string().min(1, 'Número do contrato é obrigatório'),
    startDate: z.string().min(1, 'Data de início é obrigatória'),
    durationMonths: z.coerce.number().int().positive('Duração deve ser maior que zero'),

    // Fazenda
    farmName: z.string().optional(),
    totalAreaHectares: z.coerce.number().positive('Área deve ser maior que zero'),

    // Valores
    pricePerHectare: z.coerce.number().positive('Preço por hectare deve ser maior que zero'),
    totalValue: z.coerce.number().positive('Valor total deve ser maior que zero'),

    // Serviços
    hasFertilityConsultancy: z.boolean().default(false),
    hasSoilSampling: z.boolean().default(false),
    hasDigitalAgriculture: z.boolean().default(false),
    hasTsiPremium: z.boolean().default(false),
    hasTsiAbertura: z.boolean().default(false),
    hasNemaScan: z.boolean().default(false),
    hasSoilAnalysis: z.boolean().default(false),
    hasCompactionSamples: z.boolean().default(false),
    hasCalibration: z.boolean().default(false),
    hasOtherServices: z.boolean().default(false),
    otherServicesDescription: z.string().optional(),
    samplingGridSize: z.string().optional(),
    technicalVisitsAmount: z.coerce.number().int().nonnegative().default(0),
    compactionGridSize: z.string().optional(),
    calibrationTotal: z.string().optional(),

    // Testemunhas
    witness1Name: z.string().optional(),
    witness1Document: z.string().optional(),
    witness2Name: z.string().optional(),
    witness2Document: z.string().optional(),

    // Parcelas (como JSON string)
    paymentsJson: z.string().min(1, 'Parcelas são obrigatórias'),

    // Tabelas de Análise (opcional para validação do form, pois gerenciamos via useFieldArray)
    soilAnalysisLavoura: z.array(soilAnalysisSchema).optional(),
    soilAnalysisAbertura: z.array(soilAnalysisSchema).optional(),
});

export type ContractDataSchemaType = z.infer<typeof contractDataSchema>;
export type ContractFormSchemaType = z.infer<typeof contractFormSchema>;

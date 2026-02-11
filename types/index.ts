// ========================================
// TIPOS PRINCIPAIS DO CONTRATO
// ========================================

/**
 * Endereço completo do contratante
 */
export interface Address {
    street: string;           // Rua com número
    complement?: string;       // Complemento (opcional)
    neighborhood: string;      // Bairro
    city: string;             // Cidade
    state: string;            // UF (2 letras)
    zipCode: string;          // CEP (formato: 00000-000)
}

/**
 * Dados de uma parcela de pagamento
 */
export interface Payment {
    number: number;           // Número da parcela (1, 2, 3...)
    dueDate: Date;           // Data de vencimento
    value: number;           // Valor em R$
    status?: 'pending' | 'paid' | 'overdue';  // Status (opcional)
}

/**
 * Serviços contratados (flags booleanas)
 */
export interface ContractedServices {
    hasFertilityConsultancy: boolean;    // Consultoria de Fertilidade
    hasSoilSampling: boolean;            // Amostragem de Solo
    hasDigitalAgriculture: boolean;      // Agricultura Digital
    hasTsiPremium: boolean;              // TSI Premium
    hasTsiAbertura: boolean;             // TSI Abertura
    hasNemaScan: boolean;                // NEMA SCAN
    hasSoilAnalysis: boolean;            // Análise de Solo (novo)
    hasCompactionSamples: boolean;       // Amostras de Compactação (novo)
    hasCalibration: boolean;             // Calibrações (novo)
    hasOtherServices: boolean;           // Outros serviços
    otherServicesDescription?: string;   // Descrição de outros serviços
    // Detalhes específicos
    samplingGridSize?: string;           // Tamanho da grade amostral (ex: "5ha")
    technicalVisitsAmount?: number;      // Quantidade de visitas técnicas
    compactionGridSize?: string;         // Grade amostral compactação
    calibrationTotal?: string;           // Total calibrações
}

/**
 * Dados técnicos de análise de solo
 */
export interface SoilAnalysis {
    depth: string;              // Profundidade (ex: "0-20cm")
    macroPercentage: number;    // % Macronutrientes
    microPercentage: number;    // % Micronutrientes
    observations?: string;      // Observações técnicas
}

export interface SoilAnalysisLayer {
    depth: string; // "0-10 cm"
    samplesPct?: string;
    macroPct?: string;
    microPct?: string;
    physicalPct?: string;
    sulfurPct?: string;
    extraPct?: string;
}

/**
 * Dados completos do contrato
 * Este é o tipo principal usado em todo o sistema
 */
export interface ContractData {
    // Dados do Contratante
    fullName: string;
    documentType: 'CPF' | 'CNPJ';
    documentNumber: string;     // CPF ou CNPJ sem formatação
    rg?: string;               // RG (para pessoa física)
    rgIssuer?: string;         // Órgão Expedidor do RG
    ie?: string;               // Inscrição Estadual (para pessoa jurídica)
    address: Address;
    email: string;
    phone: string;

    // Dados do Contrato
    contractNumber: string;     // Número da proposta (ex: "369/2024")
    startDate: Date;           // Data de início do contrato
    durationMonths: number;    // Vigência em meses

    // Dados da Fazenda/Área
    farmName?: string;         // Nome da fazenda (opcional)
    totalAreaHectares: number; // Área total em hectares

    // Valores Financeiros
    pricePerHectare: number;   // Valor por hectare
    totalValue: number;        // Valor total do contrato
    payments: Payment[];       // Array de parcelas

    // Serviços Contratados
    services: ContractedServices;

    // Dados Técnicos
    soilAnalyses?: SoilAnalysis[];  // Array de análises de solo (opcional) - Mantido para compatibilidade
    // Novas tabelas de análise
    soilAnalysisLavoura?: SoilAnalysisLayer[];
    soilAnalysisAbertura?: SoilAnalysisLayer[];

    // Testemunhas (opcional)
    witness1Name?: string;
    witness1Document?: string;
    witness2Name?: string;
    witness2Document?: string;

    // Metadados
    createdAt?: Date;
    updatedAt?: Date;
}

// ========================================
// TIPOS AUXILIARES PARA PARSERS
// ========================================

/**
 * Dados extraídos de um PDF
 * Pode estar incompleto
 */
export type ParsedPdfData = Partial<ContractData>;

/**
 * Dados extraídos de um Excel
 * Pode estar incompleto
 */
export type ParsedExcelData = Partial<ContractData>;

/**
 * Resultado do parsing com metadados
 */
export interface ParseResult<T> {
    success: boolean;
    data?: T;
    errors?: string[];
    warnings?: string[];
    confidence?: number;  // 0-100, confiança na extração
}

// ========================================
// TIPOS PARA FORMULÁRIO
// ========================================

/**
 * Dados do formulário (formato plano para react-hook-form)
 */
export interface ContractFormData {
    // Contratante
    fullName: string;
    documentType: 'CPF' | 'CNPJ';
    documentNumber: string;
    rg: string;
    rgIssuer: string;
    ie: string;

    // Endereço
    street: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;

    // Contato
    email: string;
    phone: string;

    // Contrato
    contractNumber: string;
    startDate: string;  // ISO string no formulário
    durationMonths: number;

    // Fazenda
    farmName: string;
    totalAreaHectares: number;

    // Valores
    pricePerHectare: number;
    totalValue: number;

    // Serviços
    hasFertilityConsultancy: boolean;
    hasSoilSampling: boolean;
    hasDigitalAgriculture: boolean;
    hasTsiPremium: boolean;
    hasTsiAbertura: boolean;
    hasNemaScan: boolean;
    hasSoilAnalysis: boolean;
    hasCompactionSamples: boolean;
    hasCalibration: boolean;
    hasOtherServices: boolean;
    otherServicesDescription: string;
    samplingGridSize: string;
    technicalVisitsAmount: number;
    compactionGridSize: string;
    calibrationTotal: string;

    // Tabelas de Análise (JSON string para facilitar formulario)
    soilAnalysisLavoura: SoilAnalysisLayer[];
    soilAnalysisAbertura: SoilAnalysisLayer[];

    // Testemunhas
    witness1Name: string;
    witness1Document: string;
    witness2Name: string;
    witness2Document: string;

    // Parcelas (como JSON string para simplificar)
    paymentsJson: string;
}

// ========================================
// TIPOS PARA GERAÇÃO DE DOCX
// ========================================

/**
 * Dados formatados para o template DOCX
 */
export interface TemplateData {
    // Dados básicos (já formatados)
    nomeContratante: string;
    cpfCnpj: string;  // Formatado com máscara
    rg: string;
    rgIssuer: string;
    ie: string;
    rgIe: string; // Mantido para compatibilidade, mas idealmente usar individuais
    enderecoCompleto: string;  // Endereço concatenado
    // Campos individuais de endereço para maior flexibilidade
    enderecoRua: string;
    enderecoNumero?: string; // Opcional se estiver na rua
    enderecoComplemento: string;
    enderecoBairro: string;
    enderecoCidade: string;
    enderecoEstado: string;
    enderecoCep: string;
    email: string;
    telefone: string;

    // Contrato
    numeroContrato: string;
    dataInicio: string;  // Formato: dd/mm/aaaa
    vigenciaMeses: number;
    vigenciaPorExtenso: string;

    // Fazenda
    nomeFazenda: string;
    areaTotal: string;  // Formatado: "100,50 ha"
    areaPorExtenso: string;

    // Valores
    valorPorHa: string;  // Formatado: "R$ 1.000,00"
    valorPorHaExtenso: string;
    valorTotal: string;  // Formatado: "R$ 100.000,00"
    valorTotalExtenso: string;

    // Serviços (booleanos para seções condicionais)
    temConsultoriaFertilidade: boolean;
    temAmostragemSolo: boolean;
    temAgriculturaDigital: boolean;
    temTsiPremium: boolean;
    temTsiAbertura: boolean;
    temNemaScan: boolean;
    temAnaliseSolo: boolean;
    temAmostrasCompactacao: boolean;
    temCalibracoes: boolean;
    temOutrosServicos: boolean;
    descricaoOutrosServicos: string;

    // Textos para preenchimento "é/não é" ou "são/não são"
    txtTemConsultoriaFertilidade: string;
    txtTemAmostragemSolo: string;
    txtTemVisitasTecnicas: string;
    txtTemAnaliseSolo: string;
    txtTemAmostrasCompactacao: string;
    txtTemCalibracoes: string;

    // Detalhes
    gradeAmostral: string;
    qtdeVisitas: string;
    gradeCompactacao: string;
    totalCalibracoes: string;

    // Tabelas de Análise
    lavouraLayers: Array<SoilAnalysisLayer>;
    aberturaLayers: Array<SoilAnalysisLayer>;

    // Parcelas (array para loop no template)
    qtdeParcelas: number;
    qtdeParcelasExtenso: string;
    parcelas: Array<{
        numero: number;
        valor: string;  // Formatado
        vencimento: string;  // Formatado: dd/mm/aaaa
    }>;

    // Testemunhas
    testemunha1Nome: string;
    testemunha1Documento: string;
    testemunha2Nome: string;
    testemunha2Documento: string;

    // Assinatura
    diaAssinatura: string;
    mesAssinatura: string;
    anoAssinatura: string;
}

// ========================================
// TIPOS PARA HOOKS E ESTADO
// ========================================

/**
 * Estado do processo de upload e parsing
 */
export interface UploadState {
    isUploading: boolean;
    isParsing: boolean;
    progress: number;  // 0-100
    error?: string;
    file?: File;
}

/**
 * Estado do wizard (stepper)
 */
export type WizardStep = 'upload' | 'review' | 'generate';

export interface WizardState {
    currentStep: WizardStep;
    completedSteps: WizardStep[];
    canProceed: boolean;
}

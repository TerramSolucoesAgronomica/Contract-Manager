/**
 * Configuração centralizada dos regex patterns para extração de PDFs da Terram Soluções
 * Ajuste esses patterns conforme necessário após análise dos PDFs reais
 */

export const PDF_PATTERNS = {
    // Número da proposta (ex: "PROPOSTA Nº: 369/2024" ou "Proposta: 528/2023")
    contractNumber: /(?:PROPOSTA|Proposta)\s*(?:Nº|N°)?:?\s*(\d+\/\d{4})/i,

    // Nome do cliente (captura linha após "Cliente:")
    clientName: /(?:Cliente|CLIENTE):?\s*([^\n\r]{5,})/i,

    // CPF ou CNPJ
    cpf: /CPF:?\s*([\d.-]+)/i,
    cnpj: /CNPJ:?\s*([\d./-]+)/i,

    // Área em hectares
    area: /(?:Área|ÁREA)\s*(?:Total|Contratada)?:?\s*([\d.,]+)\s*(?:ha|hectares?)/i,

    // Valores monetários
    totalValue: /(?:Valor|VALOR)\s*(?:Total)?:?\s*R\$\s*([\d.,]+)/i,
    pricePerHa: /(?:Custo|Valor)\s*(?:por)?(?:\/)?(?:ha|hectare):?\s*R\$\s*([\d.,]+)/i,

    // Email
    email: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i,

    // Telefone
    phone: /(?:Tel|Telefone|Celular|Fone):?\s*([\d\s()-]+)/i,

    // Data de início
    startDate: /(?:Data|Início|Vigência)(?:\s+de\s+início)?:?\s*(\d{2}[\/.-]\d{2}[\/.-]\d{4})/i,

    // Vigência em meses
    durationMonths: /(?:Vigência|Duração):?\s*(\d+)\s*(?:meses?|m)/i,

    // Serviços (palavras-chave)
    services: {
        fertilityConsultancy: /(?:consultoria|fertilidade)/i,
        soilSampling: /(?:amostragem|solo)/i,
        digitalAgriculture: /(?:agricultura\s+digital|digital)/i,
        tsiPremium: /TSI\s*PREMIUM/i,
        tsiAbertura: /TSI\s*ABERTURA/i,
        nemaScan: /NEMA\s*SCAN/i,
    },

    // Tabela de parcelas (buscar padrões de data + valor)
    paymentRow: /(\d{2}[\/.-]\d{2}[\/.-]\d{4})\s+R\$\s*([\d.,]+)/gi,

    // Endereço (patterns separados)
    address: {
        street: /(?:Rua|Av|Avenida)[:\s]+([^\n,]+)/i,
        neighborhood: /(?:Bairro)[:\s]+([^\n,]+)/i,
        city: /(?:Cidade)[:\s]+([^\n,]+)/i,
        state: /(?:Estado|UF)[:\s]+([A-Z]{2})/i,
        zipCode: /(?:CEP)[:\s]+([\d-]+)/i,
    },
};

/**
 * Worker configuration para pdfjs-dist
 */
export const PDF_WORKER_CONFIG = {
    // Path para o worker do PDF.js
    // Em produção, usar CDN
    workerSrc: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`,
};

/**
 * Opções de parsing
 */
export const PARSING_OPTIONS = {
    // Confiança mínima para aceitar um dado extraído (0-100)
    minConfidence: 60,

    // Timeout máximo para parsing (ms)
    maxTimeout: 30000,

    // Número máximo de páginas a processar
    maxPages: 50,
};

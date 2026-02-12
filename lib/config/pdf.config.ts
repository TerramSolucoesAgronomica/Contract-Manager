/**
 * Configuração centralizada dos regex patterns para extração de PDFs da Terram Soluções
 * Ajuste esses patterns conforme necessário após análise dos PDFs reais
 */

export const PDF_PATTERNS = {
    // Número da proposta (ex: "PROPOSTA Nº: 369/2024" ou "Proposta: 528/2023")
    // Número do contrato / Proposta
    // Tenta: "PROPOSTA Nº: 291 / 2025" ou "Proposta   Nº:   291   /   2025" (com espaços variáveis)
    contractNumber: /(?:PROPOSTA|Proposta)\s*(?:Nº|N°|N\.?|Numero)?\s*:?\s*(\d+\s*\/\s*\d{4})/i,

    // Nome do cliente (tenta padrão "Cliente:" ou busca entre "SEU NEGÓCIO" e "Consultor")
    clientName: /(?:Cliente|CLIENTE):?\s*([^\n\r]{5,})|SEU NEGÓCIO\s+([^\n]+?)\s+Consultor/i,

    // CPF ou CNPJ
    cpf: /CPF:?\s*([\d.-]+)/i,
    cnpj: /CNPJ:?\s*([\d./-]+)/i,

    // Área em hectares (tenta padrão tabela ou padrão chave-valor)
    area: /(?:Área|ÁREA)\s*(?:Total|Contratada)?:?\s*([\d.,]+)\s*(?:ha|hectares?)|FAZENDAS[\s\S]*?HA\s+[\s\S]*?\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+HA/i,

    // Valores monetários
    totalValue: /(?:Valor|VALOR)\s*(?:Total)?(?:\s*-\s*Fertile)?:?\s*R\$\s*([\d.,]+)/i,
    pricePerHectare: /(?:Custo|Valor)\s*(?:por)?(?:\/)?(?:ha|hectare):?\s*R\$\s*([\d.,]+)/i,

    // Email
    email: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i,

    // Telefone
    phone: /(?:Tel|Telefone|Celular|Fone):\s*([\d\s()-]+)|\(([0-9]{2})\)\s*9?[0-9]{4}-[0-9]{4}/i,

    // Data de início (tenta pegar a data solta no cabeçalho ou padrão Data: ...)
    // Ajustado para pegar data logo abaixo de "Consultor:" ou "Validade:"
    startDate: /(?:Data|Início|Vigência)(?:\s+de\s+início)?:?\s*(\d{2}[\/.-]\d{2}[\/.-]\d{4})|Consultor:[\s\S]*?(\d{2}\/\d{2}\/\d{4})/i,

    // Vigência em meses
    durationMonths: /(?:Vigência|Duração|DURAÇÃO)(?:\s+DO\s+PROJETO)?:?\s*(\d+)\s*(?:meses?|m)/i,

    // Fazenda e Grade (extraído da tabela FAZENDAS)
    farmTable: /FAZENDAS\s+Fazenda\s+Grade\s+Área\s+([\s\S]*?)\s+(\d+)\s+([\d.,]+)\s+HA/i,

    // Grade isolada (backup)
    samplingGridSize: /Grade\s+(\d+)/i,

    // Desconto
    // Padrão: Desconto: 10,0 %
    discount: /Desconto:\s*([\d.,]+)\s*%/i,

    // Produtos / Análise de Solo (captura o bloco de texto de produtos)
    // Usa [\s\S] para pegar quebras de linha; termina em OUTROS ou INVESTIMENTO
    productsBlock: /PRODUTOS\s+Nome\s+Descrição\s+([\s\S]*?)(?:INVESTIMENTO|OUTROS\s+SERVIÇOS)/i,

    // Outros Serviços
    // Ajustado para parar em "TOTAL", "TESTEMUNHAS", "Duração" ou fim do texto
    otherServicesBlock: /OUTROS\s+SERVIÇOS\s+([\s\S]*?)(?:Valor\s+Total|TOTAL|TESTEMUNHAS|OBSERVAÇ|CONTRATANTE|Duração|$)/i,

    // Serviços (palavras-chave dentro dos blocos)
    services: {
        fertilityConsultancy: /(?:consultoria|fertilidade|FERTILE\s*BASE)/i,
        soilSampling: /(?:amostragem|solo)/i,
        digitalAgriculture: /(?:agricultura\s+digital|digital|VARIASEED)/i,
        tsiPremium: /TSI\s*PREMIUM/i,
        tsiAbertura: /TSI\s*ABERTURA/i,
        nemaScan: /NEMA\s*SCAN/i,
    },

    // Tabela de parcelas (buscar padrões de data + valor)
    // Aceita com ou sem "R$" entre data e valor
    paymentRow: /(\d{2}[\/.-]\d{2}[\/.-]\d{4})\s+(?:R\$)?\s*([\d.,]+)/gi,

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

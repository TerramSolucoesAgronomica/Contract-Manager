/**
 * Valida CPF usando algoritmo oficial
 * @param cpf CPF com ou sem formatação
 * @returns true se válido
 */
export function isValidCPF(cpf: string): boolean {
    const cleaned = cpf.replace(/\D/g, '');

    if (cleaned.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false; // Todos dígitos iguais

    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleaned.charAt(9))) return false;

    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleaned.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleaned.charAt(10))) return false;

    return true;
}

/**
 * Valida CNPJ usando algoritmo oficial
 * @param cnpj CNPJ com ou sem formatação
 * @returns true se válido
 */
export function isValidCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/\D/g, '');

    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false; // Todos dígitos iguais

    // Validação do primeiro dígito verificador
    let sum = 0;
    let pos = 5;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned.charAt(i)) * pos;
        pos = pos === 2 ? 9 : pos - 1;
    }
    let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (digit !== parseInt(cleaned.charAt(12))) return false;

    // Validação do segundo dígito verificador
    sum = 0;
    pos = 6;
    for (let i = 0; i < 13; i++) {
        sum += parseInt(cleaned.charAt(i)) * pos;
        pos = pos === 2 ? 9 : pos - 1;
    }
    digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (digit !== parseInt(cleaned.charAt(13))) return false;

    return true;
}

/**
 * Valida CEP brasileiro
 * @param cep CEP com ou sem formatação
 * @returns true se válido
 */
export function isValidCEP(cep: string): boolean {
    const cleaned = cep.replace(/\D/g, '');
    return cleaned.length === 8;
}

/**
 * Valida email usando regex simplificada RFC5322
 * @param email Email a validar
 * @returns true se válido
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valida telefone brasileiro (fixo ou celular)
 * @param phone Telefone com ou sem formatação
 * @returns true se válido
 */
export function isValidPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
}

/**
 * Valida UF (estado brasileiro)
 * @param uf Sigla do estado (2 letras)
 * @returns true se válido
 */
export function isValidUF(uf: string): boolean {
    const validUFs = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];
    return validUFs.includes(uf.toUpperCase());
}

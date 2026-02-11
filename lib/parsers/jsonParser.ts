/* eslint-disable @typescript-eslint/no-explicit-any */
import { ParseResult, ContractData, SoilAnalysisLayer } from '@/types';
import { parse } from 'date-fns';

/**
 * Remove formatação de moeda e converte para number
 */
function parseMoney(value: string): number {
    if (!value) return 0;
    // Remove "R$", pontos e substitui vírgula por ponto
    const clean = value.replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(clean);
}

/**
 * Remove "HA" e formatação numérica
 */
function parseArea(value: string): number {
    if (!value) return 0;
    const clean = value.replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(clean);
}

/**
 * Converte data dd/MM/yyyy para Date
 */
function parseDate(value: string): Date {
    if (!value) return new Date();
    try {
        // Tenta parsear formato brasileiro
        const parts = value.split('/');
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(value);
    } catch {
        return new Date();
    }
}

/**
 * Limpa nome do cliente (remove prefixo numérico ex: "0_ALEX")
 */
function cleanClientName(name: string): string {
    if (!name) return '';
    // Remove digitos seguidos de underline ou traço no inicio
    return name.replace(/^[\d\s]+[_-]\s*/, '').trim();
}

export async function parseJson(file: File): Promise<ParseResult<Partial<ContractData>>> {
    try {
        const text = await file.text();
        const json = JSON.parse(text);

        const data: Partial<ContractData> = {};
        const warnings: string[] = [];

        // 1. Dados do Cliente
        if (json.cliente) {
            data.fullName = cleanClientName(json.cliente);
        } else {
            warnings.push('Nome do cliente não encontrado');
        }

        // 2. Fazenda e Área
        if (json.dados_gerais) {
            if (json.dados_gerais.fazenda) {
                data.farmName = json.dados_gerais.fazenda;
            }
            if (json.dados_gerais.área) {
                data.totalAreaHectares = parseArea(json.dados_gerais.área);
            }
            if (json.dados_gerais.grade) {
                // Inicializa services se não existir (embora seja inicializado depois, melhor garantir)
                if (!data.services) data.services = {} as any;
                data.services!.samplingGridSize = json.dados_gerais.grade.toString();
            }
        }

        // 3. Valores (Investimento)
        if (Array.isArray(json.investimento)) {
            const custoHa = json.investimento.find((i: any) => i.tipo === 'CUSTO_HECTARE');
            if (custoHa && custoHa.valor) {
                data.pricePerHectare = parseMoney(custoHa.valor);
            }

            const total = json.investimento.find((i: any) => i.tipo === 'VALOR_TOTAL' || i.tipo === 'VALOR TOTAL ANUAL');
            if (total && total.valor) {
                data.totalValue = parseMoney(total.valor);
            }
        }

        // 4. Parcelas
        if (Array.isArray(json.parcelas) && json.parcelas.length > 0) {
            data.payments = json.parcelas.map((p: any) => ({
                number: parseInt(p.numero),
                value: parseMoney(p.valor),
                dueDate: parseDate(p.data)
            }));
        } else {
            warnings.push('Parcelas não encontradas');
        }

        // 5. Serviços (Heurística baseada em nomes e descrições)
        data.services = {
            hasFertilityConsultancy: false,
            hasSoilSampling: false,
            hasDigitalAgriculture: false,
            hasTsiPremium: false,
            hasTsiAbertura: false,
            hasNemaScan: false,
            hasSoilAnalysis: false,
            hasCompactionSamples: false,
            hasCalibration: false,
            hasOtherServices: false,
        };

        const checkServiceText = (text: string) => {
            const t = text.toUpperCase();
            if (t.includes('FERTILE')) {
                data.services!.hasFertilityConsultancy = true;
            }
            if (t.includes('AMOSTRAS') || t.includes('AMOSTRAGEM')) {
                data.services!.hasSoilSampling = true;
            }
            if (t.includes('ANÁLISE') || t.includes('ANALISE')) {
                data.services!.hasSoilAnalysis = true;
            }
            if (t.includes('CALIBRA') || t.includes('CALIBRAÇÕES')) {
                data.services!.hasCalibration = true;
                // Tenta extrair quantidade de calibrações
                const calibMatch = t.match(/(\d+)\s*calibra/i);
                if (calibMatch) {
                    data.services!.calibrationTotal = calibMatch[1];
                }
            }
            if (t.includes('COMPACTAÇÃO') || t.includes('COMPACTACAO')) {
                data.services!.hasCompactionSamples = true;
            }
            if (t.includes('NEMA') || t.includes('NEMASCAN')) {
                data.services!.hasNemaScan = true;
            }
            if (t.includes('VARIASEED') || t.includes('DIGITAL')) {
                data.services!.hasDigitalAgriculture = true;
            }
            if (t.includes('TSI') && t.includes('PREMIUM')) {
                data.services!.hasTsiPremium = true;
            }
            if (t.includes('TSI') && t.includes('ABERTURA')) {
                data.services!.hasTsiAbertura = true;
            }
        };

        // Verifica array de 'analises'
        if (Array.isArray(json.analises)) {
            data.soilAnalysisLavoura = [];

            json.analises.forEach((a: any) => {
                if (a.nome_produto) checkServiceText(a.nome_produto);
                if (a.descricao_bruta) checkServiceText(a.descricao_bruta);

                // Extrair camadas se existirem
                if (Array.isArray(a.componentes)) {
                    a.componentes.forEach((c: any) => {
                        data.soilAnalysisLavoura!.push({
                            depth: c.profundidade || '',
                            samplesPct: c.estratificacao || '',
                            macroPct: c.analises?.macro || '',
                            microPct: c.analises?.micro || '',
                            physicalPct: '', // Não presente no JSON padrão
                            sulfurPct: '',   // Não presente no JSON padrão
                            extraPct: ''     // Não presente no JSON padrão
                        });
                    });
                }
            });
        }

        // Verifica 'outros_servicos' - Se estiver no JSON, SEMPRE adiciona à descrição de "Outros"
        // para garantir que o usuário veja tudo que estava no arquivo.
        if (Array.isArray(json.outros_servicos)) {
            const outrosNomes: string[] = [];

            json.outros_servicos.forEach((s: any) => {
                if (s.nome) {
                    // Ainda tenta mapear para categorias conhecidas para marcar os boxes
                    checkServiceText(s.nome);

                    // Mas também adiciona à lista de descrições explícitas
                    outrosNomes.push(s.nome);
                }
            });

            if (outrosNomes.length > 0) {
                data.services!.hasOtherServices = true;
                // Se já tiver alguma descrição (que veio de checkServiceText ou heurística anterior), concatena
                const existing = data.services!.otherServicesDescription || '';
                data.services!.otherServicesDescription = existing
                    ? `${existing}, ${outrosNomes.join(', ')}`
                    : outrosNomes.join(', ');
            }
        }

        // Verifica 'investimento' para produtos principais
        if (Array.isArray(json.investimento)) {
            json.investimento.forEach((i: any) => {
                // Mapeia serviços baseados nos produtos de investimento também
                if (i.nome) checkServiceText(i.nome);
                if (i.produto) checkServiceText(i.produto);
            });
        }

        return {
            success: true,
            data,
            warnings: warnings.length > 0 ? warnings : undefined,
            confidence: 100 // JSON structure is reliable
        };

    } catch (e: any) {
        return {
            success: false,
            errors: [`Erro ao ler arquivo JSON: ${e.message}`],
            confidence: 0
        };
    }
}

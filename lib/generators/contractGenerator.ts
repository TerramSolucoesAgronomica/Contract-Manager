/* eslint-disable @typescript-eslint/no-explicit-any */
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { porExtenso } from 'numero-por-extenso';
import { ContractData, TemplateData } from '@/types';
import { formatCurrency, formatDate, formatDocument, formatPhone } from '../utils/formatters';

/**
 * Converte ContractData para formato do template DOCX
 */
export function contractDataToTemplateData(data: ContractData): TemplateData {
    // Formatar endereço completo
    const enderecoCompleto = `${data.address.street}${data.address.complement ? ', ' + data.address.complement : ''
        }, ${data.address.neighborhood}, ${data.address.city} - ${data.address.state}, CEP: ${data.address.zipCode}`;

    const hoje = new Date();
    const meses = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    return {
        // Dados básicos formatados
        nomeContratante: data.fullName,
        cpfCnpj: formatDocument(data.documentNumber),
        rg: data.rg || '',
        rgIssuer: data.rgIssuer || '',
        rgIe: data.rg || data.ie || '',
        ie: data.ie || '',
        enderecoCompleto,
        // Campos individuais
        enderecoRua: data.address.street,
        enderecoNumero: 'N/A', // Não temos campo separado de número no Address ainda, assumindo concatenado na rua ou sem número
        enderecoComplemento: data.address.complement || '',
        enderecoBairro: data.address.neighborhood,
        enderecoCidade: data.address.city,
        enderecoEstado: data.address.state,
        enderecoCep: data.address.zipCode,
        email: data.email,
        telefone: formatPhone(data.phone),

        // Contrato
        numeroContrato: data.contractNumber,
        dataInicio: formatDate(data.startDate),
        vigenciaMeses: data.durationMonths,
        vigenciaPorExtenso: porExtenso(data.durationMonths, 'normal'),

        // Fazenda
        nomeFazenda: data.farmName || 'Não informado',
        areaTotal: `${data.totalAreaHectares.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha`,
        areaPorExtenso: porExtenso(data.totalAreaHectares, 'normal'),

        // Valores
        valorPorHa: formatCurrency(data.pricePerHectare),
        valorPorHaExtenso: porExtenso(data.pricePerHectare, 'monetario'),
        valorTotal: formatCurrency(data.totalValue),
        valorTotalExtenso: porExtenso(data.totalValue, 'monetario'),

        // Serviços (flags booleanas)
        temConsultoriaFertilidade: data.services.hasFertilityConsultancy,
        temAmostragemSolo: data.services.hasSoilSampling,
        temAgriculturaDigital: data.services.hasDigitalAgriculture,
        temTsiPremium: data.services.hasTsiPremium,
        temTsiAbertura: data.services.hasTsiAbertura,
        temNemaScan: data.services.hasNemaScan,
        temOutrosServicos: data.services.hasOtherServices,
        descricaoOutrosServicos: data.services.otherServicesDescription || '',

        // Textos calculados para preenchimento de lacunas "é/não é"
        txtTemConsultoriaFertilidade: data.services.hasFertilityConsultancy ? 'é' : 'não é',
        txtTemAmostragemSolo: data.services.hasSoilSampling ? 'é' : 'não é',
        // Visitas técnicas: se quantidade > 0, assume que "são" contratadas
        txtTemVisitasTecnicas: (data.services.technicalVisitsAmount || 0) > 0 ? 'são' : 'não são',

        // Detalhes extras
        gradeAmostral: data.services.samplingGridSize || '_____',
        qtdeVisitas: data.services.technicalVisitsAmount ? data.services.technicalVisitsAmount.toString() : '_____',
        gradeCompactacao: data.services.compactionGridSize || '_____',
        totalCalibracoes: data.services.calibrationTotal || '______',

        temAnaliseSolo: data.services.hasSoilAnalysis,
        temAmostrasCompactacao: data.services.hasCompactionSamples,
        temCalibracoes: data.services.hasCalibration,

        txtTemAnaliseSolo: data.services.hasSoilAnalysis ? 'é' : 'não é',
        txtTemAmostrasCompactacao: data.services.hasCompactionSamples ? 'é' : 'não é',
        txtTemCalibracoes: data.services.hasCalibration ? 'é' : 'não é',


        // Parcelas (array para loop no template)
        qtdeParcelas: data.payments.length,
        qtdeParcelasExtenso: porExtenso(data.payments.length, 'normal'),
        parcelas: data.payments.map((p) => ({
            numero: p.number,
            valor: formatCurrency(p.value),
            valorExtenso: porExtenso(p.value, 'monetario'),
            vencimento: formatDate(p.dueDate),
        })),

        // Testemunhas
        testemunha1Nome: data.witness1Name || '',
        testemunha1Documento: data.witness1Document || '',
        testemunha2Nome: data.witness2Name || '',
        testemunha2Documento: data.witness2Document || '',

        // Assinatura
        diaAssinatura: hoje.getDate().toString().padStart(2, '0'),
        mesAssinatura: meses[hoje.getMonth()],
        anoAssinatura: hoje.getFullYear().toString(),
    };
}

/**
 * Gera contrato DOCX a partir dos dados
 * @param data Dados do contrato
 * @param templatePath Caminho para o template (deve estar em /public)
 * @param outputFilename Nome do arquivo de saída
 */
export async function generateContract(
    data: ContractData,
    templatePath: string = '/template_contrato.docx',
    outputFilename?: string
): Promise<void> {
    try {
        // Carregar template
        const response = await fetch(templatePath);
        if (!response.ok) {
            throw new Error('Template não encontrado. Certifique-se de que o arquivo está em /public');
        }

        const templateData = await response.arrayBuffer();
        const zip = new PizZip(templateData);

        // Criar instância do docxtemplater
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            // Angular parser para expressões condicionais
            parser: (tag) => {
                return {
                    get: (scope: any, _context: any) => {
                        // Suporta expressões simples
                        if (tag === '.') {
                            return scope;
                        }
                        return scope[tag];
                    },
                };
            },
        });

        // Converter dados para formato do template
        const templateData2 = contractDataToTemplateData(data);

        // Renderizar documento
        doc.render(templateData2);

        // Gerar blob
        const blob = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        // Nome do arquivo de saída
        const filename = outputFilename || `Contrato_${data.contractNumber.replace('/', '-')}_${data.fullName.replace(/\s+/g, '_')}.docx`;

        // Download
        saveAs(blob, filename);

    } catch (error: any) {
        console.error('Erro ao gerar contrato:', error);
        throw new Error(`Falha ao gerar contrato: ${error.message}`);
    }
}

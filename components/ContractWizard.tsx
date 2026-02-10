/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback } from 'react';
import { WizardStep } from '@/types';
import ContractForm from './ContractForm';
import { usePdfExtract } from '@/hooks/usePdfExtract';
import { parseExcel } from '@/lib/parsers/excelParser';
import { parseJson } from '@/lib/parsers/jsonParser';
import { generateContract } from '@/lib/generators/contractGenerator';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUp, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Componente principal do Wizard de criação de contratos
 * Implementa fluxo de 3 etapas: Upload → Revisão → Geração
 */
export default function ContractWizard() {
    const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
    const [contractData, setContractData] = useState<any>(null);

    const steps: { id: WizardStep; title: string; icon: any }[] = [
        { id: 'upload', title: 'Upload de Arquivo', icon: FileUp },
        { id: 'review', title: 'Revisão de Dados', icon: FileText },
        { id: 'generate', title: 'Gerar Contrato', icon: FileSpreadsheet },
    ];

    const currentStepIndex = steps.findIndex(s => s.id === currentStep);
    const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Terram Contract Manager
                    </h1>
                    <p className="text-gray-600">
                        Geração automática de contratos a partir de propostas comerciais
                    </p>
                </div>

                {/* Progress Steps */}
                <Card className="mb-8 p-6 bg-white/80 backdrop-blur">
                    <div className="mb-4">
                        <Progress value={progressPercentage} className="h-2" />
                    </div>

                    <div className="flex justify-between">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = step.id === currentStep;
                            const isCompleted = index < currentStepIndex;

                            return (
                                <div
                                    key={step.id}
                                    className={`flex flex-col items-center flex-1 ${index < steps.length - 1 ? 'border-r border-gray-200 pr-4' : ''
                                        }`}
                                >
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors ${isCompleted
                                            ? 'bg-green-500 text-white'
                                            : isActive
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-gray-200 text-gray-500'
                                            }`}
                                    >
                                        {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={24} />}
                                    </div>
                                    <span
                                        className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                                            }`}
                                    >
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Content Area */}
                <Card className="p-8 bg-white/90 backdrop-blur">
                    {currentStep === 'upload' && (
                        <UploadStep
                            onComplete={(data) => {
                                setContractData(data);
                                setCurrentStep('review');
                            }}
                        />
                    )}

                    {currentStep === 'review' && (
                        <ReviewStep
                            initialData={contractData}
                            onBack={() => setCurrentStep('upload')}
                            onComplete={(data) => {
                                setContractData(data);
                                setCurrentStep('generate');
                            }}
                        />
                    )}

                    {currentStep === 'generate' && (
                        <GenerateStep
                            contractData={contractData}
                            onBack={() => setCurrentStep('review')}
                            onComplete={() => {
                                // Reset ou redirecionar
                                setCurrentStep('upload');
                                setContractData(null);
                            }}
                        />
                    )}
                </Card>
            </div>
        </div>
    );
}

/**
 * Etapa 1: Upload de arquivo
 */
function UploadStep({ onComplete }: { onComplete: (data: any) => void }) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { extractData: extractPdf, isExtracting: isPdfExtracting } = usePdfExtract();
    const [isExcelExtracting, setIsExcelExtracting] = useState(false);
    const [isJsonProcessing, setIsJsonProcessing] = useState(false);

    const isProcessing = isPdfExtracting || isExcelExtracting || isJsonProcessing;

    const processFiles = useCallback(async (files: File[]) => {
        setError(null);
        let mergedData: any = {};
        const errors: string[] = [];
        let hasSuccess = false;

        // Processa arquivos sequencialmente
        for (const file of files) {
            const fileType = file.name.split('.').pop()?.toLowerCase();
            let result;

            try {
                if (fileType === 'pdf') {
                    result = await extractPdf(file);
                } else if (fileType === 'json') {
                    setIsJsonProcessing(true);
                    result = await parseJson(file);
                    setIsJsonProcessing(false);
                } else if (['xlsx', 'xls'].includes(fileType || '')) {
                    setIsExcelExtracting(true);
                    result = await parseExcel(file);
                    setIsExcelExtracting(false);
                } else {
                    errors.push(`${file.name}: Formato não suportado`);
                    continue;
                }

                if (result?.success && result.data) {
                    hasSuccess = true;
                    // Merge dos dados
                    // Prioridade: dados do arquivo atual sobrescrevem anteriores, exceto arrays/objetos específicos
                    // mas para simplificar: merge raso + merge de serviços

                    const newServices = {
                        ...(mergedData.services || {}),
                        ...(result.data.services || {})
                    };

                    mergedData = {
                        ...mergedData,
                        ...result.data,
                        services: newServices,
                        // Endereço: merge também
                        address: {
                            ...(mergedData.address || {}),
                            ...(result.data.address || {})
                        },
                        // Pagamentos: se o arquivo atual trouxe pagamentos, usa. Senão mantém o anterior.
                        payments: (result.data.payments && result.data.payments.length > 0)
                            ? result.data.payments
                            : mergedData.payments
                    };
                } else if (result?.errors) {
                    errors.push(`${file.name}: ${result.errors.join(', ')}`);
                }
            } catch (e: any) {
                setIsJsonProcessing(false);
                setIsExcelExtracting(false);
                errors.push(`${file.name}: ${e.message}`);
            }
        }

        if (hasSuccess) {
            if (errors.length > 0) {
                // Avisa sobre erros parciais mas prossegue com o que deu certo
                // Idealmente mostraria um toast, mas aquisetError bloqueia o avanço se não limparmos.
                // Vamos logar ou alertar?
                // O usuário quer "ler todos". Se um falhar, ele pode querer saber.
                // Mas como onComplete muda a tela, o erro sumiria. 
                // Vamos prosseguir, assumindo que o que foi extraído é útil.
                console.warn('Erros parciais no upload:', errors);
            }
            onComplete(mergedData);
        } else if (errors.length > 0) {
            setError(errors.join('; '));
        }
    }, [extractPdf, onComplete]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            await processFiles(files);
        }
    }, [processFiles]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            await processFiles(files);
        }
    };

    return (
        <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4">Upload de Arquivos</h2>
            <p className="text-gray-600 mb-8">
                Arraste um ou mais arquivos (PDF, Excel, JSON) para extrair os dados combinados
            </p>

            {error && (
                <Alert variant="destructive" className="mb-6 text-left max-w-lg mx-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div
                className={`border-4 border-dashed rounded-lg p-12 transition-all cursor-pointer relative
                    ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
                    ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,.json"
                    multiple
                    onChange={handleFileChange}
                />

                {isProcessing ? (
                    <div className="flex flex-col items-center">
                        <Loader2 size={64} className="mx-auto mb-4 text-blue-500 animate-spin" />
                        <p className="text-lg font-medium text-blue-600">Processando arquivos...</p>
                    </div>
                ) : (
                    <>
                        <FileUp size={64} className={`mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                        <p className="text-lg font-medium text-gray-700 mb-2">
                            Clique para selecionar ou arraste arquivos aqui
                        </p>
                        <p className="text-sm text-gray-500">
                            Formatos aceitos: PDF, XLSX, XLS, JSON
                        </p>
                    </>
                )}
            </div>

            <div className="mt-8 flex flex-col items-center gap-2">
                <span className="text-sm text-gray-400">- OU -</span>
                <Button
                    variant="outline"
                    onClick={() => onComplete({})}
                    disabled={isProcessing}
                >
                    Preencher formulário manualmente
                </Button>
            </div>
        </div>
    );
}

/**
 * Etapa 2: Revisão e complemento de dados
 */
function ReviewStep({
    initialData,
    onBack,
    onComplete,
}: {
    initialData: any;
    onBack: () => void;
    onComplete: (data: any) => void;
}) {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Revisão de Dados</h2>
            <p className="text-gray-600 mb-8">
                Revise e complete os dados extraídos da proposta. Os campos marcados com * são obrigatórios.
            </p>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <ContractForm
                    initialData={initialData}
                    onCancel={onBack}
                    onSubmit={onComplete}
                />
            </div>
        </div>
    );
}

/**
 * Etapa 3: Geração do contrato
 */
function GenerateStep({
    contractData,
    onBack,
    onComplete,
}: {
    contractData: any;
    onBack: () => void;
    onComplete: () => void;
}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            await generateContract(contractData);
            onComplete();
        } catch (err: any) {
            setError(err.message || 'Erro ao gerar contrato');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Gerar Contrato</h2>
            <p className="text-gray-600 mb-8">
                Tudo pronto! Clique no botão abaixo para gerar o contrato em Word
            </p>

            {error && (
                <Alert variant="destructive" className="mb-6 text-left max-w-lg mx-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="bg-green-50 rounded-lg p-8 mb-8 border border-green-200">
                <CheckCircle2 size={64} className="mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium text-green-800">
                    Dados validados com sucesso
                </p>
                <p className="text-sm text-green-600 mt-2">
                    {contractData.fullName} - {contractData.contractNumber}
                </p>
            </div>

            <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={onBack} disabled={isGenerating}>
                    Voltar
                </Button>
                <Button size="lg" onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gerando...
                        </>
                    ) : (
                        <>
                            <FileSpreadsheet className="mr-2" size={20} />
                            Gerar Contrato DOCX
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

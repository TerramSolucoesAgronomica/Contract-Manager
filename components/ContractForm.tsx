/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Plus, Trash2, ScanLine } from 'lucide-react';
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SoilAnalysisTable } from './SoilAnalysisTable';
import { contractFormSchema, ContractFormSchemaType } from '@/lib/schemas/contractSchema';
import { ContractData, Payment } from '@/types';
import { formatCPF, formatCNPJ, formatPhone, formatCEP, removeFormatting, formatCurrency } from '@/lib/utils/formatters';

interface ContractFormProps {
    initialData?: Partial<ContractData>;
    onSubmit: (data: ContractData) => void;
    onCancel: () => void;
}

const STEPS = [
    { id: 1, title: 'Dados do Contratante' },
    { id: 2, title: 'Contrato e Fazenda' },
    { id: 3, title: 'Serviços Contratados' },
    { id: 4, title: 'Pagamento' },
    { id: 5, title: 'Testemunhas' },
];

export default function ContractForm({ initialData, onSubmit, onCancel }: ContractFormProps) {
    // Converter dados iniciais (tipados) para formato do formulário (strings/flat)
    const defaultValues: Partial<ContractFormSchemaType> = {
        // Contratante
        fullName: initialData?.fullName || '',
        documentType: initialData?.documentType || 'CPF',
        documentNumber: initialData?.documentNumber || '',
        rg: initialData?.rg || '',
        rgIssuer: initialData?.rgIssuer || '',
        ie: initialData?.ie || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',

        // Endereço
        street: initialData?.address?.street || '',
        complement: initialData?.address?.complement || '',
        neighborhood: initialData?.address?.neighborhood || '',
        city: initialData?.address?.city || '',
        state: initialData?.address?.state || '',
        zipCode: initialData?.address?.zipCode || '',

        // Contrato
        contractNumber: initialData?.contractNumber || '',
        startDate: initialData?.startDate ? format(new Date(initialData.startDate), 'yyyy-MM-dd') : '',
        durationMonths: initialData?.durationMonths || 12,

        // Fazenda
        farmName: initialData?.farmName || '',
        totalAreaHectares: initialData?.totalAreaHectares || 0,
        pricePerHectare: initialData?.pricePerHectare || 0,
        totalValue: initialData?.totalValue || 0,

        // Serviços
        hasFertilityConsultancy: initialData?.services?.hasFertilityConsultancy || false,
        hasSoilSampling: initialData?.services?.hasSoilSampling || false,
        hasDigitalAgriculture: initialData?.services?.hasDigitalAgriculture || false,
        hasTsiPremium: initialData?.services?.hasTsiPremium || false,
        hasTsiAbertura: initialData?.services?.hasTsiAbertura || false,
        hasNemaScan: initialData?.services?.hasNemaScan || false,
        hasSoilAnalysis: initialData?.services?.hasSoilAnalysis || false,
        hasCompactionSamples: initialData?.services?.hasCompactionSamples || false,
        hasCalibration: initialData?.services?.hasCalibration || false,
        hasOtherServices: initialData?.services?.hasOtherServices || false,
        otherServicesDescription: initialData?.services?.otherServicesDescription || '',
        samplingGridSize: initialData?.services?.samplingGridSize || '',
        technicalVisitsAmount: initialData?.services?.technicalVisitsAmount || 0,
        compactionGridSize: initialData?.services?.compactionGridSize || '',
        calibrationTotal: initialData?.services?.calibrationTotal || '',

        // Tabelas de Análise
        soilAnalysisLavoura: initialData?.soilAnalysisLavoura || [],
        soilAnalysisAbertura: initialData?.soilAnalysisAbertura || [],

        // Testemunhas
        witness1Name: initialData?.witness1Name || '',
        witness1Document: initialData?.witness1Document || '',
        witness2Name: initialData?.witness2Name || '',
        witness2Document: initialData?.witness2Document || '',

        // Parcelas (serializado)
        paymentsJson: JSON.stringify(initialData?.payments || []),
    };

    const form = useForm<ContractFormSchemaType>({
        resolver: zodResolver(contractFormSchema) as any,
        defaultValues,
        mode: 'onChange',
    });

    // Gerenciamento de estado local para parcelas (para UI dinâmica)
    // Sincroniza com paymentsJson do formulário
    const paymentsJson = form.watch('paymentsJson');
    const payments = paymentsJson ? JSON.parse(paymentsJson) as Payment[] : [];

    const updatePayments = (newPayments: Payment[]) => {
        form.setValue('paymentsJson', JSON.stringify(newPayments), { shouldValidate: true });

        // Validar total se necessário
        const currentTotal = form.getValues('totalValue') || 0;
        const paymentsSum = newPayments.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

        if (Math.abs(paymentsSum - currentTotal) > 0.01 && currentTotal > 0) {
            form.setError('totalValue', {
                type: 'manual',
                message: `Soma das parcelas (R$ ${paymentsSum.toFixed(2)}) difere do total (R$ ${currentTotal.toFixed(2)})`
            });
        } else {
            form.clearErrors('totalValue');
        }
    };

    const addPayment = () => {
        const nextNumber = payments.length > 0 ? Math.max(...payments.map(p => p.number)) + 1 : 1;
        const newPayment: Payment = {
            number: nextNumber,
            dueDate: new Date(),
            value: 0
        };
        updatePayments([...payments, newPayment]);
    };

    const removePayment = (index: number) => {
        const newPayments = [...payments];
        newPayments.splice(index, 1);
        // Reordenar números
        newPayments.forEach((p, i) => p.number = i + 1);
        updatePayments(newPayments);
    };

    const updatePaymentField = (index: number, field: keyof Payment, value: string | number | Date) => {
        const newPayments = [...payments];
        newPayments[index] = { ...newPayments[index], [field]: value };
        updatePayments(newPayments);
    };

    const [currentStep, setCurrentStep] = useState(1);

    // Função para validar campos da etapa atual antes de avançar
    const nextStep = async () => {
        let fieldsToValidate: any[] = [];

        // Define quais campos validar em cada etapa
        switch (currentStep) {
            case 1:
                fieldsToValidate = ['fullName', 'documentNumber', 'street', 'city', 'state'];
                break;
            case 2:
                fieldsToValidate = ['contractNumber', 'startDate', 'durationMonths', 'farmName', 'totalAreaHectares'];
                break;
            // Adicione mais validações conforme necessário
        }

        // Validação relaxada a pedido do usuário
        // const isValid = await form.trigger(fieldsToValidate as any);
        const isValid = true;

        if (isValid) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    async function handleFormSubmit(data: ContractFormSchemaType) {
        console.log("Submitting form data", data); // Debug

        interface PaymentRaw {
            number: number;
            dueDate: string;
            value: number;
            status?: 'pending' | 'paid' | 'overdue';
        }

        // Converter de volta para ContractData estruturado
        const contractData: ContractData = {
            fullName: data.fullName,
            documentType: data.documentType,
            documentNumber: removeFormatting(data.documentNumber),
            rg: data.rg,
            rgIssuer: data.rgIssuer,
            ie: data.ie,
            email: data.email,
            phone: removeFormatting(data.phone),

            address: {
                street: data.street,
                complement: data.complement,
                neighborhood: data.neighborhood,
                city: data.city,
                state: data.state,
                zipCode: removeFormatting(data.zipCode),
            },

            contractNumber: data.contractNumber,
            startDate: data.startDate ? new Date(data.startDate) : new Date(),
            durationMonths: data.durationMonths,

            farmName: data.farmName,
            totalAreaHectares: data.totalAreaHectares,

            pricePerHectare: data.pricePerHectare,
            totalValue: data.totalValue,
            payments: (JSON.parse(data.paymentsJson) as PaymentRaw[]).map((p) => ({
                ...p,
                dueDate: new Date(p.dueDate), // Garantir Date object
            })),

            services: {
                hasFertilityConsultancy: data.hasFertilityConsultancy,
                hasSoilSampling: data.hasSoilSampling,
                hasDigitalAgriculture: data.hasDigitalAgriculture,
                hasTsiPremium: data.hasTsiPremium,
                hasTsiAbertura: data.hasTsiAbertura,
                hasNemaScan: data.hasNemaScan,
                hasSoilAnalysis: data.hasSoilAnalysis,
                hasCompactionSamples: data.hasCompactionSamples,
                hasCalibration: data.hasCalibration,
                hasOtherServices: data.hasOtherServices,
                otherServicesDescription: data.otherServicesDescription,
                samplingGridSize: data.samplingGridSize,
                technicalVisitsAmount: data.technicalVisitsAmount,
                compactionGridSize: data.compactionGridSize,
                calibrationTotal: data.calibrationTotal,
            },

            witness1Name: data.witness1Name,
            witness1Document: data.witness1Document,
            witness2Name: data.witness2Name,
            witness2Document: data.witness2Document,

            soilAnalysisLavoura: data.soilAnalysisLavoura,
            soilAnalysisAbertura: data.soilAnalysisAbertura,
        };

        onSubmit(contractData);
    };

    const handleGenerateClick = () => {
        const values = form.getValues();
        handleFormSubmit(values);
    };

    return (
        <>
            <div className="mb-8">
                {/* Stepper Header */}
                <div className="flex justify-between items-center mb-6">
                    {STEPS.map((step) => (
                        <div key={step.id} className={`flex flex-col items-center ${currentStep === step.id ? 'text-primary font-bold' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 ${currentStep >= step.id ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'}`}>
                                {step.id}
                            </div>
                            <span className="text-sm hidden md:block">{step.title}</span>
                        </div>
                    ))}
                </div>
                <Separator />
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">

                    {/* PASSO 1: DADOS DO CONTRATANTE */}
                    {currentStep === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-semibold mb-4">Dados do Contratante</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control as any}
                                    name="fullName"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Nome Completo / Razão Social</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome do cliente" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="documentType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Documento</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="CPF">CPF</SelectItem>
                                                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="documentNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número do Documento</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={form.watch('documentType') === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                                                    {...field}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        field.onChange(form.watch('documentType') === 'CPF' ? formatCPF(val) : formatCNPJ(val));
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="rg"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>RG (Pessoa Física)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="RG" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="rgIssuer"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Órgão Expedidor (RG)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="SSP/GO" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="ie"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Inscrição Estadual (Pessoa Jurídica)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="IE" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone / Celular</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="(00) 00000-0000"
                                                    {...field}
                                                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="email@exemplo.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator className="my-4" />
                            <h3 className="font-semibold mb-2">Endereço</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control as any}
                                    name="zipCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CEP</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="00000-000"
                                                    {...field}
                                                    onChange={(e) => field.onChange(formatCEP(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="street"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Logradouro (Rua/Av, Número)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Rua Exemplo, 123" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="neighborhood"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bairro</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Bairro" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cidade</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Cidade" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>UF</FormLabel>
                                            <FormControl>
                                                <Input placeholder="UF" maxLength={2} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="complement"
                                    render={({ field }) => (
                                        <FormItem className="col-span-3">
                                            <FormLabel>Complemento</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Apto, Bloco, etc." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {/* PASSO 2: CONTRATO E FAZENDA */}
                    {currentStep === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-semibold mb-4">Dados do Contrato e Fazenda</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control as any}
                                    name="contractNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número Proposta</FormLabel>
                                            <FormControl>
                                                <Input placeholder="000/2024" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data de Início</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="durationMonths"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Vigência (Meses)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="farmName"
                                    render={({ field }) => (
                                        <FormItem className="col-span-3">
                                            <FormLabel>Nome da Fazenda</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Fazenda Santa Rita" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="totalAreaHectares"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Área Total (ha)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="pricePerHectare"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor por Hectare (R$)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="totalValue"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor Total (R$)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} />
                                            </FormControl>
                                            <FormDescription>Calculado automaticamente ou extraído</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    )}



                    {/* PASSO 3: SERVIÇOS CONTRATADOS */}
                    {currentStep === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-semibold mb-4">Serviços Contratados</h2>
                            <div className="space-y-6">

                                {/* Consultoria de Fertilidade */}
                                {form.watch('hasSoilAnalysis') && (
                                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                        <SoilAnalysisTable
                                            control={form.control}
                                            name="soilAnalysisLavoura"
                                            label="Áreas de Lavoura"
                                        />
                                        <SoilAnalysisTable
                                            control={form.control}
                                            name="soilAnalysisAbertura"
                                            label="Áreas de Abertura"
                                        />
                                    </div>
                                )}

                                <div className="p-4 border rounded-lg bg-slate-50">
                                    <div className="flex items-center space-x-2">
                                        <FormField
                                            control={form.control as any}
                                            name="hasFertilityConsultancy"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                    <FormLabel className="text-base font-semibold cursor-pointer m-0">
                                                        Consultoria de Fertilidade
                                                    </FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    {form.watch('hasFertilityConsultancy') && (
                                        <div className="ml-7 mt-3">
                                            <FormField
                                                control={form.control as any}
                                                name="samplingGridSize"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Tamanho da Grade Amostral (Ex: 5ha)</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="5ha" {...field} className="max-w-xs bg-white" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>

                                <FormField
                                    control={form.control as any}
                                    name="hasSoilSampling"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Amostragem de Solo</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control as any}
                                    name="hasDigitalAgriculture"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Agricultura Digital</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control as any}
                                    name="hasTsiPremium"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>TSI Premium</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control as any}
                                    name="hasSoilAnalysis"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Análise de Solo</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control as any}
                                    name="hasCompactionSamples"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Amostras de Compactação</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                {form.watch('hasCompactionSamples') && (
                                    <FormField
                                        control={form.control as any}
                                        name="compactionGridSize"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2 md:col-span-1">
                                                <FormLabel>Grade Amostral Compactação (Ex: 5ha)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="5ha" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                <FormField
                                    control={form.control as any}
                                    name="hasCalibration"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>Calibrações</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                {form.watch('hasCalibration') && (
                                    <FormField
                                        control={form.control as any}
                                        name="calibrationTotal"
                                        render={({ field }) => (
                                            <FormItem className="col-span-2 md:col-span-1">
                                                <FormLabel>Total Calibrações</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Total" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                <FormField
                                    control={form.control as any}
                                    name="hasNemaScan"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>NEMA SCAN</FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                <div className="col-span-2">
                                    <FormField
                                        control={form.control as any}
                                        name="technicalVisitsAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quantidade de Visitas Técnicas</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormDescription>Preencha se houver visitas contratadas</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <FormField
                                        control={form.control as any}
                                        name="hasOtherServices"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-2">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>Outros Serviços</FormLabel>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    {form.watch('hasOtherServices') && (
                                        <FormField
                                            control={form.control as any}
                                            name="otherServicesDescription"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Descreva os outros serviços..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASSO 4: PAGAMENTO E PARCELAS */}
                    {currentStep === 4 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-semibold mb-4">Pagamento e Parcelas</h2>
                            <div className="space-y-4">
                                <div className="p-4 bg-muted/20 rounded-lg">
                                    <h3 className="font-medium mb-2">Valor Total do Contrato</h3>
                                    <div className="text-2xl font-bold text-primary">
                                        {formatCurrency(form.watch('totalValue') || 0)}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <FormLabel>Parcelas</FormLabel>
                                    {payments.map((payment, index) => (
                                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border p-3 rounded-md">
                                            <div className="md:col-span-1 flex items-center justify-center h-10 font-bold bg-muted rounded">
                                                {payment.number}
                                            </div>
                                            <div className="md:col-span-5">
                                                <FormLabel className="text-xs">Valor (R$)</FormLabel>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={payment.value}
                                                    onChange={(e) => updatePaymentField(index, 'value', parseFloat(e.target.value))}
                                                />
                                            </div>
                                            <div className="md:col-span-5">
                                                <FormLabel className="text-xs">Vencimento</FormLabel>
                                                <Input
                                                    type="date"
                                                    value={payment.dueDate ? format(payment.dueDate, 'yyyy-MM-dd') : ''}
                                                    onChange={(e) => updatePaymentField(index, 'dueDate', e.target.value ? new Date(e.target.value) : new Date())}
                                                />
                                            </div>
                                            <div className="md:col-span-1">
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={() => removePayment(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addPayment}
                                        className="w-full border-dashed"
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> Adicionar Parcela
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASSO 5: TESTEMUNHAS */}
                    {currentStep === 5 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-semibold mb-4">Testemunhas (Opcional)</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h3 className="font-medium">Testemunha 1</h3>
                                    <FormField
                                        control={form.control as any}
                                        name="witness1Name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nome Completo" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="witness1Document"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>CPF</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="000.000.000-00"
                                                        {...field}
                                                        onChange={(e) => field.onChange(formatCPF(e.target.value))}
                                                        maxLength={14}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h3 className="font-medium">Testemunha 2</h3>
                                    <FormField
                                        control={form.control as any}
                                        name="witness2Name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Nome Completo" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control as any}
                                        name="witness2Document"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>CPF</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="000.000.000-00"
                                                        {...field}
                                                        onChange={(e) => field.onChange(formatCPF(e.target.value))}
                                                        maxLength={14}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between pt-6 border-t mt-6">
                        {currentStep === 1 ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onCancel}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <ScanLine className="mr-2 h-4 w-4" />
                                Scanear Outros Arquivos
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={prevStep}
                            >
                                Voltar
                            </Button>
                        )}

                        {currentStep < STEPS.length ? (
                            <Button type="button" onClick={nextStep}>
                                Próximo
                            </Button>
                        ) : (
                            <Button type="button" onClick={handleGenerateClick} className="bg-green-600 hover:bg-green-700">
                                Gerar Contrato
                            </Button>
                        )}
                    </div>
                </form>
            </Form >
        </>
    );
}

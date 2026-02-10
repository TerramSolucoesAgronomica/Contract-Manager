/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { ParsedPdfData, ParseResult } from '@/types';
import { parsePDF } from '@/lib/parsers/pdfParser';

interface UsePdfExtractReturn {
    extractData: (file: File) => Promise<ParseResult<ParsedPdfData>>;
    isExtracting: boolean;
    progress: number;
    error: string | null;
}

/**
 * Hook para extração de dados de PDF
 */
export function usePdfExtract(): UsePdfExtractReturn {
    const [isExtracting, setIsExtracting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const extractData = useCallback(async (file: File): Promise<ParseResult<ParsedPdfData>> => {
        setIsExtracting(true);
        setProgress(0);
        setError(null);

        try {
            setProgress(20);

            // Processar PDF
            const result = await parsePDF(file);

            setProgress(100);

            if (!result.success) {
                setError(result.errors?.join(', ') || 'Erro desconhecido ao processar PDF');
            }

            return result;

        } catch (err: any) {
            const errorMsg = err.message || 'Erro ao processar PDF';
            setError(errorMsg);

            return {
                success: false,
                errors: [errorMsg],
                confidence: 0,
            };

        } finally {
            setIsExtracting(false);
        }
    }, []);

    return {
        extractData,
        isExtracting,
        progress,
        error,
    };
}

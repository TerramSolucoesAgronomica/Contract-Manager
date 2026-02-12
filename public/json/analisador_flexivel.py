import re
from typing import Dict, List, Any

class AnalisadorFlexivel:
    """
    Parser robusto para descrições de análises agrícolas
    Trata múltiplas variações de formato
    """
    
    @staticmethod
    def extrair_analises(descricao: str) -> List[Dict[str, Any]]:
        """
        Extrai análises flexivelmente de diferentes formatos
        
        Formatos suportados:
        - "Amostras 0-10cm (100%); Análise 0-10cm (100% Macro, 15% Micro)"
        - "100% 0-10cm (100% macro + 15% micro); 25% 10-20cm (100% macro)"
        - "0-10cm (100% Macro); 10-20cm (100% Macro); Observações"
        """
        
        componentes = {}  # Dict para consolidar por profundidade
        
        # PASSO 1: Encontrar e processar "Amostras" (estratificação)
        amostras = re.findall(r'Amostras?\s+(\d+-\d+\s*cm)\s*\(([^)]*)\)', descricao, re.I)
        for prof, conteudo in amostras:
            prof_norm = prof.strip().lower()
            if prof_norm not in componentes:
                componentes[prof_norm] = {
                    'profundidade': prof.strip(),
                    'estratificacao': '',
                    'analises': {},
                    'observacoes': ''
                }
            
            # Extrair estratificação
            est_match = re.search(r'(\d+(?:[.,]\d+)?)\s*%', conteudo)
            if est_match:
                componentes[prof_norm]['estratificacao'] = est_match.group(1) + '%'
        
        # PASSO 2: Encontrar e processar "Análise" (macro/micro/enxofre)
        analises = re.findall(r'An[aá]lise?\s+(\d+-\d+\s*cm)\s*\(([^)]*)\)', descricao, re.I)
        for prof, conteudo in analises:
            prof_norm = prof.strip().lower()
            if prof_norm not in componentes:
                componentes[prof_norm] = {
                    'profundidade': prof.strip(),
                    'estratificacao': '',
                    'analises': {},
                    'observacoes': ''
                }
            
            # Extrair tipos de análise
            macro = re.search(r'(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?Macro', conteudo, re.I)
            micro = re.search(r'(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?Micro', conteudo, re.I)
            enxofre = re.search(r'(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?Enxofre', conteudo, re.I)
            
            if macro:
                componentes[prof_norm]['analises']['macro'] = macro.group(1) + '%'
            if micro:
                componentes[prof_norm]['analises']['micro'] = micro.group(1) + '%'
            if enxofre:
                componentes[prof_norm]['analises']['enxofre'] = enxofre.group(1) + '%'
        
        # PASSO 3: Padrão alternativo - "X% profundidade (tipos de análise)"
        # Exemplo: "100% 0-10cm (100% macro + 15% micro)"
        pattern_alt = r'(\d+(?:[.,]\d+)?)\s*%\s+(\d+-\d+\s*cm)\s*\(([^)]*)\)'
        matches_alt = re.finditer(pattern_alt, descricao, re.I)
        
        for match in matches_alt:
            estratif = match.group(1)
            prof = match.group(2).strip()
            conteudo = match.group(3)
            prof_norm = prof.lower()
            
            if prof_norm not in componentes:
                componentes[prof_norm] = {
                    'profundidade': prof,
                    'estratificacao': '',
                    'analises': {},
                    'observacoes': ''
                }
            
            # Estratificação
            componentes[prof_norm]['estratificacao'] = estratif + '%'
            
            # Análises (macro, micro, enxofre)
            macro = re.search(r'(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?macro', conteudo, re.I)
            micro = re.search(r'(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?micro', conteudo, re.I)
            enxofre = re.search(r'(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?enxofre', conteudo, re.I)
            
            if macro:
                componentes[prof_norm]['analises']['macro'] = macro.group(1) + '%'
            if micro:
                componentes[prof_norm]['analises']['micro'] = micro.group(1) + '%'
            if enxofre:
                componentes[prof_norm]['analises']['enxofre'] = enxofre.group(1) + '%'
        
        # PASSO 4: Padrão simples - "profundidade (tipos de análise)"
        # Exemplo: "0-10cm (100% Macro, 15% Micro)"
        if not componentes:  # Se nenhum padrão anterior funcionou
            pattern_simples = r'(\d+-\d+\s*cm)\s*\(([^)]*)\)'
            matches_simples = re.finditer(pattern_simples, descricao, re.I)
            
            for match in matches_simples:
                prof = match.group(1).strip()
                conteudo = match.group(2)
                prof_norm = prof.lower()
                
                componentes[prof_norm] = {
                    'profundidade': prof,
                    'estratificacao': '',
                    'analises': {},
                    'observacoes': ''
                }
                
                # Análises
                macro = re.search(r'(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?macro', conteudo, re.I)
                micro = re.search(r'(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?micro', conteudo, re.I)
                enxofre = re.search(r'(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?enxofre', conteudo, re.I)
                
                if macro:
                    componentes[prof_norm]['analises']['macro'] = macro.group(1) + '%'
                if micro:
                    componentes[prof_norm]['analises']['micro'] = micro.group(1) + '%'
                if enxofre:
                    componentes[prof_norm]['analises']['enxofre'] = enxofre.group(1) + '%'
        
        # PASSO 5: Extrair observações mais limpas
        # Encontra observações após ";" (separador)
        partes = descricao.split(';')
        observacao_geral = ''
        
        # Procura a última parte que não é uma profundidade/análise
        for parte in reversed(partes):
            parte = parte.strip()
            # Se não é uma profundidade/análise, é observação
            if parte and not re.search(r'Amostras?\s+\d+-\d+\s*cm', parte, re.I) and \
                   not re.search(r'An[aá]lise?\s+\d+-\d+\s*cm', parte, re.I):
                observacao_geral = parte
                break
        
        # Remove parênteses vazios ou com só números/percentos
        observacao_geral = re.sub(r'\s*\([^)]*%[^)]*\)\s*', '', observacao_geral)
        observacao_geral = observacao_geral.strip()
        
        if observacao_geral and observacao_geral not in ['', '-', '–']:
            for prof_norm in componentes:
                # Adiciona observações se não tiver
                if not componentes[prof_norm]['observacoes']:
                    componentes[prof_norm]['observacoes'] = observacao_geral
        
        # Se ainda não encontrou nada, adiciona descrição completa
        if not componentes:
            componentes['geral'] = {
                'profundidade': 'Geral',
                'estratificacao': '',
                'analises': {},
                'observacoes': descricao
            }
        
        return list(componentes.values())


# TESTE
if __name__ == "__main__":
    teste_cases = [
        # Caso Alex (atual)
        "Amostras 0-10 cm (100%); Amostras 10-20 cm (25%); Análise 0-10 cm (100% Macro, 15% Micro); Análise 10-20 cm (100% Macro); 3 calibrações",
        
        # Caso alternativo 1
        "100% 0-10cm (100% macro + 15% micro); 25% 10-20cm (100% macro)- Planejamento Fertilizantes",
        
        # Caso alternativo 2
        "0-10cm (100% Macro); 10-20cm (100% Macro); 3 Reuniões de alinhamento",
        
        # Caso com enxofre
        "Amostras 0-10cm (100%); Análise 0-10cm (100% Macro, 20% Micro, 15% Enxofre); Observações variadas"
    ]
    
    analisador = AnalisadorFlexivel()
    
    for i, desc in enumerate(teste_cases, 1):
        print(f"\n{'='*80}")
        print(f"TESTE {i}:")
        print(f"Entrada: {desc[:60]}...")
        print(f"\nResultado:")
        resultado = analisador.extrair_analises(desc)
        
        for comp in resultado:
            print(f"  Profundidade: {comp['profundidade']}")
            print(f"  Estratificação: {comp['estratificacao']}")
            print(f"  Análises: {comp['analises']}")
            if comp['observacoes']:
                print(f"  Observações: {comp['observacoes']}")

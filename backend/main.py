from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
from openai import OpenAI
import re
import json
from typing import Dict, Any, List, Tuple

# Carregar variáveis de ambiente
load_dotenv()

# Configurar Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Configurar OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# Configuração do CORS para permitir comunicação com o front-end
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Substitua pelo domínio do seu front-end em produção
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo de dados para a requisição
class MessageRequest(BaseModel):
    message: str
    context: list  # Histórico da conversa

# Estrutura da tabela 'inseminacao'
table_structure = [
    {"column_name": "id", "data_type": "integer", "is_nullable": "NO", "column_default": "nextval('inseminacao_id_seq'::regclass)"},
    {"column_name": "FAZENDA", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "ESTADO", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "MUNICÍPIO", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "Nº ANIMAL", "data_type": "integer", "is_nullable": "NO", "column_default": None},
    {"column_name": "LOTE", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "RAÇA", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "CATEGORIA", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "ECC", "data_type": "numeric", "is_nullable": "NO", "column_default": None},
    {"column_name": "CICLICIDADE", "data_type": "integer", "is_nullable": "NO", "column_default": None},
    {"column_name": "PROTOCOLO", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "IMPLANTE P4", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "EMPRESA", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "GnRH NA IA", "data_type": "integer", "is_nullable": "NO", "column_default": None},
    {"column_name": "PGF NO D0", "data_type": "integer", "is_nullable": "NO", "column_default": None},
    {"column_name": "Dose PGF retirada", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "Marca PGF retirada", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "Dose CE", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "eCG", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "DOSE eCG", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "TOURO", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "RAÇA TOURO", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "EMPRESA TOURO", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "INSEMINADOR", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "Nº da IATF", "data_type": "text", "is_nullable": "NO", "column_default": None},
    {"column_name": "DG", "data_type": "integer", "is_nullable": "NO", "column_default": None},
    {"column_name": "VAZIA COM OU SEM CL", "data_type": "integer", "is_nullable": "NO", "column_default": None},
    {"column_name": "PERDA", "data_type": "integer", "is_nullable": "NO", "column_default": None}
]

def clean_sql_query(query: str) -> str:
    """
    Limpa a consulta SQL, removendo backticks, comentários, etc.
    """
    # Remove ```sql e ``` se existirem
    query = re.sub(r'```sql|```', '', query)
    # Remove comentários
    query = re.sub(r'--.*$', '', query, flags=re.MULTILINE)
    # Remove espaços extras e quebras de linha
    query = re.sub(r'\s+', ' ', query).strip()
    return query

def extract_select_part(query: str) -> str:
    """
    Extrai e simplifica a parte SELECT da consulta
    """
    select_match = re.search(r'SELECT\s+(.*?)\s+FROM', query, re.IGNORECASE)
    if not select_match:
        return "*"  # Default to all columns
    
    select_part = select_match.group(1).strip()
    
    # Se for COUNT(*) ou COUNT(algo), retorna apenas o nome da coluna
    count_match = re.search(r'COUNT\(\*\)|COUNT\((.*?)\)', select_part, re.IGNORECASE)
    if count_match:
        return select_part  # Return the count expression as is
        
    return select_part

def execute_supabase_query(user_message: str) -> Tuple[List[Dict[str, Any]], str]:
    """
    Executa uma consulta no Supabase usando o método .select() diretamente
    """
    try:
        # Gerar a consulta SQL com base na mensagem do usuário
        prompt = (
            f"Aqui está a estrutura da tabela 'inseminacao':\n{table_structure}\n\n"
            f"Com base nisso, gere uma consulta SQL PostgreSQL para: {user_message}\n"
            f"Certifique-se de usar apenas a tabela 'inseminacao' e retornar apenas as colunas relevantes."
            f"Retorne APENAS a consulta SQL sem nenhum texto adicional ou explicações."
        )
        
        # Gerar a consulta SQL com o OpenAI
        ai_response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        sql_query = ai_response.choices[0].message.content.strip()
        
        # Limpar a consulta SQL
        clean_query = clean_sql_query(sql_query)
        print(f"Consulta SQL limpa: {clean_query}")
        
        # Correção: Usar o método do Supabase para consultas diretas sem RPC
        if "DISTINCT" in clean_query.upper():
            # Para consultas com DISTINCT, usamos select() diretamente
            # Exemplo: SELECT DISTINCT FAZENDA FROM inseminacao
            select_match = re.search(r'SELECT\s+DISTINCT\s+(.*?)\s+FROM', clean_query, re.IGNORECASE)
            if select_match:
                column = select_match.group(1).strip()
                # Executar usando a API do Supabase
                result = supabase.from_('inseminacao').select(column).execute()
                # Remover duplicatas manualmente
                if hasattr(result, 'data'):
                    # Extrair valores únicos da coluna
                    unique_values = list({item[column] for item in result.data if column in item})
                    # Converter para o formato de dicionário
                    return [{'value': value} for value in unique_values], clean_query
            
        # Caso padrão: usar select com a estrutura natural do Supabase
        result = supabase.from_('inseminacao').select('*').execute()
        
        if hasattr(result, 'data'):
            return result.data, clean_query
        return [], clean_query
        
    except Exception as e:
        print(f"Erro ao executar consulta: {str(e)}")
        # Fallback para abordagem mais simples
        return simple_query(user_message)

def simple_query(user_message: str) -> Tuple[List[Dict[str, Any]], str]:
    """
    Método mais simples que usa a API básica do Supabase
    """
    try:
        # Extrair o que o usuário quer consultar
        if "FAZENDA" in user_message.upper() or "fazenda" in user_message.lower():
            # Buscar todas as fazendas
            result = supabase.from_('inseminacao').select('FAZENDA').execute()
            
            if hasattr(result, 'data'):
                # Extrair valores únicos da coluna FAZENDA
                unique_values = list({item["FAZENDA"] for item in result.data if "FAZENDA" in item})
                # Converter para o formato de dicionário
                return [{'FAZENDA': value} for value in unique_values], "SELECT DISTINCT FAZENDA FROM inseminacao"
        
        # Caso padrão: buscar todos os registros
        result = supabase.from_('inseminacao').select('*').execute()
        return result.data if hasattr(result, 'data') else [], "SELECT * FROM inseminacao"
        
    except Exception as e:
        print(f"Erro no simple_query: {str(e)}")
        return [], f"Erro: {str(e)}"

def generate_natural_response(user_message: str, data: List[Dict[str, Any]], sql_query: str) -> str:
    """
    Gera uma resposta em linguagem natural com base nos resultados da consulta
    """
    try:
        # Limitar o número de exemplos para o prompt
        sample_data = data[:5] if len(data) > 5 else data
        
        prompt = (
            f"Pergunta do usuário: '{user_message}'\n\n"
            f"Consulta SQL executada: {sql_query}\n\n"
            f"Resultados ({len(data)} registros encontrados): {json.dumps(sample_data, ensure_ascii=False)}\n\n"
            f"Crie uma resposta natural e informativa em português que responda à pergunta do usuário com base nesses dados. "
            f"Seja conciso e direto. Se a consulta retornou muitos registros, faça um resumo dos resultados."
        )
        
        ai_response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        
        return ai_response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Erro ao gerar resposta natural: {str(e)}")
        # Resposta de fallback
        if data:
            return f"Encontrei {len(data)} registros que correspondem à sua consulta sobre inseminações."
        else:
            return "Não encontrei nenhum registro que corresponda à sua consulta sobre inseminações."

@app.post("/chat")
async def chat_with_ai(request: MessageRequest):
    try:
        # Executar a consulta no Supabase
        data, sql_query = execute_supabase_query(request.message)
        
        # Gerar resposta em linguagem natural
        response = generate_natural_response(request.message, data, sql_query)
        
        return JSONResponse(content={
            "data": data,
            "response": response,
            "sql": sql_query,
            "count": len(data)
        })
    except Exception as e:
        print(f"Erro no endpoint /chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
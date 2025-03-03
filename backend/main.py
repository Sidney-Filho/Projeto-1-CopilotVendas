from fastapi import FastAPI
from pydantic import BaseModel
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
from openai import OpenAI

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

# Função para gerar a consulta SQL com base na pergunta do usuário e no contexto
def generate_sql_query(user_message: str, context: list):
    try:
        # Criar o prompt para o OpenAI
        prompt = (
            f"Aqui está a estrutura da tabela 'inseminacao':\n{table_structure}\n\n"
            f"Histórico da conversa:\n{context}\n\n"
            f"Com base nisso, gere uma consulta SQL para: {user_message}\n"
            f"Certifique-se de que a consulta SQL seja válida para PostgreSQL e retorne apenas as colunas relevantes com base na pergunta do usuário, e use apenas a tabela 'inseminacao'."
        )

        # Gerar a consulta SQL com o OpenAI
        ai_response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        sql_query = ai_response.choices[0].message.content.strip()
        return sql_query
    except Exception as e:
        raise Exception(f"Erro ao gerar consulta SQL: {str(e)}")

# Endpoint para interagir com o chat
@app.post("/chat")
async def chat_with_ai(request: MessageRequest):
    try:
        # 1. Gerar a consulta SQL com base na pergunta do usuário e no contexto
        sql_query = generate_sql_query(request.message, request.context)
        print(f"Consulta SQL gerada: {sql_query}")

        # 2. Executar a consulta no Supabase
        result = supabase.from_("inseminacao").select(sql_query).execute()
        print(f"Resposta do Supabase: {result}")

        # Verificar se a execução foi bem-sucedida
        if hasattr(result, "data") and result.data:
            data = result.data
        else:
            raise Exception("Nenhum dado retornado pela consulta SQL.")

        return JSONResponse(content={"response": data})
    except Exception as e:
        print(f"Erro no backend: {str(e)}")
        return JSONResponse(content={"error": str(e)})  
import pandas as pd
import random
from supabase import create_client, Client
from datetime import datetime, timedelta

# Função para conectar ao Supabase
def conectar_supabase():
    url = "SUA_URL_DO_SUPABASE"  # Substitua pela URL do seu projeto Supabase
    key = "SUA_CHAVE_DE_API"    # Substitua pela chave de API do seu projeto Supabase
    return create_client(url, key)

# Função para gerar dados fictícios para a tabela `fazendas`
def gerar_fazendas(num_fazendas=1):
    fazendas = []
    for i in range(num_fazendas):
        fazenda = {
            "nome": "Fazenda Marajoara",
            "estado": "TO",
            "municipio": "Cariri do Tocantins"
        }
        fazendas.append(fazenda)
    return fazendas

# Função para gerar dados fictícios para a tabela `animais`
def gerar_animais(num_animais=100, fazenda_id=1):
    animais = []
    for i in range(num_animais):
        animal = {
            "numero_animal": 111113 + i,
            "raca": "Nelore",
            "categoria": random.choice(["Multípara", "Nulípara", "Primípara precoce", "Secundípara"]),
            "fazenda_id": fazenda_id
        }
        animais.append(animal)
    return animais

# Função para gerar dados fictícios para a tabela `touros`
def gerar_touros(num_touros=3):
    touros = []
    for i in range(num_touros):
        touro = {
            "nome_touro": f"Touro {chr(65 + i)}",  # A, B, C
            "raca_touro": random.choice(["Nelore", "Brangus", "Gir"]),
            "empresa_touro": random.choice(["ABS Pecplan", "Alta Genetics", "CRV Lagoa"])
        }
        touros.append(touro)
    return touros

# Função para gerar dados fictícios para a tabela `protocolos`
def gerar_protocolos(num_protocolos=3):
    protocolos = []
    for i in range(num_protocolos):
        protocolo = {
            "nome_protocolo": random.choice(["9 dias", "8 dias", "7 dias", "10 dias"]),
            "dias_protocolo": int(random.choice(["9", "8", "7", "10"])),
            "implante_p4": random.choice(["Fertilcare 600", "Primer monodose", "Repro one"]),
            "empresa": random.choice(["MSD", "Agener", "Globalgen"])
        }
        protocolos.append(protocolo)
    return protocolos

# Função para gerar dados fictícios para a tabela `inseminacoes`
def gerar_inseminacoes(num_inseminacoes=100, animais_ids=None, touros_ids=None, protocolos_ids=None):
    inseminacoes = []
    for i in range(num_inseminacoes):
        inseminacao = {
            "animal_id": random.choice(animais_ids),
            "touro_id": random.choice(touros_ids),
            "protocolo_id": random.choice(protocolos_ids),
            "inseminador": random.choice(["Nome 1", "Nome 2", "Nome 3"]),
            "data_inseminacao": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
            "resultado": random.choice(["Sucesso", "Falha"])
        }
        inseminacoes.append(inseminacao)
    return inseminacoes

# Conectar ao Supabase
supabase = conectar_supabase()

# Gerar e enviar dados para a tabela `fazendas`
fazendas = gerar_fazendas()
response = supabase.table("fazendas").insert(fazendas).execute()
fazenda_id = response.data[0]["id"]  # ID da fazenda criada

# Gerar e enviar dados para a tabela `animais`
animais = gerar_animais(fazenda_id=fazenda_id)
response = supabase.table("animais").insert(animais).execute()
animais_ids = [animal["id"] for animal in response.data]  # IDs dos animais criados

# Gerar e enviar dados para a tabela `touros`
touros = gerar_touros()
response = supabase.table("touros").insert(touros).execute()
touros_ids = [touro["id"] for touro in response.data]  # IDs dos touros criados

# Gerar e enviar dados para a tabela `protocolos`
protocolos = gerar_protocolos()
response = supabase.table("protocolos").insert(protocolos).execute()
protocolos_ids = [protocolo["id"] for protocolo in response.data]  # IDs dos protocolos criados

# Gerar e enviar dados para a tabela `inseminacoes`
inseminacoes = gerar_inseminacoes(animais_ids=animais_ids, touros_ids=touros_ids, protocolos_ids=protocolos_ids)
response = supabase.table("inseminacoes").insert(inseminacoes).execute()

print("Dados enviados com sucesso para o Supabase!")
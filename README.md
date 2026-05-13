# Mais que Pisos — Sistema de Gestão de Pagamentos

Sistema web interno para gestão de pagamentos semanais de instaladores de pisos.

## Stack

- **Backend:** Python 3.12 + FastAPI + SQLAlchemy 2.0 + Pydantic v2
- **Banco:** PostgreSQL 16
- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS
- **Auth:** JWT (access + refresh) com bcrypt
- **PDF:** ReportLab
- **Deploy:** Docker Compose

---

## Setup Rápido (Docker)

### 1. Pré-requisitos

- Docker Desktop instalado e rodando
- Git (opcional)

### 2. Configurar variáveis de ambiente

```bash
cp .env.example backend/.env
```

Em produção, **gere uma SECRET_KEY forte:**
```bash
openssl rand -hex 32
```

### 3. Subir tudo

```bash
docker compose up --build
```

O processo vai:
1. Iniciar o PostgreSQL
2. Executar as migrations Alembic
3. Rodar o seed (cria admin e serviços de exemplo)
4. Subir o backend FastAPI
5. Buildar e servir o frontend via nginx

### 4. Acessar

| Serviço       | URL                        |
|---------------|----------------------------|
| Frontend      | http://localhost            |
| Backend API   | http://localhost:8000       |
| Swagger UI    | http://localhost:8000/docs  |
| Health check  | http://localhost:8000/health|

### 5. Login inicial

```
E-mail: admin@maisquepisos.com.br
Senha:  Admin@1234
```

> **Troque a senha imediatamente após o primeiro acesso.**

---

## Setup de Desenvolvimento (sem Docker)

### Backend

```bash
cd backend

# Crie e ative um virtualenv
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
# .venv\Scripts\activate     # Windows

pip install -r requirements.txt

# Configure o banco local
cp .env.example .env
# Ajuste DATABASE_URL para apontar ao seu PostgreSQL local

# Migrations
alembic upgrade head

# Seed
python seed.py

# Servidor de desenvolvimento
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

---

## Estrutura do Projeto

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # Entrypoint FastAPI
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── database.py          # Engine + SessionLocal
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic DTOs (request/response)
│   │   ├── repositories/        # Camada de acesso ao DB
│   │   ├── services/            # Lógica de negócio
│   │   ├── routes/              # FastAPI routers
│   │   ├── middleware/          # Error handler, logging
│   │   └── utils/               # JWT, CPF, audit listener
│   ├── migrations/              # Alembic migrations
│   ├── tests/                   # pytest tests
│   ├── seed.py                  # Dados iniciais
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/               # Telas (Login, Dashboard, etc.)
│       ├── components/layout/   # Sidebar, Layout
│       ├── services/api.ts      # Chamadas à API
│       ├── store/auth.ts        # Zustand store
│       ├── types/index.ts       # TypeScript types
│       └── lib/                 # Axios, utils
├── docker-compose.yml
└── README.md
```

---

## Entidades Principais

| Entidade       | Descrição                                      |
|----------------|------------------------------------------------|
| `usuarios`     | Controle de acesso (admin/gestor/visualizador) |
| `instaladores` | Cadastro de instaladores freelancers           |
| `obras`        | Projetos de instalação por cliente             |
| `servicos`     | Tabela de serviços com valor unitário          |
| `atividades`   | Execuções de serviço por instalador/obra       |
| `adiantamentos`| Adiantamentos a descontar no fechamento        |
| `pagamentos`   | Fechamentos semanais com PDF gerado            |
| `audit_log`    | Log automático de todas alterações financeiras |

---

## Regras de Negócio

- `valor_calculado` de uma atividade = `servico.valor_unitario × quantidade`, **gravado no momento da criação (snapshot)** — não recalcula depois
- Apenas atividades com status **aprovada** entram no fechamento semanal
- Adiantamentos **sem pagamento_id** são descontados no próximo fechamento
- `valor_liquido = max(valor_bruto − adiantamentos, 0)`
- Soft delete em instaladores e obras (campo `ativo = false`)
- Todas as alterações em entidades financeiras são registradas automaticamente em `audit_log`

---

## Papéis de Usuário

| Papel          | Permissões                                                  |
|----------------|-------------------------------------------------------------|
| `admin`        | Tudo, incluindo usuários, serviços e audit log             |
| `gestor`       | CRUD instaladores/obras/atividades, aprovação, pagamentos  |
| `visualizador` | Apenas leitura                                              |

---

## Testes

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing
```

Cobertura incluída:
- `test_pagamentos.py` — cálculo, desconto de adiantamento, snapshot de valor
- `test_atividades.py` — criação, aprovação, edição, regras de status
- `test_auth.py` — login, tokens, autorização por papel
- `test_audit.py` — geração automática de logs de auditoria

---

## API Reference

A documentação interativa está disponível em `/docs` (Swagger UI) ou `/redoc`.

### Endpoints principais

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh

GET    /api/v1/dashboard

GET    /api/v1/instaladores
POST   /api/v1/instaladores
PUT    /api/v1/instaladores/{id}

GET    /api/v1/obras
POST   /api/v1/obras
PUT    /api/v1/obras/{id}

GET    /api/v1/servicos          (admin)
POST   /api/v1/servicos          (admin)

GET    /api/v1/atividades
POST   /api/v1/atividades
POST   /api/v1/atividades/{id}/aprovar

GET    /api/v1/adiantamentos
POST   /api/v1/adiantamentos

POST   /api/v1/pagamentos/preview
POST   /api/v1/pagamentos
GET    /api/v1/pagamentos
GET    /api/v1/pagamentos/{id}/recibo    → PDF

GET    /api/v1/relatorios/semanal?inicio=&fim=

GET    /api/v1/audit-log                (admin)
GET    /api/v1/usuarios                 (admin)
```

---

## Segurança

- Senhas com bcrypt (12 rounds)
- JWT: access token (30 min) + refresh token (7 dias)
- Rate limiting em `/auth/login` (10 req/min por IP)
- CORS restritivo — configure `CORS_ORIGINS` no `.env`
- Validação de CPF com checksum
- Variáveis sensíveis apenas via `.env` (nunca comitar)

---

## Dados de Exemplo (seed)

O seed cria automaticamente:

**Usuário admin:**
- E-mail: `admin@maisquepisos.com.br`
- Senha: `Admin@1234`

**Serviços:**
- Instalação de Laminado — R$ 35,00/m²
- Instalação de Vinílico — R$ 40,00/m²
- Rodapé — R$ 8,00/m linear
- Manta Acústica — R$ 12,00/m²
- Diária — R$ 250,00
- Instalação de Porcelanato — R$ 55,00/m²
- Rejunte — R$ 10,00/m²

**Instalador e obra de exemplo** para testes rápidos.

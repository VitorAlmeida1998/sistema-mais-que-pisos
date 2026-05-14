# Sistema Mais que Pisos — Documentação Técnica

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Arquitetura](#3-arquitetura)
4. [Banco de Dados](#4-banco-de-dados)
5. [Regras de Negócio](#5-regras-de-negócio)
6. [Autenticação e Autorização](#6-autenticação-e-autorização)
7. [API — Endpoints](#7-api--endpoints)
8. [Frontend — Páginas](#8-frontend--páginas)
9. [Variáveis de Ambiente](#9-variáveis-de-ambiente)
10. [Como Rodar Localmente](#10-como-rodar-localmente)
11. [Testes](#11-testes)
12. [Estrutura de Pastas](#12-estrutura-de-pastas)

---

## 1. Visão Geral

Sistema web interno para gestão de **pagamentos semanais de instaladores freelancers** de pisos. Permite registrar obras, serviços executados, adiantamentos e realizar o fechamento semanal com geração automática de comprovante em PDF.

**Fluxo principal:**
1. Cadastrar instaladores, obras e serviços (tabela de preços)
2. Lançar atividades (serviços executados por instalador em uma obra)
3. Aprovar as atividades
4. Registrar adiantamentos eventuais
5. Realizar o fechamento semanal → o sistema calcula `bruto - adiantamentos = líquido` e gera PDF

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI 0.115 |
| ORM | SQLAlchemy 2.0 (typed mapped columns) |
| Validação | Pydantic v2 |
| Banco | PostgreSQL 16 |
| Migrations | Alembic |
| Auth | JWT via `python-jose` + bcrypt via `passlib` |
| PDF | ReportLab 4.2 |
| Rate Limiting | slowapi |
| Logging | structlog (JSON) |
| Frontend | React 18 + TypeScript + Vite |
| Estilo | TailwindCSS |
| State | Zustand |
| HTTP Client | Axios |
| Containers | Docker + Docker Compose |

---

## 3. Arquitetura

### Backend — Camadas

```
routes/ → services/ → repositories/ → models/
                ↓
           schemas/ (Pydantic DTOs)
```

| Camada | Responsabilidade |
|---|---|
| `routes/` | Endpoints HTTP, injeção de dependências, autenticação |
| `services/` | Lógica de negócio, validações cruzadas |
| `repositories/` | Acesso ao banco, queries SQL via SQLAlchemy |
| `models/` | Entidades ORM mapeadas para o PostgreSQL |
| `schemas/` | DTOs de entrada (Create/Update) e saída (Response) |
| `utils/` | JWT, bcrypt, validador de CPF, listeners de auditoria |
| `middleware/` | Tratamento global de erros HTTP |

### Frontend — Estrutura

```
src/
├── pages/          # Uma página por módulo do sistema
├── services/api.ts # Todas as chamadas à API centralizadas
├── store/auth.ts   # Estado de autenticação (Zustand)
├── lib/axios.ts    # Instância Axios com interceptor de token
├── types/index.ts  # Interfaces TypeScript de todas as entidades
└── components/     # Layout (Sidebar + wrapper)
```

### Fluxo de autenticação

```
Login → POST /api/v1/auth/login
     ← { access_token, refresh_token }

Todas as rotas protegidas → Header: Authorization: Bearer <access_token>

Expirado → POST /api/v1/auth/refresh com refresh_token
         ← novo par de tokens
```

---

## 4. Banco de Dados

### Diagrama de Entidades

```
usuarios
  ├── id, nome, email, senha_hash
  ├── papel: admin | gestor | visualizador
  └── ativo, criado_em

instaladores
  ├── id, nome, cpf (único), telefone
  ├── chave_pix, banco, agencia, conta
  ├── eh_mei, cnpj_mei
  └── ativo, observacoes, criado_em

obras
  ├── id, cliente_nome, endereco
  ├── data_inicio, data_fim_prevista
  ├── status: em_andamento | concluida | cancelada
  └── ativo, observacoes, criado_em

servicos
  ├── id, descricao
  ├── unidade: m2 | unidade | diaria | metro_linear
  ├── valor_unitario (Numeric 12,2)
  └── ativo, criado_em

atividades
  ├── id, instalador_id (FK), obra_id (FK), servico_id (FK)
  ├── quantidade (Numeric 12,3)
  ├── data_execucao, valor_calculado (snapshot)
  ├── status: pendente | aprovada | paga
  ├── aprovador_id (FK → usuarios), observacao
  └── pagamento_id (FK → pagamentos), criado_em

adiantamentos
  ├── id, instalador_id (FK)
  ├── valor, data, descricao
  ├── pagamento_id (FK → pagamentos, nullable)
  └── criado_por (FK → usuarios), criado_em

pagamentos
  ├── id, instalador_id (FK)
  ├── semana_inicio, semana_fim
  ├── valor_bruto, valor_adiantamentos, valor_liquido
  ├── data_pagamento, comprovante_pdf_path
  └── criado_por (FK → usuarios), criado_em

audit_log
  ├── id, usuario_id (FK)
  ├── acao: CREATE | UPDATE | DELETE
  ├── entidade, entidade_id
  ├── dados_antes (JSONB), dados_depois (JSONB)
  └── timestamp
```

### Relacionamentos principais

- `atividades.pagamento_id` → `pagamentos.id` (NULL = ainda não paga)
- `adiantamentos.pagamento_id` → `pagamentos.id` (NULL = ainda não descontado)
- `atividades.aprovador_id` → `usuarios.id`

---

## 5. Regras de Negócio

### Atividades

- O `valor_calculado` é calculado no momento da criação (`quantidade × servico.valor_unitario`) e **nunca recalculado** mesmo que o preço do serviço mude — é um snapshot.
- Apenas atividades com `status = pendente` podem ser editadas ou excluídas.
- Somente `admin` e `gestor` podem aprovar atividades (`status pendente → aprovada`).
- Só atividades `aprovadas` entram no fechamento semanal.

### Adiantamentos

- Adiantamentos com `pagamento_id = NULL` são considerados **pendentes** e serão descontados no próximo fechamento do instalador.
- Ao realizar o fechamento, todos os adiantamentos pendentes daquele instalador são vinculados ao pagamento.

### Fechamento Semanal (Pagamento)

```
valor_bruto        = soma dos valor_calculado de todas as atividades aprovadas no período
valor_adiantamentos = soma dos adiantamentos pendentes do instalador
valor_liquido       = max(valor_bruto - valor_adiantamentos, 0)
```

- Após o fechamento, as atividades do período passam para `status = paga`.
- Um comprovante PDF é gerado automaticamente e o caminho salvo em `comprovante_pdf_path`.
- O endpoint de preview (`POST /pagamentos/preview`) permite visualizar o cálculo antes de confirmar.

### Soft Delete

- `instaladores` e `obras` usam soft delete (`ativo = false`). Registros inativados não aparecem nas listagens padrão mas mantêm histórico de atividades e pagamentos.

### Auditoria

- Todas as operações de CREATE, UPDATE e DELETE em `atividades`, `adiantamentos` e `pagamentos` são registradas automaticamente na tabela `audit_log` via SQLAlchemy event listeners.
- O `usuario_id` é propagado pelo contexto da requisição para o listener.

---

## 6. Autenticação e Autorização

### Tokens JWT

| Token | Expiração | Uso |
|---|---|---|
| `access_token` | 30 minutos | Header `Authorization: Bearer` em todas as rotas |
| `refresh_token` | 7 dias | Endpoint `POST /auth/refresh` para renovar o access token |

### Papéis (`papel`)

| Papel | Permissões |
|---|---|
| `admin` | Tudo: gerencia usuários, serviços, audit log e todas as operações |
| `gestor` | CRUD de instaladores, obras, atividades, adiantamentos e fechamentos; não gerencia usuários/serviços |
| `visualizador` | Somente leitura (GET) em todos os módulos |

### Proteção de rotas (backend)

```python
# Apenas admin e gestor
Depends(require_papel("admin", "gestor"))

# Apenas admin
Depends(require_papel("admin"))

# Qualquer usuário autenticado
Depends(get_current_user)
```

### Rate Limit

Login (`POST /auth/login`) tem limite de **10 requisições/minuto por IP** via slowapi.

---

## 7. API — Endpoints

**Base URL:** `http://localhost:8000/api/v1`

### Auth

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Login com email/senha, retorna tokens |
| POST | `/auth/refresh` | Renova access token via refresh token |
| POST | `/auth/logout` | Logout (stateless, invalida no cliente) |

### Instaladores

| Método | Rota | Papel mínimo |
|---|---|---|
| GET | `/instaladores` | visualizador |
| POST | `/instaladores` | gestor |
| GET | `/instaladores/{id}` | visualizador |
| PUT | `/instaladores/{id}` | gestor |
| DELETE | `/instaladores/{id}` | admin |

### Obras

| Método | Rota | Papel mínimo |
|---|---|---|
| GET | `/obras` | visualizador |
| POST | `/obras` | gestor |
| GET | `/obras/{id}` | visualizador |
| PUT | `/obras/{id}` | gestor |
| DELETE | `/obras/{id}` | admin |

### Serviços

| Método | Rota | Papel mínimo |
|---|---|---|
| GET | `/servicos` | visualizador |
| POST | `/servicos` | admin |
| GET | `/servicos/{id}` | visualizador |
| PUT | `/servicos/{id}` | admin |
| DELETE | `/servicos/{id}` | admin |

### Atividades

| Método | Rota | Papel mínimo | Observação |
|---|---|---|---|
| GET | `/atividades` | visualizador | Filtros: `instalador_id`, `obra_id`, `status`, `data_inicio`, `data_fim` |
| POST | `/atividades` | gestor | Calcula `valor_calculado` automaticamente |
| GET | `/atividades/{id}` | visualizador | |
| PUT | `/atividades/{id}` | gestor | Apenas status `pendente` |
| DELETE | `/atividades/{id}` | gestor | Apenas status `pendente` |
| POST | `/atividades/{id}/aprovar` | gestor | `pendente → aprovada` |

### Adiantamentos

| Método | Rota | Papel mínimo |
|---|---|---|
| GET | `/adiantamentos` | visualizador |
| POST | `/adiantamentos` | gestor |
| GET | `/adiantamentos/{id}` | visualizador |
| DELETE | `/adiantamentos/{id}` | gestor |

### Pagamentos (Fechamento Semanal)

| Método | Rota | Papel mínimo | Observação |
|---|---|---|---|
| GET | `/pagamentos` | visualizador | |
| GET | `/pagamentos/{id}` | visualizador | |
| POST | `/pagamentos/preview` | gestor | Simula o fechamento sem gravar |
| POST | `/pagamentos` | gestor | Confirma o fechamento, gera PDF |
| GET | `/pagamentos/{id}/pdf` | visualizador | Download do comprovante PDF |

### Dashboard

| Método | Rota | Descrição |
|---|---|---|
| GET | `/dashboard` | Totais: atividades pendentes, instaladores ativos, pagamentos da semana, valor total |

### Relatórios

| Método | Rota | Descrição |
|---|---|---|
| GET | `/relatorios/semanal` | Resumo de todos os pagamentos de uma semana |
| GET | `/relatorios/instalador/{id}` | Histórico completo de um instalador |

### Usuários (admin)

| Método | Rota |
|---|---|
| GET | `/usuarios` |
| POST | `/usuarios` |
| GET | `/usuarios/{id}` |
| PUT | `/usuarios/{id}` |
| DELETE | `/usuarios/{id}` |

### Audit Log (admin)

| Método | Rota | Filtros disponíveis |
|---|---|---|
| GET | `/audit-log` | `entidade`, `acao`, `usuario_id`, `data_inicio`, `data_fim` |

### Health Check

```
GET /health
→ { "status": "ok", "database": true }
```

---

## 8. Frontend — Páginas

| Rota | Página | Papel mínimo |
|---|---|---|
| `/login` | Login | — |
| `/` | Dashboard | qualquer |
| `/instaladores` | CRUD de instaladores | qualquer (escrita: gestor) |
| `/obras` | CRUD de obras | qualquer (escrita: gestor) |
| `/servicos` | CRUD de serviços | qualquer (escrita: admin) |
| `/atividades` | Lançamento e aprovação de atividades | qualquer (escrita: gestor) |
| `/adiantamentos` | Registro de adiantamentos | qualquer (escrita: gestor) |
| `/fechamento` | Preview e confirmação do fechamento semanal | gestor |
| `/pagamentos` | Histórico de pagamentos e download de PDF | qualquer |
| `/usuarios` | CRUD de usuários | admin |
| `/audit-log` | Log de auditoria | admin |

---

## 9. Variáveis de Ambiente

Arquivo: `backend/.env` (copiar de `backend/.env.example`)

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://mqp_user:mqp_pass@postgres:5432/mqp_db` |
| `SECRET_KEY` | Chave secreta para assinar JWT — **gerar com `openssl rand -hex 32`** | — |
| `ALGORITHM` | Algoritmo JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Expiração do access token | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Expiração do refresh token | `7` |
| `BCRYPT_ROUNDS` | Custo do bcrypt | `12` |
| `CORS_ORIGINS` | Origens permitidas (separadas por vírgula) | `http://localhost:5173,http://localhost:80` |
| `PDF_STORAGE_PATH` | Diretório onde os PDFs são salvos | `/app/pdfs` |
| `LOG_LEVEL` | Nível de log | `INFO` |
| `ENVIRONMENT` | `development` ativa SQL echo | `development` |

---

## 10. Como Rodar Localmente

### Pré-requisitos

- Docker Desktop instalado e rodando
- Git

### Passos

```bash
# 1. Clonar o repositório
git clone <url-do-repo>
cd "Sistema Mais que Pisos"

# 2. Criar o arquivo de variáveis de ambiente
cp backend/.env.example backend/.env

# 3. Gerar uma SECRET_KEY segura e colocar no backend/.env
openssl rand -hex 32

# 4. Subir todos os containers
docker compose up --build
```

Na primeira inicialização o backend executa automaticamente:
1. `alembic upgrade head` — aplica todas as migrations
2. `python seed.py` — cria o usuário admin padrão

### Acessos após subir

| Serviço | URL |
|---|---|
| Frontend | http://localhost |
| API (docs Swagger) | http://localhost:8000/docs |
| API (ReDoc) | http://localhost:8000/redoc |
| PostgreSQL | localhost:5432 |

### Credenciais padrão (seed)

| Campo | Valor |
|---|---|
| Email | `admin@maisquepisos.com.br` |
| Senha | `Admin@1234` |

### Comandos úteis

```bash
# Ver logs em tempo real
docker compose logs -f backend

# Parar os containers
docker compose down

# Parar e apagar volumes (reseta o banco)
docker compose down -v

# Rodar apenas o banco (para desenvolvimento local sem Docker no backend)
docker compose up postgres
```

---

## 11. Testes

Os testes usam **SQLite in-memory** e são completamente isolados — não precisam do PostgreSQL rodando.

```bash
# Rodar todos os testes (dentro do container)
docker compose exec backend pytest

# Com cobertura
docker compose exec backend pytest --cov=app --cov-report=term-missing

# Ou localmente com ambiente virtual
cd backend
pip install -r requirements.txt
pytest
```

### Suítes de teste

| Arquivo | O que testa |
|---|---|
| `tests/test_auth.py` | Login, refresh token, credenciais inválidas, usuário inativo |
| `tests/test_atividades.py` | CRUD de atividades, aprovação, regras de status |
| `tests/test_pagamentos.py` | Preview, fechamento semanal, cálculo líquido, PDF |
| `tests/test_audit.py` | Registro automático de audit logs em operações CRUD |

---

## 12. Estrutura de Pastas

```
.
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── DOCUMENTACAO.md
│
├── backend/
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── seed.py                         # Cria usuário admin inicial
│   ├── .env.example
│   │
│   ├── app/
│   │   ├── main.py                     # Entry point FastAPI, routers, middleware
│   │   ├── config.py                   # Pydantic Settings (lê .env)
│   │   ├── database.py                 # Engine, SessionLocal, get_db()
│   │   │
│   │   ├── models/                     # Entidades SQLAlchemy
│   │   │   ├── usuario.py
│   │   │   ├── instalador.py
│   │   │   ├── obra.py
│   │   │   ├── servico.py
│   │   │   ├── atividade.py
│   │   │   ├── adiantamento.py
│   │   │   ├── pagamento.py
│   │   │   └── audit_log.py
│   │   │
│   │   ├── schemas/                    # DTOs Pydantic (Create/Update/Response)
│   │   │   ├── auth.py
│   │   │   ├── usuario.py
│   │   │   ├── instalador.py
│   │   │   ├── obra.py
│   │   │   ├── servico.py
│   │   │   ├── atividade.py
│   │   │   ├── adiantamento.py
│   │   │   └── pagamento.py
│   │   │
│   │   ├── repositories/               # Acesso a dados
│   │   │   ├── base.py                 # BaseRepository genérico (get/create/update/delete)
│   │   │   ├── usuario.py
│   │   │   ├── instalador.py
│   │   │   ├── obra.py
│   │   │   ├── servico.py
│   │   │   ├── atividade.py            # Queries com filtros de status/data/instalador
│   │   │   ├── adiantamento.py
│   │   │   └── pagamento.py
│   │   │
│   │   ├── services/                   # Lógica de negócio
│   │   │   ├── auth.py
│   │   │   ├── usuario.py
│   │   │   ├── instalador.py
│   │   │   ├── obra.py
│   │   │   ├── servico.py
│   │   │   ├── atividade.py            # Snapshot de valor, validações cruzadas
│   │   │   ├── adiantamento.py
│   │   │   ├── pagamento.py            # Fechamento semanal, cálculo líquido
│   │   │   └── pdf_generator.py        # Geração de comprovante PDF (ReportLab)
│   │   │
│   │   ├── routes/                     # Endpoints HTTP
│   │   │   ├── auth.py
│   │   │   ├── usuarios.py
│   │   │   ├── instaladores.py
│   │   │   ├── obras.py
│   │   │   ├── servicos.py
│   │   │   ├── atividades.py
│   │   │   ├── adiantamentos.py
│   │   │   ├── pagamentos.py
│   │   │   ├── dashboard.py
│   │   │   ├── relatorios.py
│   │   │   └── audit_log.py
│   │   │
│   │   ├── middleware/
│   │   │   └── error_handler.py        # Handlers globais de HTTPException e erros genéricos
│   │   │
│   │   └── utils/
│   │       ├── auth.py                 # JWT encode/decode, get_current_user, require_papel
│   │       ├── cpf_validator.py        # Validação de CPF (dígitos verificadores)
│   │       └── audit_listener.py       # SQLAlchemy event listeners para audit log
│   │
│   ├── migrations/
│   │   └── versions/
│   │       └── 001_initial_schema.py   # Migration única com todo o schema
│   │
│   └── tests/
│       ├── conftest.py                 # Fixtures: SQLite in-memory, cliente HTTP, usuários
│       ├── test_auth.py
│       ├── test_atividades.py
│       ├── test_pagamentos.py
│       └── test_audit.py
│
└── frontend/
    ├── Dockerfile                      # Build multi-stage: Node (Vite build) → Nginx
    ├── nginx.conf                      # SPA fallback + proxy /api → backend:8000
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx                     # React Router com rotas protegidas
        ├── index.css
        ├── types/index.ts              # Interfaces TypeScript de todas as entidades
        ├── services/api.ts             # Funções de chamada à API (uma por recurso)
        ├── store/auth.ts               # Estado global de autenticação (Zustand)
        ├── lib/
        │   ├── axios.ts                # Instância Axios + interceptor Bearer token
        │   └── utils.ts                # Formatadores de moeda, data, CPF
        ├── hooks/
        │   └── useAuth.ts              # Hook para acessar o store de auth
        ├── components/layout/
        │   ├── Layout.tsx
        │   └── Sidebar.tsx
        └── pages/
            ├── Login.tsx
            ├── Dashboard.tsx
            ├── Instaladores.tsx
            ├── Obras.tsx
            ├── Servicos.tsx
            ├── Atividades.tsx
            ├── Adiantamentos.tsx
            ├── FechamentoSemanal.tsx
            ├── Pagamentos.tsx
            ├── Usuarios.tsx
            └── AuditLog.tsx
```

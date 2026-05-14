# Manual do Usuário — Mais que Pisos

## Índice

1. [Acesso ao sistema](#1-acesso-ao-sistema)
2. [Perfis de usuário](#2-perfis-de-usuário)
3. [Dashboard](#3-dashboard)
4. [Cadastro de instaladores](#4-cadastro-de-instaladores)
5. [Cadastro de obras](#5-cadastro-de-obras)
6. [Tabela de serviços](#6-tabela-de-serviços)
7. [Lançamento de atividades](#7-lançamento-de-atividades)
8. [Adiantamentos](#8-adiantamentos)
9. [Fechamento semanal](#9-fechamento-semanal)
10. [Histórico de pagamentos](#10-histórico-de-pagamentos)
11. [Gerenciamento de usuários](#11-gerenciamento-de-usuários)
12. [Log de auditoria](#12-log-de-auditoria)
13. [Fluxo completo de uso](#13-fluxo-completo-de-uso)

---

## 1. Acesso ao sistema

Abra o navegador e acesse o endereço do sistema. A tela de login será exibida.

**Credenciais padrão (primeiro acesso):**

| Campo | Valor |
|-------|-------|
| E-mail | `admin@maisquepisos.com.br` |
| Senha | `Admin@1234` |

> Troque a senha imediatamente após o primeiro login em **Usuários → editar perfil**.

Após o login, o sistema mantém a sessão ativa por 30 minutos. Se a sessão expirar durante o uso, o sistema renova automaticamente. Caso o navegador seja fechado, será necessário fazer login novamente.

---

## 2. Perfis de usuário

O sistema possui três perfis com permissões diferentes:

| Perfil | O que pode fazer |
|--------|-----------------|
| **Admin** | Acesso total: gerencia usuários, serviços, audit log e todas as operações |
| **Gestor** | Cadastra instaladores, obras, lança atividades, registra adiantamentos e realiza fechamentos |
| **Visualizador** | Apenas consulta — não pode criar, editar ou excluir nada |

---

## 3. Dashboard

A página inicial exibe um resumo em tempo real:

- **Atividades pendentes** — quantas atividades ainda aguardam aprovação
- **Instaladores ativos** — total de instaladores cadastrados e ativos
- **Pagamentos da semana** — fechamentos realizados na semana atual
- **Valor total pago** — soma dos pagamentos líquidos da semana

Use o dashboard para ter uma visão rápida do estado do sistema antes de começar o trabalho do dia.

---

## 4. Cadastro de instaladores

Menu: **Instaladores**

### Cadastrar novo instalador

1. Clique em **Novo instalador**
2. Preencha os campos:
   - **Nome** — nome completo
   - **CPF** — somente números, o sistema valida automaticamente
   - **Telefone** — com DDD
   - **Chave Pix** — chave para pagamento (CPF, e-mail, telefone ou chave aleatória)
   - **Banco, agência e conta** — opcional, para controle interno
   - **É MEI?** — marque se o instalador emite nota como MEI e informe o CNPJ
   - **Observações** — campo livre para anotações
3. Clique em **Salvar**

### Editar instalador

Clique no ícone de edição na linha do instalador desejado. Todos os campos podem ser alterados.

### Inativar instalador

Clique no ícone de exclusão. O instalador não será apagado do banco — ficará inativo e não aparecerá nas listagens normais, mas o histórico de atividades e pagamentos é preservado.

> Apenas o perfil **admin** pode inativar instaladores.

---

## 5. Cadastro de obras

Menu: **Obras**

### Cadastrar nova obra

1. Clique em **Nova obra**
2. Preencha:
   - **Nome do cliente**
   - **Endereço**
   - **Data de início**
   - **Data de término prevista** — opcional
   - **Status** — `Em andamento`, `Concluída` ou `Cancelada`
   - **Observações** — campo livre
3. Clique em **Salvar**

### Alterar status da obra

Edite a obra e altere o campo **Status**. Obras concluídas ou canceladas não aparecem como opção ao lançar novas atividades.

---

## 6. Tabela de serviços

Menu: **Serviços** (somente **admin**)

A tabela de serviços define os tipos de trabalho e seus valores unitários. O sistema já vem com serviços pré-cadastrados no seed:

| Serviço | Unidade | Valor |
|---------|---------|-------|
| Instalação de Laminado | m² | R$ 35,00 |
| Instalação de Vinílico | m² | R$ 40,00 |
| Rodapé | metro linear | R$ 8,00 |
| Manta Acústica | m² | R$ 12,00 |
| Diária | unidade | R$ 250,00 |
| Instalação de Porcelanato | m² | R$ 55,00 |
| Rejunte | m² | R$ 10,00 |

### Adicionar serviço

1. Clique em **Novo serviço**
2. Informe a descrição, unidade de medida e valor unitário
3. Clique em **Salvar**

### Importante sobre alteração de preços

Alterar o valor de um serviço **não afeta atividades já lançadas**. O sistema guarda o valor no momento do lançamento (snapshot), garantindo que o histórico de pagamentos não mude.

---

## 7. Lançamento de atividades

Menu: **Atividades**

Atividades representam os serviços executados por um instalador em uma obra. Este é o módulo central do sistema.

### Lançar nova atividade

1. Clique em **Nova atividade**
2. Selecione:
   - **Instalador** — quem executou o serviço
   - **Obra** — onde foi executado
   - **Serviço** — tipo de serviço da tabela
   - **Quantidade** — metragem, unidades ou diárias
   - **Data de execução** — quando foi realizado
   - **Observação** — opcional
3. O **valor calculado** é exibido automaticamente (`quantidade × valor unitário`)
4. Clique em **Salvar**

A atividade é criada com status **Pendente**.

### Status das atividades

| Status | Significado |
|--------|------------|
| **Pendente** | Lançada, aguardando aprovação |
| **Aprovada** | Aprovada por gestor ou admin — entra no fechamento |
| **Paga** | Incluída em um fechamento semanal concluído |

### Aprovar atividade

Atividades com status **Pendente** podem ser aprovadas individualmente:

1. Localize a atividade na lista (filtre por status "Pendente" se necessário)
2. Clique em **Aprovar**
3. O status muda para **Aprovada**

> Somente **gestor** e **admin** podem aprovar atividades.

### Editar ou excluir atividade

Apenas atividades com status **Pendente** podem ser editadas ou excluídas. Atividades aprovadas ou pagas não podem ser alteradas — isso garante a integridade do histórico financeiro.

### Filtros disponíveis

Use os filtros no topo da lista para localizar atividades por:
- Instalador
- Obra
- Status
- Período (data início e fim)

---

## 8. Adiantamentos

Menu: **Adiantamentos**

Adiantamentos são valores pagos antecipadamente ao instalador que serão descontados no próximo fechamento semanal.

### Registrar adiantamento

1. Clique em **Novo adiantamento**
2. Selecione o **instalador**
3. Informe o **valor** e a **data**
4. Adicione uma **descrição** (ex: "adiantamento para compra de material")
5. Clique em **Salvar**

O adiantamento fica com status **pendente** até o próximo fechamento do instalador.

### Excluir adiantamento

Adiantamentos ainda não vinculados a um fechamento podem ser excluídos. Após o fechamento, o registro é mantido permanentemente.

---

## 9. Fechamento semanal

Menu: **Fechamento**

O fechamento semanal calcula o quanto cada instalador tem a receber no período, desconta os adiantamentos pendentes e gera o comprovante em PDF.

### Passo a passo do fechamento

**1. Verificar pré-requisitos**
- As atividades do período devem estar com status **Aprovada**
- Adiantamentos pendentes serão descontados automaticamente

**2. Usar o Preview**

Antes de confirmar, use o preview para conferir os valores:

1. Selecione o **instalador**
2. Informe o período (**data início** e **data fim** da semana)
3. Clique em **Calcular preview**

O sistema exibe:
- Lista de atividades aprovadas no período
- Valor bruto (soma das atividades)
- Adiantamentos pendentes que serão descontados
- **Valor líquido** a receber

**3. Confirmar o fechamento**

Se os valores estiverem corretos, clique em **Confirmar fechamento**.

O sistema irá:
- Marcar todas as atividades do período como **Paga**
- Vincular os adiantamentos pendentes ao pagamento
- Gerar automaticamente o comprovante em PDF
- Registrar o pagamento no histórico

### Fórmula do cálculo

```
Valor bruto        = soma de todas as atividades aprovadas no período
Valor adiantamentos = soma dos adiantamentos pendentes do instalador
Valor líquido       = valor bruto − adiantamentos (mínimo R$ 0,00)
```

> Se os adiantamentos forem maiores que o bruto, o líquido será R$ 0,00. O saldo negativo não é carregado para o próximo período — cada fechamento começa do zero.

---

## 10. Histórico de pagamentos

Menu: **Pagamentos**

Exibe todos os fechamentos já realizados com os detalhes de cada pagamento.

### Download do comprovante PDF

1. Localize o pagamento na lista
2. Clique no ícone de **download PDF**
3. O comprovante é gerado automaticamente com:
   - Dados do instalador
   - Período do fechamento
   - Lista de atividades
   - Adiantamentos descontados
   - Valor líquido

### Filtros

A lista pode ser filtrada por instalador e período para facilitar a localização de pagamentos anteriores.

---

## 11. Gerenciamento de usuários

Menu: **Usuários** (somente **admin**)

### Criar novo usuário

1. Clique em **Novo usuário**
2. Informe nome, e-mail e senha temporária
3. Selecione o **perfil**: admin, gestor ou visualizador
4. Clique em **Salvar**

Avise o novo usuário para trocar a senha no primeiro acesso.

### Editar usuário

Permite alterar nome, e-mail, senha e perfil. Para desativar um usuário sem excluí-lo, altere o campo **Ativo** para inativo.

### Excluir usuário

Remove permanentemente. Recomenda-se inativar ao invés de excluir para preservar o histórico de aprovações no audit log.

---

## 12. Log de auditoria

Menu: **Audit Log** (somente **admin**)

Registra automaticamente todas as operações realizadas em entidades financeiras (atividades, adiantamentos e pagamentos).

Cada registro contém:
- **Quem** realizou a ação (usuário)
- **O que** foi feito (criar, editar, excluir)
- **Quando** (data e hora exata)
- **Entidade** afetada e seu ID
- **Dados antes e depois** da alteração

Use os filtros para pesquisar por usuário, tipo de ação, entidade ou período.

---

## 13. Fluxo completo de uso

Este é o fluxo típico do sistema semana a semana:

### Configuração inicial (uma vez)

```
1. Admin cria os usuários da equipe
2. Admin cadastra a tabela de serviços com os valores
3. Gestor cadastra os instaladores com dados do Pix
4. Gestor cadastra as obras em andamento
```

### Operação semanal

```
Segunda a sexta:
  → Gestor lança as atividades conforme os serviços são executados
  → Gestor registra adiantamentos quando necessário
  → Gestor (ou admin) aprova as atividades lançadas

Sexta ou segunda-feira seguinte:
  → Gestor acessa Fechamento
  → Seleciona cada instalador e o período da semana
  → Confere o preview (bruto, adiantamentos, líquido)
  → Confirma o fechamento
  → Baixa o PDF de comprovante para enviar ao instalador
```

### Dicas importantes

- **Sempre use o preview** antes de confirmar o fechamento — após confirmar não é possível desfazer
- **Atividades aprovadas não podem ser editadas** — revise bem antes de aprovar
- **Adiantamentos são descontados automaticamente** — não é necessário fazer nenhum cálculo manual
- **O valor calculado da atividade é fixo** — mudanças no preço do serviço não afetam atividades já lançadas
- **Soft delete preserva o histórico** — instaladores e obras inativados mantêm todo o histórico de pagamentos

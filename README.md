# Painel de compliance

Dashboard modular para consultar as APIs de compliance e exibir indicadores de adesão.

## Executar

Instale as dependências e inicie a interface e o proxy local (não abra o HTML diretamente como arquivo):

```powershell
py -m pip install -r requirements.txt
py server.py
```

Abra `http://localhost:8080`, informe o cliente, o período e o token Bearer da API e selecione **Atualizar painel**. O servidor local encaminha apenas os endpoints listados abaixo para a API em `http://127.0.0.1:8000`, evitando a necessidade de CORS no backend. No painel raiz, o token digitado é encaminhado no header `Authorization`, sem ser incluído na URL ou armazenado fora do campo de autenticação.

### Rotas por cliente

Cada cliente possui uma rota, por exemplo `http://localhost:8080/compliance/dashboard/americanas`. As rotas disponíveis são `abpf-oncologia`, `agis`, `alvarez-marsal`, `americanas`, `amino`, `chep`, `comexport-trading`, `de-millus`, `enforce`, `flow-invest`, `grupo-bravante`, `grupo-libra`, `hikvision`, `horizonte-restaurante`, `imile` e `inbrands`.

Configure um token por cliente no arquivo `.env`, usando as chaves listadas em `.env.example`. O servidor lê esse arquivo ao iniciar, define o cliente pela rota e envia o token correspondente no header `Authorization` para cada endpoint; o token não é enviado ao navegador. Nessas rotas, o campo de cliente não é exibido, o nome formatado do cliente é adicionado ao título do painel e o campo de token permanece oculto. Reinicie o servidor depois de alterar o `.env`. As chaves são criadas vazias; preencha-as com os tokens válidos antes de consultar as APIs.

O `.env` é excluído do Git e bloqueado no servidor HTTP. As rotas selecionam tokens, mas não autenticam usuários: se o servidor for disponibilizado a outras pessoas ou à internet, proteja o acesso às rotas com autenticação/controle de acesso na infraestrutura.

Cada seção do painel possui um indicador de carregamento independente e exibe seus dados assim que as respectivas consultas assíncronas terminam.

## API

O campo de autenticação aceita o token puro ou precedido por `Bearer`. Se a API responder HTTP 401, confira se o token está válido e autorizado para os endpoints.

A URL base da API está configurada como `http://127.0.0.1:8000` em `server.py`. O painel consulta:

- `/compliance/resumo`
- `/compliance/adesao-produto`
- `/compliance/adesao-cliente`
- `/compliance/adesao-passageiro`
- `/compliance/adesao-autorizador`
- `/compliance/adesao-centro-de-custo`
- `/compliance/lista-rules-reserva`
- `/compliance/rule-reserva`

As consultas dos indicadores recebem `cliente_slug`, `data_inicio` e `data_fim`. A visualização de detalhes envia somente `cliente_slug` e `numero_reserva` para `/compliance/rule-reserva`, usando o token do dashboard no header `Authorization`.

Os indicadores de passageiros, autorizadores e centros de custo podem ser filtrados pelo nome usando o campo de busca acima de cada tabela e exportados em CSV pelo botão de download no cabeçalho.

O indicador **Reservas** lista cada reserva retornada por `/compliance/adesao-passageiro`, com busca e filtros por resultado (aderente, não aderente ou indeterminada). O ícone de detalhes abre um modal no dashboard com os dados de `/compliance/rule-reserva`.

O indicador **Evolução mensal da adesão** usa `/compliance/adesao-cliente` e calcula o percentual mensal ponderando a aderência de cada cliente pelo campo `total` de reservas: soma de (`total` × aderência) dividida pela soma de `total`. Meses sem totais válidos não são plotados.

O indicador **Motivos de não aderência** está temporariamente oculto no painel. Quando ativo, usa `/compliance/lista-rules-reserva` com os filtros atuais de cliente e período e exibe uma linha por `rule_type`, com o nome do motivo identificado diretamente ao lado da linha, contando por mês as reservas cujo resultado geral e resultado da regra são `FAIL`; a data de emissão (`dtemissao`) define o mês. Uma reserva com mais de um tipo de regra reprovado é contada uma vez em cada tipo.

O indicador **Adesão por Empresa** mantém juntos os meses com até duas empresas. Meses com mais de duas empresas recebem uma página própria, com controles de navegação quando necessário.

## Organização do código

```text
src/
  api/                    # Endpoints e cliente HTTP da API de compliance
  app/                    # Inicialização do dashboard, filtros e estado da página
  indicators/
    client/               # Adesão por cliente
    product/              # Adesão por produto
    rule-failures/         # Reservas não aderentes agrupadas por tipo de regra
    summary/              # Indicadores gerais do período
    passengers/           # Resumo por passageiro
    approvers/             # Resumo por autorizador
    cost-centers/          # Resumo por centro de custo
    reservations/          # Reservas individuais e links para regras
    details.js             # Composição dos indicadores detalhados
  shared/                  # DOM, formatação, tabelas, agregações e CSV reutilizáveis
  main.js                  # Ponto de entrada
  app/reservation-rules.js # Visualização das regras dentro do dashboard
```

Cada indicador mantém sua renderização e transformação de dados isoladas. A camada `shared` contém utilitários reutilizados pelos indicadores, enquanto `api` concentra a comunicação com os endpoints.

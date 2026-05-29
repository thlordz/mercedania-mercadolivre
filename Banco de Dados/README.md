# Banco de Dados - Gestão de Vendas

Esta pasta concentra a planilha original, o schema e o SQLite usado pelo aplicativo Electron.

## Arquivos

- `Gestão de Anúncio - Mercado Livre(2).xlsm`: planilha fonte.
- `gestao_vendas.sqlite`: banco SQLite usado pelo app.
- `schema.sql`: estrutura das tabelas.
- `import_planilha.py`: importador legado em Python.
- `consultas_exemplo.sql`: consultas úteis para análise.

## Importação recomendada

Na raiz do projeto, rode:

```bash
npm run import:planilha
```

Esse comando usa `scripts/import-planilha.js` e não depende de Python instalado.

## Tabelas principais

- `anuncios`: base da aba Precificação de produto.
- `promocoes`: base da aba Central de Promoções.
- `vendas`: base da aba Vendas.
- `simulacoes`: futura base para salvar simulações.
- `importacoes`: histórico das importações feitas.

## Observação

Campos sensíveis da aba Vendas, como CPF/CNPJ e endereço completo, não são importados. O banco mantém apenas o necessário para as telas: venda, cliente, status, produto, SKU, quantidade e valores.

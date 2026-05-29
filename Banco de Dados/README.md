# Banco de dados - Gestão de Vendas

Este pacote cria um banco SQLite inicial usando a planilha atual.

## Arquivos

- `gestao_vendas.sqlite`: banco já criado e importado.
- `schema.sql`: estrutura das tabelas.
- `import_planilha.py`: importador da planilha `.xlsm` para SQLite.
- `consultas_exemplo.sql`: consultas úteis para as telas.

## Como usar

Coloque a planilha na mesma pasta e rode:

```bash
python import_planilha.py --planilha "Gestão de Anúncio - Mercado Livre(2).xlsm" --db gestao_vendas.sqlite
```

## Tabelas principais

- `anuncios`: base da aba Precificação de produto.
- `promocoes`: base da aba Central de Promoções.
- `vendas`: base da aba Vendas.
- `simulacoes`: futura base para salvar simulações.
- `importacoes`: histórico das importações feitas.

## Observação

Para o MVP, campos sensíveis da aba Vendas, como CPF/CNPJ e endereço completo, não foram importados. O sistema só trouxe o necessário para a tela de vendas: venda, cliente, status, produto, SKU, quantidade e valores.

# my work

Aplicação pessoal para registrar tickets fechados e acompanhar o total por dia.

## Recursos

- Cadastro e login com e-mail e senha no Supabase.
- Chamados em PostgreSQL, vinculados ao usuário autenticado.
- Consulta por dia, total de hoje, exclusão e proteção contra duplicados.
- Exportação e importação do CSV da versão anterior.
- Regras no banco impedem o acesso aos chamados de outra conta.

## Executar

Sirva a pasta `dist` por HTTP. Por exemplo, com Python instalado: `python -m http.server 8080 --directory dist` e abra http://localhost:8080.

## Banco

O projeto Supabase separado é `bqdygjinznkuogecsngx`. A estrutura está em `schema.sql` e já foi aplicada. Em um novo projeto, aplique esse arquivo e altere `dist/config.js` com a URL e a chave publicável. Nunca use chaves secretas ou service_role no navegador.

Para começar, clique em **Criar minha conta**, confirme o e-mail e entre. Se o Supabase exigir configuração do remetente de e-mail ou do endereço de confirmação, faça isso no painel de Authentication. Nenhuma conta pessoal é criada automaticamente por este código.

Os registros ficam no banco e não dependem do armazenamento local do navegador. A sessão de login é gerenciada pelo Supabase. O código no GitHub não é um backup dos registros; exporte o CSV periodicamente e verifique a política de backup do seu plano Supabase.

## Migrar registros antigos

Abra a versão anterior no mesmo navegador em que registrou os tickets, exporte o CSV, entre no my work e clique em **Importar CSV**. A importação mantém os registros originais e ignora tickets já existentes.

## Hospedagem

Publique a pasta `dist` em um serviço de hospedagem estática. O arquivo `.openai/hosting.json` pertence à hospedagem Sites. GitHub armazena o código; o banco de dados fica no Supabase.

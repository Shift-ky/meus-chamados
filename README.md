# my work

Controle pessoal de chamados fechados e bloco de notas livre. A aplicação abre diretamente, sem cadastro ou senha própria. O Site permanece privado para o proprietário na hospedagem Sites.

Os registros ficam no banco D1 da hospedagem, disponíveis entre sessões e dispositivos autorizados. Não dependem de localStorage. O Supabase anterior não é mais utilizado; estava sem registros quando a mudança foi feita.

## Funcionalidades

Registro e consulta de tickets por dia, prevenção de duplicados, exclusão, importação/exportação CSV e bloco de notas com botão Salvar anotações.

## Projeto

- public/: interface e interações.
- worker/index.js: rotas e acesso ao banco.
- drizzle/: migrações SQLite/D1.
- .openai/hosting.json: configuração do Site privado e binding DB.
- build.cjs: gera o Worker com a interface incorporada.
- check.mjs: verifica persistência, validação e proteção de origem em SQLite em memória.

Execute `node build.cjs` e `node check.mjs` na pasta do projeto. O teste requer Node.js com node:sqlite. A publicação pela ferramenta Sites provisiona o banco e aplica as migrações. Os endpoints pressupõem a proteção de acesso privado da hospedagem; preserve essa configuração.

Os arquivos schema.sql e notepad.sql são do banco Supabase anterior e não são utilizados pela versão atual. O código GitHub não contém seus registros. Exporte os tickets em CSV quando precisar de uma cópia.

## Histórico de anotações
Cada salvamento cria uma anotação separada e libera o campo. O histórico fica recolhido; abra uma anotação e clique em Editar para alterar o texto salvo. O bloco antigo é preservado automaticamente como uma anotação do histórico. A lista de chamados também inicia recolhida.

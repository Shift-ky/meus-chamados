# My Work — extensão do Chrome

Painel lateral conectado ao My Work existente.

## Instalação

1. Baixe e extraia o ZIP da extensão.
2. Abra chrome://extensions e ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta que contém manifest.json.
4. Fixe o My Work no menu de extensões e clique no ícone.
5. Clique em **Entrar / abrir site**, faça login e recarregue a aba do site.
6. Volte ao painel e clique em **Conectar / atualizar**.

Mantenha a aba do My Work aberta no mesmo perfil do Chrome; ela pode ficar em segundo plano. Requer Chrome 116 ou posterior e internet. Salve as anotações antes de fechar o painel.

## Dados e acesso

Chamados e anotações usam o mesmo banco do site e do PWA. O código local do painel se comunica com uma extensão de conteúdo que faz as requisições na aba autenticada do site. Nenhuma chave, senha ou token é distribuído. Apenas o domínio do My Work e a permissão de painel lateral são solicitados. Não há acesso às demais páginas. Atualize o painel para ver alterações feitas no site ou PWA.

## Verificação

Verificados: sintaxe, permissões, encaminhamento de mensagens, aba fechada, retorno de login, ticket duplicado e bloqueio de rotas externas ou operações inválidas. O funcionamento completo com login real ainda precisa ser validado após instalar no Chrome.

Leia LEIA-ME.txt para resolução de problemas. Instalação manual; sem publicação na Chrome Web Store.

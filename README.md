# Connecta TI

## Configurar o Supabase

1. Crie um projeto no Supabase.
2. Em **Authentication → Users**, crie a única conta do jornal para `ds.clube00@gmail.com` e defina a senha diretamente no painel. Não coloque a senha em arquivos do projeto.
3. Em **Authentication → Settings**, desative novos cadastros públicos. O site só oferece entrada, não cadastro.
4. Execute `supabase.sql` no SQL Editor. O script cria as tabelas de edições e métricas, ativa RLS, configura o armazenamento de imagens e associa o usuário autorizado como administrador. Se já executou uma versão anterior, execute novamente o arquivo atualizado para criar o bucket e as permissões de imagens; o script pode ser reaplicado.
5. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores do projeto.
6. No serviço de hospedagem, configure as mesmas duas variáveis e publique o site.

A chave publicável pode ser usada no navegador porque o acesso aos dados é controlado pelas políticas RLS. Nunca use uma chave `secret` ou `service_role` no site. O Supabase Auth gerencia o hash da senha; ela não fica no SQL nem no JavaScript.

O administrador pode selecionar uma edição publicada para editar, ou criar uma nova. Cada notícia aceita uma URL de imagem ou um arquivo enviado pelo painel (JPEG, PNG, WebP ou GIF, até 5 MB), uma legenda opcional e um link externo opcional. As imagens ficam no bucket público `connecta-ti-images`; apenas o administrador autenticado pode enviar, alterar ou remover arquivos. Textos aceitam links e formatação em negrito/itálico. O jornal organiza várias notícias em cards responsivos. O ícone do ClubeDS é usado como favicon e ícone de tela inicial.

## Rodar localmente

Instale as dependências com `npm install` e inicie o projeto com `npm run dev`.

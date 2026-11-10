# Connecta TI

## Configurar o Supabase

1. Crie um projeto no Supabase.
2. Em **Authentication → Users**, crie a única conta do jornal para `ds.clube00@gmail.com` e defina a senha diretamente no painel. Não coloque a senha em arquivos do projeto.
3. Em **Authentication → Settings**, desative novos cadastros públicos. O site só oferece entrada, não cadastro.
4. Execute `supabase.sql` no SQL Editor. O script cria as tabelas de edições e métricas, ativa RLS e associa o usuário autorizado como administrador. Se a conta ainda não existia quando o script foi executado, rode novamente apenas o `INSERT` de associação no fim do arquivo.
5. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores do projeto.
6. No serviço de hospedagem, configure as mesmas duas variáveis e publique o site.

A chave publicável pode ser usada no navegador porque o acesso aos dados é controlado pelas políticas RLS. Nunca use uma chave `secret` ou `service_role` no site. O Supabase Auth gerencia o hash da senha; ela não fica no SQL nem no JavaScript.

O administrador pode publicar uma edição com uma notícia principal e quantas notícias secundárias, de tecnologia, eventos, datas e seções extras precisar. Os links externos das notícias são opcionais. Com várias notícias secundárias, o jornal as organiza em cards responsivos.

## Rodar localmente

Instale as dependências com `npm install` e inicie o projeto com `npm run dev`.

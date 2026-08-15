# Canto da Missa

Aplicativo de cifras voltado para ministérios de música litúrgica católica. Cruza tempo litúrgico, ciclo dominical e momento da missa para ajudar na escolha de música e organização de repertório.

Veja a especificação completa do projeto em [`SPEC.md`](./SPEC.md).

## Stack

- React + Vite + TypeScript + Tailwind CSS v4
- Supabase (PostgreSQL + Auth + Storage)
- PWA (service worker) e Android via Capacitor

## Desenvolvimento

```bash
npm install
cp .env.example .env   # preencher com as credenciais do seu projeto Supabase
npm run dev
```

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (`tsc -b && vite build`; o `tsc -b` cobre `src/`, `vite.config.ts` e `api/`)
- `npm run lint` — lint (oxlint)
- `npm test` — testes unitários (vitest)
- `npm run preview` — preview do build de produção

## Banco de dados

As migrations ficam em `supabase/migrations/`, numeradas e aplicadas em ordem.
Aplique todas no seu projeto Supabase antes de rodar a aplicação.

### Administradores

Quem pode cadastrar/editar música, cantor e moderar sugestões é decidido pela
tabela `admins`, consultada de dentro das policies de RLS. Depois de aplicar as
migrations, cadastre os e-mails pelo SQL Editor do dashboard (que usa a service
role e ignora RLS):

```sql
insert into public.admins (email) values ('voce@gmail.com');
```

Sem isso, ninguém consegue mais escrever no catálogo — inclusive você.
`VITE_ADMIN_EMAILS` continua existindo, mas só decide se o botão "Área Admin"
aparece; não é controle de acesso.

### Testes de RLS

As policies são a única barreira real do app (a anon key vai no bundle do
front). `supabase/test/` aplica as migrations num Postgres local e exercita as
policies como um cliente exercitaria, incluindo tentativas de abuso:

```bash
./supabase/test/rodar.sh
```

Ver [`supabase/test/README.md`](./supabase/test/README.md) para como subir o
Postgres local (ou usar Docker) e como escrever novos casos. O CI roda essa
suíte a cada push (`.github/workflows/ci.yml`).

## Android

```bash
npm run android:sync   # build + cap sync
npm run android:open   # abre no Android Studio
```

O login Google usa PKCE e volta pro app por deep link
(`app.cantodamissa.mobile://login-callback`) — o esquema precisa estar
registrado como Redirect URL no dashboard do Supabase.

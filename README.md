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
- `npm run smoke` — teste de fumaça num navegador (precisa do `npm run dev` rodando; ver `e2e/smoke.mjs`)
- `npm run preview` — preview do build de produção
- `npm run predeploy-check` — type check + build + testes + greps de sanidade (TODO/FIXME, auth nos endpoints de import de cifra, env vars esperadas) antes de subir pra `main` (`scripts/pre-deploy-check.sh`)

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

Sem isso, ninguém consegue mais escrever no catálogo — inclusive você. A
mesma tabela decide se o botão "Área Admin" aparece na interface, então não
há como as duas coisas discordarem (era o caso quando a lista vivia em
`VITE_ADMIN_EMAILS`, uma variável do cliente).

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

Ícones e splash screens são gerados a partir de `resources/` com o
`@capacitor/assets`, que não fica instalado no projeto (a versão publicada
arrasta um `@capacitor/cli` antigo com vulnerabilidades conhecidas, e a
ferramenta só roda de vez em quando):

```bash
npx @capacitor/assets generate --android
```

### Gerando um .aab assinado (release)

1. Gere a upload key uma única vez (o keytool pede senha e alguns dados -
   preencher e **guardar a senha**, ela não pode ser recuperada depois):

   ```bash
   cd android
   keytool -genkeypair -v -keystore upload-keystore.jks \
     -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Copie `android/keystore.properties.example` para
   `android/keystore.properties` e preencha `storePassword` e `keyPassword`
   com a senha escolhida acima. Esse arquivo (e a keystore) são gitignored -
   nunca commitar. Em CI, use as variáveis de ambiente `UPLOAD_STORE_FILE`,
   `UPLOAD_STORE_PASSWORD`, `UPLOAD_KEY_ALIAS` e `UPLOAD_KEY_PASSWORD` em vez
   do arquivo.

3. Build do web + sync do Capacitor, depois gera o bundle assinado:

   ```bash
   npm run build
   npx cap sync android
   cd android
   ./gradlew bundleRelease
   ```

   O `.aab` sai em `android/app/build/outputs/bundle/release/app-release.aab`.

O login Google usa PKCE e volta pro app por deep link
(`app.cantodamissa.mobile://login-callback`) — o esquema precisa estar
registrado como Redirect URL no dashboard do Supabase.

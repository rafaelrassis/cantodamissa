# Canto da Missa

Aplicativo de cifras voltado para ministérios de música litúrgica católica. Cruza tempo litúrgico, ciclo dominical e momento da missa para ajudar na escolha de música e organização de repertório.

Veja a especificação completa do projeto em [`SPEC.md`](./SPEC.md).

## Stack

- React + Vite + TypeScript + Tailwind CSS v4
- Supabase (PostgreSQL + Auth + Storage)
- Fase 2 (offline/Android): Dexie.js + Capacitor

## Desenvolvimento

```bash
npm install
cp .env.example .env   # preencher com as credenciais do seu projeto Supabase
npm run dev
```

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (`tsc -b && vite build`)
- `npm run lint` — lint (oxlint)
- `npm run preview` — preview do build de produção

## Banco de dados

O schema inicial está em `supabase/migrations/0001_init.sql`. Aplique as migrations no seu projeto Supabase antes de rodar a aplicação.

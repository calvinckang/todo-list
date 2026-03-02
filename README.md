## Todo List

Small Supabase‑backed todo app built with Vite and vanilla JavaScript. Todos are stored in a Postgres table via Supabase, with optional email/password accounts on top of anonymous sessions.

### Features

- **Add todos**: Quickly add new tasks.
- **Mark complete / incomplete**: Toggle completion on each todo.
- **Delete todos**: Remove tasks you no longer need.
- **Persisted in Supabase**: All todos are stored in a `todos` table.
- **Basic filters & search**: Filter by status and search within the current list.
- **Guest or signed‑in usage**: Starts with an anonymous session; users can optionally create an account or sign in.

### Tech

- **Build tool**: Vite
- **Language**: Vanilla JS (ES modules)
- **Backend**: Supabase (Postgres + auth)
- **Rendering**: Static HTML on load; JS enhances and syncs with Supabase

### Getting started

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Create a Supabase project**

   - Create a new project in Supabase.
   - In the SQL editor, create a `todos` table similar to:

     ```sql
     create table public.todos (
       id bigint generated always as identity primary key,
       text text not null,
       is_complete boolean not null default false,
       created_at timestamptz not null default now()
     );
     ```

3. **Configure environment variables**

   In the project root, create a `.env` file:

   ```bash
   touch .env
   ```

   Add your Supabase credentials (from the project settings → API):

   ```bash
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

4. **Run the dev server**

   ```bash
   pnpm dev
   ```

   Then open the URL printed by Vite (typically `http://localhost:5173`).

### Scripts

- **`pnpm dev`**: Start the Vite dev server.
- **`pnpm build`**: Build the app for production.
- **`pnpm preview`**: Preview the production build locally.
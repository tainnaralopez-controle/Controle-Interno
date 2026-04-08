# Technical Documentation

## Architecture
This is a React/TypeScript application using Vite, with a Supabase backend.
- **Frontend:** React, Tailwind CSS, Recharts for visualization.
- **Backend:** Supabase (PostgreSQL, Authentication, Realtime).
- **State Management:** React hooks (`useState`, `useEffect`, `useMemo`).
- **Refactoring:** Moving towards custom hooks for better separation of concerns.

## Environment Variables
Required variables (define in `.env`):
- `VITE_SUPABASE_URL`: Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key.

## Supabase Setup
1. Create a project in the Supabase Dashboard.
2. Enable Authentication (Google Login).
3. Create tables: `clients`, `suppliers`, `products`, `orders`, `transactions`, `ordens_servico`.
4. **Enable Row Level Security (RLS)** on all tables.
5. Create policies to allow authenticated users to access their own data (e.g., `user_id = auth.uid()`).

## API Endpoints
- The app uses the Supabase JavaScript Client SDK directly to interact with the database.
- No custom backend API endpoints are exposed; all database operations are handled via Supabase's secure client-side API.

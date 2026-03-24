# humor-project-prompt-chain

Admin-only Next.js app for managing Matrix humor flavors and their ordered prompt-chain steps.

## What is included

- Google OAuth sign-in through Supabase SSR with the callback fixed at `/auth/callback`
- Access gating based on `profiles.is_superadmin` or `profiles.is_matrix_admin`
- Humor flavor create, update, delete, and list views
- Humor flavor step create, update, delete, and reorder flows
- Live Matrix lookup tables for step types, input types, output types, and models
- A UI scaffold for the next phase: image test-set uploads and caption runs against `https://api.almostcrackd.ai`

## Setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Start the app with `npm run dev`

## Auth notes

- Google OAuth client ID reference:
  `388960353527-fh4grc6mla425lg0e3g1hh67omtrdihd.apps.googleusercontent.com`
- The app always redirects back to `/auth/callback`
- The signed-in user must have a `profiles` row where either `is_superadmin` or `is_matrix_admin` is true

## Humor flavor table assumptions

By default the app reads and writes:

- table: `humor_flavors`
- columns: `id`, `slug`, `description`, `created_datetime_utc`

If your schema uses different names, update the matching env vars in `.env.example`.

## Humor flavor step table assumptions

By default the app reads and writes:

- table: `humor_flavor_steps`
- columns: `id`, `humor_flavor_id`, `order_by`, `humor_flavor_step_type_id`
- prompt fields: `llm_system_prompt`, `llm_user_prompt`, `description`
- execution fields: `llm_model_id`, `llm_input_type_id`, `llm_output_type_id`, `llm_temperature`

## Next phase

The dashboard already leaves room for:

- image test-set uploads and caption generation with `humorFlavorId`
- caption run history, intermediate step outputs, and test-set comparisons

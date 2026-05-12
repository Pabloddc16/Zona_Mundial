# Supabase setup — Mundial 26 swaps

Sincroniza swaps en vivo entre dos celulares (sin necesidad de escanear el recibo manualmente).

## 1. Crea el proyecto

1. Entra a https://supabase.com → **New project**.
2. Copia la contraseña de la base que te asigna (no la usarás aquí, pero guárdala).
3. Espera ~1 min a que termine de provisionar.

## 2. Crea la tabla

1. En el proyecto: **SQL Editor → New query**.
2. Pega el contenido de `server/sql/001_swaps.sql` (en este repo).
3. Click **Run**. Debe terminar sin errores.

> El SQL ya activa Realtime y crea políticas RLS abiertas (cualquiera puede insertar/leer/marcar como aplicado). Es lo que el demo necesita; cuando agreguemos auth lo cerramos.

## 3. Copia las credenciales

1. **Settings → API**.
2. Copia:
   - **Project URL** (ej. `https://abcdxyz.supabase.co`)
   - **anon public** key (un JWT largo)

## 4. Pégalas en Netlify

1. Netlify dashboard → tu sitio → **Site settings → Environment variables → Add a variable**.
2. Crea estas dos (escópalas a "Production" + "Deploy previews"):

   | Key                       | Value                                    |
   | ------------------------- | ---------------------------------------- |
   | `VITE_SUPABASE_URL`       | `https://abcdxyz.supabase.co`            |
   | `VITE_SUPABASE_ANON_KEY`  | `eyJhbGciOi…` (el anon key)              |

3. **Deploys → Trigger deploy → Clear cache and deploy site**.

## 5. (Dev local) `.env.local`

```bash
VITE_SUPABASE_URL=https://abcdxyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi…
```

## Cómo funciona

- Bob abre la app → su QR codifica `M26:` + repetidas + faltantes.
- Alice escanea con la cámara → la app calcula la intersección y le muestra qué puede recibir/dar.
- Alice toca **Confirmar** → su álbum se actualiza al instante y la app envía un row a `public.swaps` con `offerer_user = bob`.
- La app de Bob (suscrita por Realtime a `swaps WHERE offerer_user = bob`) recibe el row, aplica el cambio inverso a su álbum (resta lo que Alice tomó, suma lo que Alice le dio) y marca el row como `applied_at = now()`.
- Si Bob estaba offline, al abrir la app la próxima vez se procesan los swaps pendientes.

## Si Supabase no está configurado

La app cae al modo offline: Alice ve un **QR de recibo** que Bob escanea para sincronizar manualmente. Todo sigue funcionando.

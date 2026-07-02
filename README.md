# Buscachichas

Buscaminas con tonalidades grises y glitch, presentado por Josechica. Ranking
de mejores tiempos por dificultad, guardado en Supabase (base de datos real,
sin necesidad de servidor propio).

## Estructura del proyecto

```
buscachichas/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── config.js         ← aquí van tus credenciales de Supabase
│   ├── supabaseClient.js
│   ├── leaderboard.js    ← lee/guarda el ranking
│   └── game.js           ← lógica del juego
├── assets/
│   ├── mina_encontrada.svg
│   └── mina_explotada.svg
├── supabase/
│   └── schema.sql        ← crea la tabla del ranking
└── README.md
```

## Paso 1 — Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta gratis.
2. Crea un proyecto nuevo (elige cualquier nombre y contraseña de base de
   datos, guarda la contraseña por si acaso).
3. Cuando el proyecto esté listo, ve a **SQL Editor → New query**, pega el
   contenido de `supabase/schema.sql` y dale **Run**. Esto crea la tabla
   `leaderboard` con las reglas de seguridad correctas.
4. Ve a **Project Settings → API**. Ahí vas a ver:
   - **Project URL**
   - **anon public key**

## Paso 2 — Conectar el proyecto

Abre `js/config.js` y reemplaza los valores:

```js
export const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
export const SUPABASE_ANON_KEY = 'tu-anon-key-aqui';
```

La anon key **no es secreta**: está diseñada para ir en el frontend. La
seguridad real la da la Row Level Security que ya quedó configurada en el
paso 1 (solo se puede leer todo, e insertar filas válidas; nadie puede
editar ni borrar tiempos ya guardados).

## Paso 3 — Probarlo en tu máquina

Este proyecto usa módulos de JavaScript (`type="module"`), así que **no
puedes abrir `index.html` directo con doble clic** (los navegadores bloquean
módulos si vienen de `file://`). Necesitas servirlo con un mini servidor
local. La forma más simple en VSCode:

1. Instala la extensión **Live Server** (Ritwick Dey).
2. Clic derecho sobre `index.html` → **Open with Live Server**.

O si prefieres terminal, con Node instalado:

```bash
npx serve .
```

## Paso 4 — Publicarlo en GitHub Pages

1. Sube la carpeta a un repositorio de GitHub.
2. En el repo: **Settings → Pages → Source**, elige la rama `main` y
   carpeta `/ (root)`.
3. Espera un par de minutos y tu juego queda público en
   `https://tu-usuario.github.io/tu-repo/`.

Como Supabase es la base de datos y GitHub Pages solo sirve archivos
estáticos, no necesitas mantener ningún servidor corriendo.

## Estado actual / pendientes

- [x] Estructura de proyecto separada (html/css/js/assets).
- [x] Leaderboard conectado a Supabase en vez de `window.storage`.
- [x] La bandera ahora usa `mina_encontrada.svg` en vez de `bandera.svg`.
- [x] Corregido: al perder, solo la mina que detonaste se muestra como
      `mina_explotada.svg`; el resto de minas no encontradas se muestran
      con `mina_encontrada.svg`.
- [ ] Cambiar las frases del juego (pendiente, siguiente paso).

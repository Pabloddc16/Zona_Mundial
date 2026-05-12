# Mundial 26 — App 1 (Usuario) · Design Spec

> Álbum de stickers del Mundial con compra, swaps QR y My Panini.
> Estilo: Apple minimalismo · Rappi estructura funcional · Figuritas UX de selección.
> App Only usuario final. No backend, no admin, no repartidor.

---

## 0. Principios de diseño (no negociables)

1. **Máximo 2 taps para cualquier acción importante.** Compra, marcar sticker, iniciar swap — todo en ≤2.
2. **Feedback inmediato.** Cada tap genera respuesta visual <100ms (scale 0.97, haptic simulado con subtle bounce, contador cambia in-place).
3. **Espacios blancos generosos.** Padding 16–20px exterior, 14px interior, radios 16–24px.
4. **Una acción primaria por pantalla.** El CTA fuerte es INK (#0B1F15) y destaca por contraste, no por color vibrante.
5. **Cero pantallas saturadas.** Si una sección necesita scroll horizontal para respirar, úsalo.
6. **Precio siempre visible en tienda.** Nunca esconder precio detrás de un tap.
7. **Persistencia local.** Cada cambio se guarda en localStorage inmediatamente. Si el usuario cierra y vuelve a abrir, todo está como lo dejó.
8. **Sin modales innecesarios.** Reserva modales sólo para: long-press editar, confirmación de swap, alerta de error de pago.

---

## 1. Sistema visual (tokens)

### 1.1 Paleta (regla maestra)

| Token | Hex | Rol |
|---|---|---|
| `brand.green` | `#006341` | Marca: hero, logo, "agregar al carrito", éxito, tab activo |
| `brand.ink` | `#0B1F15` | Texto + **CTAs fuertes** (PAGAR, CONFIRMAR, ESCANEAR) |
| `brand.gold` | `#FFD100` | Celebración: "¡GOL!", % completo, arcos Panini, trofeos |
| `brand.red` | `#CE1126` | Urgencia: "te faltan X", badges LIMITED, cash, errores |
| `brand.cream` | `#FAF6EE` | Fondo global |
| `brand.paper` | `#FFFFFF` | Cards, inputs, superficies elevadas |

**Regla:** Verde = marca · Ink = acción · Oro = celebración · Rojo = urgencia.

### 1.2 Tipografía

- **Display:** Archivo Black (fallback SF Pro Display 900). Para números grandes, titulares, precios grandes.
- **Body:** DM Sans (fallback SF Pro Text). Pesos: 400, 500, 700.
- **Código / código de sticker:** SF Mono / Menlo — monospace para códigos como "BRA14", "MEX-7".

Tamaños base:
- Display XXL 34, XL 28, L 22, M 18, S 15
- Body L 15, M 13, S 11
- Label 10 (uppercase, tracking 1.4px)

### 1.3 Espaciado y radios

- Espaciado: 4, 8, 12, 16, 20, 28, 40
- Radios: sm 8, md 12, lg 16, xl 20, xxl 28, full 9999
- Container máximo: 460px (mobile-first)
- Grid sticker: 4 columnas, gap 8px

### 1.4 Sombras y elevación

- Cards: `border: 1px solid rgba(0,0,0,0.05)` (sin shadow, peso visual por border sutil)
- Hero: sin border, color sólido o gradient
- Modal: `shadow: 0 20px 60px rgba(0,0,0,0.25)`, backdrop `rgba(0,0,0,0.45)`
- FAB: `shadow: 0 8px 24px rgba(0,99,65,0.35)` (verde con halo verde)

### 1.5 Animaciones

- Tap scale: `transform: scale(.97)` en 100ms
- Fade-in pantalla: opacity + translateY(4px) → 0 en 250ms
- Counter bump: cuando incrementas sticker, el número hace `scale(1.2)` y vuelve en 150ms
- Progress bar: `width` transition 300ms
- Modal: backdrop fade 200ms + modal slide-up 250ms

---

## 2. Arquitectura de navegación

### 2.1 Bottom Tab Bar (fijo)

5 tabs, iconos SF Symbols style, label corto debajo, altura total 60px.

| # | Tab | Icono | Label |
|---|---|---|---|
| 1 | Home | `house` | Inicio |
| 2 | Álbum | `square.grid.3x3` | Álbum |
| 3 | Stats | `chart.bar` | Stats |
| 4 | Tienda | `bag` | Tienda |
| 5 | QR | `qrcode.viewfinder` | QR |

Tab activo: fondo pill verde (`brand.green`) con icono blanco, label verde.
Tab inactivo: icono gris 60% opacidad, label gris.

### 2.2 Jerarquía de navegación

- Cada tab es un stack independiente.
- Cambiar de tab **no** pierde el estado del stack anterior (si estabas en Tienda → Producto → Checkout, al volver a Tienda sigue ahí).
- Back button arriba izquierda para subpantallas.
- Carrito: icono persistente arriba a la derecha en **todas** las tabs excepto QR (donde ocupa el centro).

### 2.3 Subpantallas (fuera de tabs)

- `/album/:groupId` — detalle de una sección del álbum
- `/producto/:id` — detalle de producto
- `/carrito` — carrito completo
- `/checkout` — checkout con pickup/envío
- `/orden/:orderNumber` — confirmación ¡GOL!
- `/swap` — flujo de intercambio
- `/scan` — cámara de escaneo QR
- `/my-panini/crear` — crear carta personal

---

## 3. Pantallas (especificación detallada)

---

### 3.1 HOME — Dashboard de acción

**Objetivo primario:** Convertir al usuario en comprador. No es el álbum.

**Stacking vertical:**

#### 3.1.1 Header (sticky top)

```
┌─────────────────────────────────────┐
│ 🟢 MUNDIAL26              🛒 (2)   │
└─────────────────────────────────────┘
```
- Izquierda: logo (punto verde "26" + wordmark "MUNDIAL26" con "26" en rojo)
- Derecha: icono carrito con badge rojo si count > 0

#### 3.1.2 Saludo + progreso hero

```
┌─────────────────────────────────────┐
│ MUNDIAL 26 · CDMX                   │ ← label uppercase
│ Hola, Pablo 👋                       │ ← display 24
│                                     │
│  ╭─────────────────────────────╮   │
│  │ PROGRESO                    │   │
│  │                             │   │
│  │ 65%              248 / 382  │   │ ← display 44 gold + pequeño
│  │ ▓▓▓▓▓▓▓▓▓▓░░░░░░░          │   │ ← bar gold
│  ╰─────────────────────────────╯   │
└─────────────────────────────────────┘
```
- Fondo: gradient `brand.green → brand.ink` con rings decorativos (arcos concéntricos Panini motif, opacity 0.2).
- `65%` en gold (`brand.gold`), tamaño display XXL.
- Bar en gold con track `rgba(255,255,255,0.15)`.

#### 3.1.3 CTA principal — "Te faltan X stickers"

```
┌─────────────────────────────────────┐
│  TE FALTAN 134 STICKERS             │
│  $670 para completar tu álbum       │
│                                     │
│     [ Completa tu álbum  → ]        │ ← botón ink full-width
└─────────────────────────────────────┘
```
- Fondo `brand.paper` (blanco), border sutil.
- Título en display L (22).
- Subtítulo body M (13), color ink 70%.
- Botón `brand.ink`, texto blanco, altura 48, radio full, icono → a la derecha.
- Action: lleva a Tienda → sección "Completa tu álbum" con carrito pre-llenado.

#### 3.1.4 Recomendación — "Stickers que te faltan"

```
┌─────────────────────────────────────┐
│ STICKERS QUE TE FALTAN      Ver más │
│                                     │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌───── │ ← scroll horizontal
│ │BRA │ │ARG │ │MEX │ │ESP │ │FRA   │
│ │ 14 │ │ 7  │ │ 3  │ │ 11 │ │ 5    │
│ │ $5 │ │ $5 │ │$10 │ │$20 │ │ $5   │ ← precio según tier
│ │ +  │ │ +  │ │ +  │ │ +  │ │ +    │
│ └────┘ └────┘ └────┘ └────┘ └───── │
└─────────────────────────────────────┘
```
- Horizontal scroll snap. 5–10 cards.
- Card 84×120: fondo `brand.paper`, código en mono centrado, precio abajo, botón "+" verde (agrega al carrito en 1 tap).
- Tap en la card → detalle del sticker. Tap en "+" → cartAdd() + toast "+1 BRA14".
- "Ver más" → Álbum tab con filtro "Need" activo.

**Pricing tiers visibles aquí:**
- Comunes: $5
- Medias: $10–$20
- Difíciles (logos, leyendas, estrellas): $20–$50

El precio se calcula por `tier` del sticker (definido en data, no por UI).

#### 3.1.5 Acciones rápidas — grid 2×2

```
┌─────────────────────────────────────┐
│ ┌──────────┐  ┌──────────┐         │
│ │ 📷 SCAN  │  │ 🔁 REPET │         │
│ │   QR     │  │  (34)    │         │
│ │ Swap con │  │ Tus +2   │         │
│ │ amigos   │  │ e ‹ver›  │         │
│ └──────────┘  └──────────┘         │
│ ┌──────────┐  ┌──────────┐         │
│ │ 🛍 TIEN  │  │ 👤 MY    │         │
│ │   DA     │  │  PANINI  │         │
│ │ Jerseys, │  │ Crea tu  │         │
│ │ cartas...│  │ carta    │         │
│ └──────────┘  └──────────┘         │
└─────────────────────────────────────┘
```
- Cada tile 160×120 aprox, radio lg.
- Colores: Scan=ink, Repetidas=gold, Tienda=red, My Panini=green.
- Action Scan → abre cámara (permiso), si deniega → pantalla QR tab con instrucciones.
- Action Repetidas → Álbum tab con subtab "Swaps" (repetidas).
- Action Tienda → Tienda tab.
- Action My Panini → Tienda → sección "My Panini".

#### 3.1.6 Promo banner (condicional)

- Solo si hay promo activa. Sin promo → no se muestra (no space-filler).
- Altura 72, fondo gold, ícono y texto.
- Ejemplo: "🎉 Martes de 2×1 en sobres · hasta 23:59"
- Tap → lleva a producto en promo.

#### 3.1.7 Estados especiales

- **Álbum 100%:** bloque CTA se transforma en celebración: "🏆 COMPLETASTE tu álbum. ¡Compártelo!" + botón compartir.
- **Álbum 0% (onboarding):** CTA "Escanea tu primer sticker" en lugar de "te faltan X". Grid de recomendados muestra los 6 más vendidos.
- **Sin conexión:** banner sticky top "Sin conexión — tus cambios se guardan localmente".

---

### 3.2 ÁLBUM — Core del producto

**Objetivo:** Input ultra rápido. Usuario abre sobre, quiere marcar 7 stickers en <20 segundos.

#### 3.2.1 Header

```
┌─────────────────────────────────────┐
│ ‹  Álbum del Mundial        🛒 (2) │
└─────────────────────────────────────┘
```

#### 3.2.2 Subtabs (pill segmented control)

```
┌─────────────────────────────────────┐
│  ┌──────┬──────┬──────┐             │
│  │ HAVE │ NEED │ SWAP │             │
│  │ 248  │ 134  │  34  │             │ ← contador en cada uno
│  └──────┴──────┴──────┘             │
└─────────────────────────────────────┘
```
- Pill segmented control, fondo `brand.paper` con border.
- Activo: fondo `brand.ink`, texto blanco.
- Contador en cada tab en tiempo real.

#### 3.2.3 Filtro por sección (chips horizontales)

```
┌─────────────────────────────────────┐
│  [Todos] [MEX] [ARG] [BRA] [ESP] … │ ← scroll horizontal
└─────────────────────────────────────┘
```
- 32 equipos + 6 secciones especiales.
- "Todos" activo por default.
- Chip activo: fondo `brand.ink` blanco. Inactivo: fondo `brand.paper` borde.

#### 3.2.4 Grid de stickers (Have / Need / Swap)

**Have subtab** — grid todos los que tiene (count > 0).
**Need subtab** — grid de los que están en 0 (no tiene).
**Swap subtab** — grid de los que tiene repetidos (count > 1).

```
┌─────────────────────────────────────┐
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │ ← 4 columnas
│ │MEX │ │MEX │ │MEX │ │MEX │        │
│ │ 01 │ │ 02 │ │ 03 │ │ 04 │        │
│ │ 👤 │ │ 👥 │ │ 🛡 │ │ 👤 │        │ ← emoji genérico
│ │  2 │ │  1 │ │  1 │ │    │        │ ← contador si > 0
│ └────┘ └────┘ └────┘ └────┘        │
│                                     │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │ARG │ │ARG │ │ARG │ │ARG │        │
│ ...                                 │
└─────────────────────────────────────┘
```

**Estados visuales del sticker:**

| Estado | Fondo | Borde | Texto | Badge |
|---|---|---|---|---|
| 0 (vacío) | `brand.paper` | dashed rgba(0,0,0,0.15) | ink 50% | — |
| 1 (tiene) | gradient green→ink | solid green | blanco | ✓ gold esquina TR |
| 2+ (repet) | gradient ink más saturado | solid gold | blanco | `×2` / `×3` badge rojo esquina BR |

**Label en sticker:**
- Código prominente en mono: `MEX 01` (tamaño 11, tracking 1px, uppercase)
- Emoji genérico según tipo: 🛡 logo, 👥 equipo, 👤 jugador, 🌟 especial
- Contador abajo del emoji si > 0

#### 3.2.5 Interacciones del sticker (CRÍTICO)

| Gesto | Acción |
|---|---|
| **Tap** | Incrementa contador: 0 → 1 → 2 → 3 → … (sin límite). Bump animation. Haptic simulado. |
| **Long press (500ms)** | Abre modal `StickerEditModal`. |
| **Swipe left en fila (opcional, fase 2)** | — |

#### 3.2.6 Modal `StickerEditModal` (long press)

Se abre desde abajo (bottom sheet, no alert box).

```
┌─────────────────────────────────────┐
│ ───                                 │ ← drag handle
│                                     │
│ MEX 07 · Hirving Lozano             │
│                                     │
│ Cantidad actual: [ 2 ]              │
│                                     │
│   [ − ]  2  [ + ]                   │ ← stepper grande
│                                     │
│ ┌─────────────────────────────┐     │
│ │  Poner en 0 (lo perdí)      │     │ ← btn ghost
│ └─────────────────────────────┘     │
│                                     │
│ ┌─────────────────────────────┐     │
│ │  Marcar como para swap      │     │ ← btn gold (solo si count > 1)
│ └─────────────────────────────┘     │
│                                     │
│ Cerrar                              │
└─────────────────────────────────────┘
```
- Altura aprox 60% viewport.
- Stepper gigante (botones 56×56, número display 32).
- Botón "Poner en 0": gris, confirmación inline "¿Seguro?" in-place sin second modal.
- Botón "Marcar para swap": gold, sólo visible si count > 1. Marca flag `forSwap: true` en el sticker.
- Cerrar: tap fuera, swipe down, o texto inferior.

#### 3.2.7 FAB "Agregar por código" (CRÍTICO)

Floating Action Button, inferior derecha, tamaño 56×56, `brand.green` con icono `+`.

```
         ┌───────┐
         │   +   │ ← FAB verde
         └───────┘
```

- Visible en Álbum siempre.
- Tap → abre modal `QuickAddModal`.

#### 3.2.8 Modal `QuickAddModal`

Bottom sheet con input optimizado.

```
┌─────────────────────────────────────┐
│ ───                                 │
│                                     │
│ Agregar por código                  │
│                                     │
│ ┌─────────────────────────────┐     │
│ │ ARG10                       │     │ ← input mono grande, autocaps
│ └─────────────────────────────┘     │
│ Ejemplo: ARG10, MEX07, BRA14        │
│                                     │
│ Últimos: [ARG10] [MEX07] [BRA14]    │ ← chips history
│                                     │
│ ┌─────────────────────────────┐     │
│ │  Agregar +1                 │     │ ← btn ink full
│ └─────────────────────────────┘     │
└─────────────────────────────────────┘
```
- Input autofocus, keyboard type `visible-password` (para fuente mono + no autocomplete), `autocapitalize="characters"`.
- Validación inline:
  - Formato esperado: 3 letras código país + 1–3 dígitos número (ej. MEX07, ARG10, BRA14). Para secciones especiales: LEY01, EST16.
  - Regex: `/^[A-Z]{3}-?\d{1,3}$/i`
  - Si no matchea: borde rojo + texto "Código no válido".
- Botón "Agregar +1" incrementa y NO cierra el modal (permite capturar en ráfaga varios códigos).
- Después de cada add exitoso: toast "+1 MEX07 · total 3", input se limpia, focus se mantiene.
- "Últimos" chips: los últimos 3 códigos agregados en la sesión.
- Cierra con swipe down o botón X arriba derecha.

#### 3.2.9 Empty states

- **Have vacío:** "Aún no tienes ningún sticker. Empieza abriendo un sobre o usa Agregar por código."
- **Need vacío:** "🏆 ¡Ya no te faltan stickers en este filtro! Cambia de sección arriba."
- **Swap vacío:** "Todavía no tienes repetidos. Cuando tengas, aparecen aquí para intercambiar."

---

### 3.3 STATS

Pantalla limpia, dashboard personal.

```
┌─────────────────────────────────────┐
│ ‹  Stats                     🛒    │
├─────────────────────────────────────┤
│                                     │
│         65%                         │
│         ▓▓▓▓▓▓▓▓▓▓░░░              │
│         248 de 382                  │
│                                     │
│ ┌──────────┐  ┌──────────┐         │
│ │ TIENES   │  │ FALTAN   │         │
│ │   248    │  │   134    │         │
│ └──────────┘  └──────────┘         │
│ ┌──────────┐  ┌──────────┐         │
│ │ REPETID  │  │ COMPRADO │         │
│ │   34     │  │  $2,490  │         │
│ └──────────┘  └──────────┘         │
│                                     │
│ PROGRESO POR SECCIÓN                │
│ México       ▓▓▓▓▓▓▓▓░░ 14/18      │
│ Argentina    ▓▓▓▓▓▓▓▓▓▓ 18/18  ✓   │
│ Brasil       ▓▓▓▓▓░░░░░  9/18      │
│ ...                                 │
│                                     │
└─────────────────────────────────────┘
```

**Contenido:**
- % grande gold (display 48)
- Barra progreso
- 4 KPIs en grid 2x2:
  - Tienes (verde)
  - Faltan (rojo)
  - Repetidas (gold)
  - Comprado MXN (ink) — total de órdenes pagadas
- Lista progreso por sección (38 grupos): cada uno con barra mini + conteo. Completos tienen ✓ verde.
- Compartir logro (al final): botón ghost "Compartir mi progreso" → genera imagen y abre share sheet.

**Sin gráficos complejos.** Nada de donuts, pies, etc. Sólo barras lineales. Apple-minimalist.

---

### 3.4 TIENDA — UX tipo Rappi

Scroll vertical con secciones claras. Header búsqueda sticky opcional.

#### 3.4.1 Header

```
┌─────────────────────────────────────┐
│ ‹  Tienda                   🛒 (2) │
├─────────────────────────────────────┤
│ 🔍  Buscar jerseys, sobres...       │ ← search sticky
└─────────────────────────────────────┘
```

#### 3.4.2 Sección 1 — "Completa tu álbum" (DESTACADA)

```
┌─────────────────────────────────────┐
│  COMPLETA TU ÁLBUM                  │ ← título display L
│  ┌───────────────────────────────┐  │
│  │  Te faltan 134 stickers       │  │
│  │  Total estimado: $670         │  │
│  │  · 120 comunes × $5           │  │
│  │  · 12 medias × $15            │  │
│  │  · 2 difíciles × $50          │  │
│  │                               │  │
│  │  [ Comprar todos los faltant]│  │ ← btn ink full
│  │  [ Elegir cuáles quiero     ]│  │ ← btn ghost
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

- Card `brand.paper`, border sutil. Padding 20.
- Desglose por tier (comunes, medias, difíciles) para transparencia.
- "Comprar todos": agrega al carrito todos los missing a su precio por tier, lleva a carrito.
- "Elegir cuáles quiero": lleva a pantalla `/tienda/seleccion` con grid de todos los faltantes, cada uno seleccionable con checkbox + ajustar cantidad.

#### 3.4.3 Sección 2 — "My Panini" (crea tu carta)

```
┌─────────────────────────────────────┐
│  MY PANINI                          │
│  Crea tu propia carta oficial       │
│  ┌───────────────────────────────┐  │
│  │        ╭───────────╮          │  │
│  │        │  📸       │          │  │ ← preview carta estilo Panini
│  │        │   +       │          │  │
│  │        │  Sube foto│          │  │
│  │        ╰───────────╯          │  │
│  │                               │  │
│  │  1. Subir foto                │  │
│  │     [ Cámara ] [ Galería ]    │  │
│  │  2. País                      │  │
│  │     [ 🇲🇽 ▾ ]                  │  │ ← select
│  │  3. Tipo de carta             │  │
│  │     [Jugador ▾]               │  │
│  │     Opciones: Jugador, Legen- │  │
│  │     da, Coach, Mascota        │  │
│  │                               │  │
│  │  Preview actualiza en vivo    │  │
│  │                               │  │
│  │  Precio fijo: $200            │  │
│  │                               │  │
│  │  [ Comprar mi carta           ]│  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Flujo My Panini:**
1. Usuario tap "Subir foto" → native picker (cámara o galería). Permiso de cámara si aplica.
2. Foto se recorta automáticamente a aspect ratio 3:4 estilo carta Panini. Crop editable con gestos pinch+drag.
3. Usuario selecciona país (dropdown con 32 banderas + emoji).
4. Usuario selecciona tipo: Jugador (default), Leyenda (gold frame), Coach (silver frame), Mascota (gradient frame).
5. Preview se actualiza en vivo: frame estilo Panini oficial con el colour scheme del país + foto + texto "MY PANINI · [Nombre del usuario]".
6. Precio $200 siempre visible.
7. Botón "Comprar mi carta" → lleva al carrito con la carta agregada.
8. Post-compra: backoffice manual imprime físicamente y entrega con el siguiente pedido.

**Estados:**
- Sin foto: botón foto deshabilitado hasta tener imagen.
- Foto cargando: spinner sobre preview.
- Foto inválida (muy pequeña <300px): error "La foto debe ser de al menos 300×400px".

#### 3.4.4 Sección 3 — Catálogo (grid productos)

```
┌─────────────────────────────────────┐
│  CATÁLOGO                           │
│  [Todos][Packs][Sobres][Jerseys]…   │ ← chips
│                                     │
│  ┌────────┐  ┌────────┐            │
│  │ 🏆     │  │ 📦     │            │
│  │COLEC-  │  │CAJA    │            │
│  │CIÓN    │  │100     │            │
│  │$3,500  │  │$2,500  │            │
│  │  + agr │  │  + agr │            │
│  └────────┘  └────────┘            │
│  ...                                │
└─────────────────────────────────────┘
```

- 22 productos canónicos (9 SKUs + jerseys + balones + trofeos + accesorios).
- Tarjeta product card:
  - Imagen (aspect 1:1) con gradient del producto + emoji 56px + badge opcional.
  - Nombre display S (13, 2 líneas max).
  - Precio display M (15) en `brand.green`.
  - Botón "+" círculo verde bottom-right → agrega 1 al carrito.
  - Tap en la card (no en +) → detalle del producto.

#### 3.4.5 Detalle de producto

(Ya implementado en versión anterior, se respeta la estructura.)

- Hero image 4:3 con gradient + emoji 140px + badge.
- Body: categoría label, nombre display XL, precio display XXL green, descripción body M.
- Info rows: 🚚 Entrega, 🛡 Oficial, ↻ Cambios.
- Footer sticky:
  - Si qty=0: botón verde "Agregar al carrito".
  - Si qty>0: stepper −/+/num + botón ink "Ver carrito".

---

### 3.5 CARRITO

Acceso desde icono carrito arriba a la derecha.

```
┌─────────────────────────────────────┐
│ ‹  Carrito                          │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────┐     │
│ │ 📦  Caja 100 sobres         │     │
│ │     $2,500    [-] 1 [+]  ✕  │     │
│ └─────────────────────────────┘     │
│ ┌─────────────────────────────┐     │
│ │ 🃏  Carta suelta × 12       │     │
│ │     $60       [-]12 [+]  ✕  │     │
│ └─────────────────────────────┘     │
│                                     │
│ ENTREGA                             │
│ ┌─────────────────────────────┐     │
│ │ ○  PICKUP                    │     │
│ │    Recoge en CDMX — Av Ref.  │     │
│ │    Gratis                    │     │
│ ├─────────────────────────────┤     │
│ │ ●  ENVÍO GDL (< 1 hora)      │     │
│ │    Misma ciudad — $50        │     │
│ ├─────────────────────────────┤     │
│ │ ○  ENVÍO NACIONAL (1-2 días) │     │
│ │    Resto del país — $150     │     │
│ └─────────────────────────────┘     │
│                                     │
│ RESUMEN                             │
│ Subtotal              $2,560        │
│ Envío                 $50           │
│ ─────────────────────────────       │
│ Total                 $2,610        │
│                                     │
│ [ Continuar al pago    →    ]       │ ← ink
└─────────────────────────────────────┘
```

**Detalles:**
- Items editables inline: −/+ con stepper pequeño, ✕ para eliminar.
- Envío por default: **Pickup** (cero fricción).
- Opciones:
  - **Pickup** (gratis) — recoger en dirección fija CDMX. Sólo esta opción si usuario está en CDMX.
  - **Envío GDL** ($50) — menos de 1 hora, sólo Guadalajara. Detección por CP si hay geo, si no por input.
  - **Envío Nacional** ($150) — 1–2 días, cualquier parte de México. Requiere dirección completa + CP.
- Al seleccionar "Envío Nacional" se expande campo de dirección completa (calle, número, colonia, CP, ciudad, estado, referencias).
- Resumen dinámico según selección.
- Botón "Continuar al pago" lleva a checkout.

**Empty state:** misma estructura que la versión previa.

---

### 3.6 CHECKOUT

```
┌─────────────────────────────────────┐
│ ‹  Checkout                         │
├─────────────────────────────────────┤
│                                     │
│ CONTACTO                            │
│ ┌─────────────────────────────┐     │
│ │ Nombre                      │     │
│ │ [ Pablo                   ] │     │
│ │ Teléfono                    │     │
│ │ [ +52 55 1234 5678        ] │     │
│ └─────────────────────────────┘     │
│                                     │
│ PAGO                                │
│ ┌─────────────────────────────┐     │
│ │  [ 💳 TARJETA ] [ 💵 CASH ]  │     │
│ │                             │     │
│ │ (solo si tarjeta)           │     │
│ │  Número                     │     │
│ │  [ 4242 4242 4242 4242    ] │     │
│ │  Expira      CVC            │     │
│ │  [ 12/28 ]   [ 123 ]        │     │
│ │  🔒 Stripe (demo)           │     │
│ └─────────────────────────────┘     │
│                                     │
│ ENTREGA (no editable aquí)          │
│   Envío GDL · $50                   │
│                                     │
│ TOTAL              $2,610           │
│                                     │
│ [ Pagar $2,610         →   ]        │ ← ink
└─────────────────────────────────────┘
```

- Cash sólo disponible si entrega es Pickup o Envío GDL. Nacional no acepta cash.
- Tarjeta: integrar Stripe Elements React Native (`@stripe/stripe-react-native`) en versión nativa. En web demo: validación básica + call fake.
- Al pagar: loader 1.5s → reset al screen `/orden/:orderNumber`.

---

### 3.7 ORDEN CONFIRMADA — "¡GOL!"

```
┌─────────────────────────────────────┐
│ ‹  Pedido confirmado                │
├─────────────────────────────────────┤
│                                     │
│         ╭─────╮                     │
│         │  ✓  │                     │ ← círculo verde 80×80
│         ╰─────╯                     │
│                                     │
│         ¡GOL!                       │ ← display 34 gold
│         Gracias por tu pedido       │
│                                     │
│  Te enviamos confirmación por WA    │
│                                     │
│  ┌──────────────────────────┐       │
│  │ NÚMERO DE PEDIDO         │       │
│  │ ORD-2851                 │       │
│  │ ────                     │       │
│  │ TOTAL                    │       │
│  │ $2,610                   │       │
│  │ ────                     │       │
│  │ ETA ESTIMADO             │       │
│  │ 45 min                   │       │
│  └──────────────────────────┘       │
│                                     │
│  [ Mis pedidos ] [ Al inicio ]      │
└─────────────────────────────────────┘
```

- Animación al entrar: check escala de 0 a 1 con bounce, luego fade del "¡GOL!", luego fade del card.
- ETA dinámico según tipo de envío (Pickup: "recoge cuando quieras", GDL: "45 min", Nacional: "1–2 días").
- Dos CTAs al final: ghost "Mis pedidos" y brand "Al inicio".

---

### 3.8 QR TAB

Pantalla split simple.

```
┌─────────────────────────────────────┐
│       MUNDIAL26         🛒         │
├─────────────────────────────────────┤
│                                     │
│          TU QR                      │
│   ╔═════════════════╗               │
│   ║  ▓ ▓ ▓  ▓  ▓▓  ║               │
│   ║  ▓  ▓▓▓ ▓▓  ▓  ║               │ ← QR 240×240
│   ║  ▓▓▓ ▓  ▓ ▓▓▓  ║               │
│   ║  ▓ ▓  ▓▓  ▓ ▓  ║               │
│   ╚═════════════════╝               │
│   @pablo26 · Mundial 26             │
│                                     │
│   [ Compartir ]  [ Descargar ]      │
│                                     │
│ ─── o ───                           │
│                                     │
│   [ 📷  Escanear QR         →  ]    │ ← ink full-width
│                                     │
│ ─────────────────────────────────── │
│ ACTIVIDAD RECIENTE                  │
│ · Carlos M. hizo swap contigo       │
│ · Ana R. escaneó tu QR (nuevo ref)  │
│ · Luis T. hizo swap contigo         │
└─────────────────────────────────────┘
```

**QR funcional:**
- Encodea URL: `https://mundial26.mx/u/:userId`
- Se genera localmente (librería `qrcode-svg` en web, `react-native-qrcode-svg` en nativo).
- Compartir: abre share sheet (WhatsApp, AirDrop, etc).
- Descargar: guarda PNG en Fotos.

**Escanear QR:**
- Abre cámara fullscreen con overlay "Apunta al QR de tu amigo".
- Al detectar QR válido de Mundial 26: transición suave a `/swap` con el otherUserId.
- QR no válido (no es de la app): toast "Este QR no es de Mundial 26" + cierra scanner.
- Permiso denegado: fallback a input manual "Ingresa usuario" con @.

**Actividad reciente:**
- Feed last 5 eventos: swaps realizados, referidos registrados, QR escaneado de otro.

---

### 3.9 SWAP — Flujo de intercambio

Inspiración: Figuritas (selección tipo grid + confirmación 2-col).

#### 3.9.1 Pantalla inicial — post-scan

```
┌─────────────────────────────────────┐
│ ✕  Swap con @carlos_m               │
├─────────────────────────────────────┤
│                                     │
│  Carlos tiene 8 stickers que NECESI-│
│  TAS. Tú tienes 5 que él NECESITA.  │
│                                     │
│ ─────────────────────────────────── │
│ RECIBES                      (0/8)  │ ← contador dinámico
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │BRA │ │ARG │ │MEX │ │ESP │        │ ← seleccionables
│ │ 14 │ │ 07 │ │ 03 │ │ 11 │        │
│ └────┘ └────┘ └────┘ └────┘        │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │FRA │ │GER │ │ITA │ │POR │        │
│ │ 05 │ │ 09 │ │ 02 │ │ 12 │        │
│ └────┘ └────┘ └────┘ └────┘        │
│                                     │
│ ─────────────────────────────────── │
│ DAS                          (0/5)  │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │JPN │ │KOR │ │SEN │ │MAR │        │
│ │ 11 │ │ 14 │ │ 03 │ │ 05 │        │
│ └────┘ └────┘ └────┘ └────┘        │
│ ┌────┐                             │
│ │NED │                             │
│ │ 08 │                             │
│ └────┘                             │
└─────────────────────────────────────┘
│ [ Confirmar trade (0 × 0)       ]   │ ← ink disabled
```

**Reglas:**
- Grid 4 columnas.
- Sticker no seleccionado: border dashed rgba(0,0,0,.15), fondo paper.
- Sticker seleccionado: border solid green, fondo light-green.
- Contador "(X/Y)" actualiza en tiempo real.
- Botón "Confirmar trade (X × Y)":
  - Disabled si X=0 o Y=0.
  - Texto dinámico: "Confirmar trade (3 × 2)" → recibes 3, das 2.
  - Fondo ink cuando habilitado.

#### 3.9.2 Modal de confirmación

```
┌─────────────────────────────────────┐
│ ───                                 │
│                                     │
│ Estás a punto de intercambiar       │
│                                     │
│ RECIBES                             │
│ [BRA14] [ARG07] [MEX03]             │ ← chips
│                                     │
│ DAS                                 │
│ [JPN11] [KOR14]                     │
│                                     │
│ ⚠️ El intercambio es manual: tú y   │
│ Carlos deben actualizar sus stickers│
│ después de cambiarlos físicamente.  │
│                                     │
│ [ Cancelar ]   [ Confirmar ]        │
└─────────────────────────────────────┘
```

- Lista clara de chips de lo que recibe y lo que da.
- Warning explícito: sistema NO actualiza automáticamente — ambos usuarios deben confirmar manualmente.
- Confirmar: actualiza localmente (resta de los que das, suma a los que recibes), envía notificación al otro usuario (backend), redirige a `/swap/success`.

#### 3.9.3 Swap success

```
┌─────────────────────────────────────┐
│         🤝                          │
│         ¡Swap realizado!            │
│                                     │
│  Actualizamos tu álbum automática-  │
│  mente. Carlos debe hacer lo mismo  │
│  desde su app.                      │
│                                     │
│  [ Ver mi álbum ]                   │
└─────────────────────────────────────┘
```

#### 3.9.4 Edge cases

- **Sin overlap:** "No tienen stickers en común para intercambiar. Prueba con otro amigo."
- **Otro usuario canceló:** push notification al canceler y al otro "El swap con @carlos_m se canceló".
- **Autoscan propio QR:** "Ese eres tú 😅"

---

### 3.10 My Panini (detalle pantalla crear)

```
┌─────────────────────────────────────┐
│ ‹  Crea tu carta                    │
├─────────────────────────────────────┤
│                                     │
│      ╭─────────────────╮            │
│      │                 │            │
│      │  Preview vivo   │            │ ← estilo Panini frame
│      │  (foto + texto) │            │
│      │                 │            │
│      ╰─────────────────╯            │
│      Precio: $200                   │
│                                     │
│  1. FOTO                            │
│     [ 📷 Cámara ] [ 🖼 Galería ]    │
│                                     │
│  2. PAÍS                            │
│     [🇲🇽 México        ▾]            │
│                                     │
│  3. TIPO                            │
│     [ Jugador ▾ ]                   │
│     · Jugador                       │
│     · Leyenda (gold frame)          │
│     · Coach                         │
│     · Mascota                       │
│                                     │
│  4. NOMBRE EN LA CARTA              │
│     [ Pablo González              ] │ ← input texto max 24 chars
│                                     │
│  5. DORSAL (opcional)               │
│     [ 10 ]                          │
│                                     │
│                                     │
│ [ Agregar al carrito · $200 →    ]  │
└─────────────────────────────────────┘
```

Preview vivo en la parte superior actualiza cada vez que cambia foto, país, tipo, nombre o dorsal. Se usa SVG + foto embedded para el preview.

---

## 4. Componentes UI reutilizables

Biblioteca interna. Cada uno con props y estados definidos.

### 4.1 `TopBar`
- Props: `title?`, `showBack`, `rightSlot?`, `showCart = true`
- Altura 54, sticky top.

### 4.2 `BottomTabBar`
- Props: `active`
- 5 tabs, altura 60, sticky bottom.

### 4.3 `PrimaryButton`
- Variants: `primary` (ink), `brand` (green), `urgent` (red), `ghost` (white border), `gold`
- Sizes: `sm` (36), `md` (46), `lg` (56)
- Props: `title`, `onPress`, `disabled`, `loading`, `rightIcon`

### 4.4 `Stepper`
- Props: `value`, `onChange`, `min = 0`, `max?`, `size = "md"`
- Usos: carrito, modal edit sticker.
- Sizes: sm (26 buttons), md (32), lg (56).

### 4.5 `StickerCard`
- Props: `sticker`, `count`, `onTap`, `onLongPress`, `mode = "grid"`
- Estados: empty (dashed), owned (solid green), duplicate (ink+gold badge), forSwap (pulsing border).
- Tamaño: 80×106 en grid 4col.

### 4.6 `ProductCard`
- Props: `product`, `onTap`, `onQuickAdd`
- Aspect ratio 1:1 imagen + 90px body.

### 4.7 `Chip`
- Props: `label`, `active`, `onTap`, `variant = "default"`
- Variants: default (paper + border), active (ink + white), colored (green/gold/red).

### 4.8 `ProgressBar`
- Props: `value`, `total`, `color = "gold"`, `track = "rgba(0,0,0,.05)"`, `height = 10`
- Animated width transition 300ms.

### 4.9 `StatBox`
- Props: `label`, `value`, `subtitle?`, `color`, `dark?`
- Tamaño estándar 48% ancho.

### 4.10 `Hero`
- Props: `title`, `kicker`, `subtitle`, `colors: [string, string, string]`, `rings = true`
- Gradient + rings decorativos.

### 4.11 `BottomSheet`
- Props: `open`, `onClose`, `height = 0.6`, `title`, `children`
- Drag handle arriba, backdrop, swipe-to-dismiss.

### 4.12 `Toast`
- Props: `message`, `variant = "default" | "success" | "error"`, `duration = 1800`
- Posición bottom center, ink fondo.

### 4.13 `Empty`
- Props: `icon`, `title`, `subtitle`, `ctaLabel?`, `onCta?`
- Padding 50, centrado.

### 4.14 `SearchBar`
- Props: `value`, `onChange`, `placeholder`, `onClear`
- Sticky, rounded pill.

### 4.15 `Modal`
- Variants: `bottom-sheet`, `center`, `fullscreen`
- Backdrop 45% black, ESC/tap-out cierra.

### 4.16 `FAB`
- Props: `icon`, `onPress`, `color = "green"`, `position = "br"`
- Tamaño 56×56.

### 4.17 `QRView`
- Props: `data` (string), `size = 240`
- Renderiza QR SVG localmente.

### 4.18 `QRScanner`
- Props: `onScan(data)`, `onClose`
- Fullscreen, overlay de guía.

### 4.19 `InfoRow`
- Props: `icon`, `label`, `value`
- Usado en detalle producto.

### 4.20 `SegmentedControl`
- Props: `options: [{id, label, badge?}]`, `active`, `onChange`
- Pill con badges contador opcional.

---

## 5. Estados (empty, loading, error)

### 5.1 Empty states por pantalla

| Pantalla | Empty state |
|---|---|
| Home (0% álbum) | "Aún no marcas ningún sticker. Abre un sobre y captura tu primer código." → CTA "Agregar código" |
| Álbum Have | "Aún no tienes stickers. Abre un sobre o usa el botón + abajo." |
| Álbum Need | "🏆 ¡Completaste este filtro!" |
| Álbum Swap | "Sin repetidos aún. Cuando tengas, aparecen aquí." |
| Carrito | "Tu carrito está vacío" + CTA "Ir a la tienda" |
| Stats (0%) | "Marca tu primer sticker para ver stats" |
| QR actividad | "Sin actividad aún. Comparte tu QR." |
| Swap sin overlap | "No tienen stickers en común para intercambiar" |

### 5.2 Loading states

- **Global:** spinner ink centrado, texto "Cargando…"
- **Lista larga:** skeleton cards (grey pulse 1.5s) con mismo layout del card final. 3–6 skeletons mientras llega data.
- **Botón primario:** label se reemplaza por spinner + "Procesando…" durante la acción.
- **Imagen producto:** blur placeholder color del gradient mientras carga.
- **My Panini foto:** spinner sobre la card mientras procesa la imagen.

### 5.3 Error states

- **Sin conexión:** banner sticky top rojo "Sin conexión — cambios guardados localmente. Sincronizaremos cuando vuelva."
- **Compra falló:** modal con ícono error, mensaje "No pudimos procesar tu pago. Intenta de nuevo o usa otra tarjeta." + CTA "Reintentar" / "Cambiar método".
- **QR inválido:** toast "Este QR no es de Mundial 26".
- **Foto inválida (My Panini):** inline error bajo preview "La foto debe ser de al menos 300×400px".
- **Código no válido (Quick Add):** input border rojo + helper "Código no válido. Formato: MEX07, ARG10…".
- **Zona fuera de cobertura (Envío GDL):** Select disabled + texto "Tu CP no está en cobertura GDL. Usa Envío Nacional."

---

## 6. Flujos paso a paso (críticos)

### 6.1 Marcar un sticker (core flow)

1. Usuario abre sobre físico, ve sticker "ARG 10" impreso.
2. Abre app → tab **Álbum**.
3. Tap FAB "+".
4. Modal Quick Add aparece con input autofocus.
5. Usuario teclea "ARG10".
6. Tap "Agregar +1".
7. Toast "+1 ARG10 · total 1".
8. Input se limpia. Usuario sigue tecleando "ARG11".
9. Tap "Agregar +1".
10. Toast "+1 ARG11 · total 1".
11. ... repite hasta los 7 del sobre.
12. Usuario swipe down para cerrar modal.
13. Álbum muestra los 7 nuevos en verde.

**Total: ~12s para capturar 7 stickers.** Critical path < 15s.

### 6.2 Comprar un faltante desde Home

1. Home.
2. Scroll horizontal "Stickers que te faltan".
3. Tap "+" en "BRA 14".
4. Toast "+1 BRA14 al carrito".
5. Badge carrito arriba sube a "1".
6. Usuario sigue en Home, agrega más desde recomendados.
7. Tap icono carrito.
8. Ve resumen, tap "Pagar".
9. Checkout → tarjeta guardada → "Pagar $XX".
10. Confirmación "¡GOL!".

**Total: 2 taps para agregar, ~6 para pagar.**

### 6.3 Swap con amigo (QR)

1. Pablo y Carlos se juntan físicamente.
2. Carlos abre QR tab → muestra su QR grande.
3. Pablo tap tab QR → "Escanear QR".
4. Cámara abre, Pablo apunta al QR de Carlos.
5. App detecta QR → transición a `/swap` con datos pre-calculados.
6. Pablo ve: "Carlos tiene 8 que necesitas. Tú tienes 5 que él necesita."
7. Pablo tap 3 stickers en "Recibes" y 2 en "Das".
8. Botón "Confirmar trade (3 × 2)" se activa.
9. Tap → modal confirmación.
10. Tap "Confirmar".
11. App resta -2 de los que dio, +3 de los que recibió (pendiente visual hasta que Carlos confirme).
12. Pantalla success "¡Swap realizado!".
13. Notificación enviada a Carlos para que confirme de su lado.

### 6.4 Crear My Panini

1. Tienda → scroll hasta sección "My Panini".
2. Tap "Cámara" (permiso si primera vez).
3. Toma foto.
4. App crop auto 3:4. Usuario ajusta con pinch.
5. Selecciona país "México".
6. Selecciona tipo "Jugador".
7. Ingresa nombre "Pablo González", dorsal 10.
8. Preview actualiza.
9. Tap "Agregar al carrito · $200".
10. Lleva al carrito con item "My Panini · Pablo González".
11. Checkout normal.
12. Post-compra: backoffice imprime física y entrega con siguiente pedido.

---

## 7. Pricing y data model del sticker

Cada sticker tiene:

```ts
type Sticker = {
  code: string;        // "MEX07"
  group: string;       // "TEAM-MEX"
  n: number;           // 7
  label: string;       // "Hirving Lozano"
  type: "logo" | "team" | "player" | "special";
  tier: "comun" | "media" | "dificil";
  price: number;       // 5 | 10-20 | 20-50
  rarity?: number;     // 1-100, opcional visual
};
```

**Asignación automática de tier:**
- `type === "logo"` → `dificil`, precio $30.
- `type === "special" && group === "LEYENDAS"` → `dificil`, precio $50.
- `type === "special"` → `media`, precio $15.
- `type === "team"` → `media`, precio $10.
- `type === "player"` → `comun`, precio $5.

**Excepciones editables** via admin (ej. algunos jugadores "estrellas" saltan a media).

---

## 8. Persistencia y sync

### 8.1 localStorage (offline-first)

Todo se guarda localmente bajo key `mundial26.state.v3`:

```json
{
  "user": {...},
  "album": {
    "TEAM-MEX": { "7": { "owned": 1, "dup": 2, "forSwap": true } }
  },
  "cart": { "CAJA-100": 1 },
  "orders": [...],
  "ui": { "tab": "album", "albumSub": "have", "albumFilter": "MEX" }
}
```

### 8.2 Sync con backend (cuando haya auth)

- Push dirty queue cada 30s si hay conexión.
- Pull al abrir la app: diff con última sync, merge server wins en conflictos.
- Evento websocket: swap recibido → notificación push + badge en QR tab.

---

## 9. Roadmap de implementación

**Fase 1 — Deliverable inmediato (PWA funcional):**
1. ✅ Navegación 5 tabs nueva (Home, Álbum, Stats, Tienda, QR)
2. ✅ Home dashboard con CTA principal + recomendados horizontal
3. ✅ Álbum con subtabs Have/Need/Swap + Quick Add FAB
4. ✅ Sticker tap = increment, long-press = modal
5. ✅ Stats simple
6. ✅ Tienda con 3 secciones (Completa álbum + My Panini básico + Catálogo)
7. ✅ Cart con 3 opciones de envío
8. ✅ QR tab con QR propio + scan (mock)
9. ✅ Swap flow completo (mock user)

**Fase 2 — Mejoras:**
1. My Panini foto real con crop (requiere cámara + manipulación imagen)
2. QR scanner real con cámara
3. Stripe Elements real
4. Backend sync
5. Push notifications (swap recibido)

**Fase 3 — Nativa (Expo/RN):**
1. Port a React Native con misma arquitectura
2. Cámara nativa para QR y My Panini
3. Deeplinks `mundial26://swap/:userId`
4. App Store + Play Store submit

---

## 10. Reglas UX no negociables (checklist final)

- [ ] Máximo 2 taps para añadir sticker al álbum (FAB → teclear → Add)
- [ ] Máximo 2 taps para agregar al carrito desde cualquier lado (recomendados tienen "+" directo)
- [ ] Máximo 2 taps para iniciar swap (QR tab → Escanear)
- [ ] Feedback <100ms en cada tap (scale + toast)
- [ ] Precio visible sin un solo tap extra en toda la tienda
- [ ] Carrito persiste al cerrar y reabrir
- [ ] Ningún texto vital en gris <40% opacity
- [ ] Ningún tap target <44px (iOS guideline)
- [ ] Contraste WCAG AA mínimo en todos los textos
- [ ] Animaciones nunca >300ms
- [ ] Cero spinners infinitos sin error handler
- [ ] Toast auto-dismiss 1.8s; nunca persisten

---

*Spec v1 — Mundial 26 App 1 (usuario). Para preguntas sobre componentes individuales o flujos edge-case: añadir issue en el repo con etiqueta `ux`.*

# Checklist Cintas · App instalable

App de inspección pre y verificación post mantenimiento de cintas transportadoras (MSMIN).
Se instala en el celular con ícono propio, **abre sin señal** y guarda los datos en la
planilla *Checklist Cambio de Cintas Transportadoras* a través de Apps Script.

## Archivos
| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app (mismo diseño que el Web App v102) |
| `config.js` | **La única configuración:** la URL de Apps Script |
| `sw.js` | Permite abrir la app sin señal |
| `manifest.webmanifest` | Nombre e ícono al instalar |
| `icons/` | Íconos de la app |

## Puesta en marcha (una sola vez)

### 1. Apps Script
1. Reemplaza `Codigo.gs` por la versión **v103** (el `Index.html` v102 no cambia).
2. Arriba, elige la función **`configurarClaveApp`** y presiona **▶ Ejecutar**. Autoriza si lo pide.
   En el *Registro de ejecución* aparece el código de acceso, por ejemplo `CINTAS-4821`. Guárdalo.
3. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
4. Copia la **URL de la aplicación web** (termina en `/exec`).

> La app no pide cuenta de Google al inspector; la seguridad la da el código de acceso.
> Si quieres cambiarlo, vuelve a ejecutar `configurarClaveApp` y entrega el nuevo código.

### 2. GitHub
1. Crea un repositorio **público** llamado `checklist-cintas`.
2. **Add file → Upload files** y arrastra **todo el contenido** de esta carpeta (incluida la carpeta `icons`). **Commit changes**.
3. Abre `config.js` → lápiz ✏️ → pega la URL `/exec` en lugar del texto `PEGAR_AQUI...` → **Commit changes**.
4. **Settings → Pages** → *Source*: **Deploy from a branch** → Branch **main** / **(root)** → **Save**.
5. En 1–2 minutos la app queda en `https://TU_USUARIO.github.io/checklist-cintas/`.

### 3. Instalar en el celular
- **iPhone:** abre el link en **Safari** → botón Compartir → **Agregar a inicio**.
- **Android:** abre el link en **Chrome** → **Instalar app** (o ⋮ → Agregar a pantalla principal).

La primera vez pide el **código de acceso** y necesita señal para descargar los datos de trabajo.
Después abre y funciona sin señal; lo pendiente se envía solo al recuperar conexión.

## Publicar cambios en la app
1. Sube el nuevo `index.html` a GitHub.
2. En `sw.js` cambia `const VERSION = 'checklist-cintas-v1'` a `v2`, `v3`, etc.
Los celulares se actualizan solos la próxima vez que abran la app con señal.

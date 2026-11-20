# ❤️ Latidos Compartidos — Demian & Verónica

Una aplicación web móvil progresiva (**PWA**) íntima, romántica y de grado biométrico diseñada exclusivamente para una pareja (**Demian y Verónica**). Permite sentir en la palma de la mano el latido exacto del otro en tiempo real con latencia mínima (<100ms), ya sea transmitiendo continuamente desde una pulsera inteligente **Xiaomi Smart Band 9** (vía Pulsoid) o midiendo el pulso en vivo tocando la cámara trasera y el flash con el dedo (**Fotopletismografía - PPG**).

---

## 🌟 Características Principales

### 1. Estética e Intimidad
- **Paleta de Colores:** Negro obsidiana profundo (`#090308`), borgoña/vino (`#4c0519`), rosa carmesí suave (`#e11d48`, `#fb7185`) y acentos de luz de luna y violeta (`#c084fc`).
- **Autenticación Íntima:** Selector de perfil con 1 toque ("Soy Demian" / "Soy Verónica") y sala privada asegurada por un código PIN de pareja (por defecto `1402`, configurable y persistente en `localStorage`).
- **Control Háptico Global:** Interruptor accesible en todo momento para activar o silenciar la vibración sin interrumpir la visualización.
- **Sintetizador Cardíaco Multi-Sensorial (Audio Web API):** Como Safari en iOS no soporta la API `navigator.vibrate()`, la aplicación cuenta con un sintetizador acústico sub-grave orgánico que emula el sonido exacto de los ventrículos cardíacos ("lub-dub" acústico a 55Hz/45Hz). En Android, produce una experiencia háptica y auditiva combinada.
- **Screen Wake Lock API:** Impide que la pantalla del celular se apague durante las sesiones íntimas.

---

### 2. Módulo 1: "Mi Corazón en Vivo" (Xiaomi Smart Band 9 & Pulsoid)
- **Visualización Orgánica 3D/SVG:** Corazón anatómico estilizado con gradientes multicapa y ondas expansivas en Framer Motion, cuyo ciclo sistólico/diastólico se sincroniza matemáticamente con el intervalo RR ($60000 / \text{BPM}$ ms).
- **Vibración Sincronizada en el Teléfono de la Pareja:**
  - Cuando Verónica siente a Demian, su teléfono emite un pulso háptico doble realista (**"lub-dub"**, `[60, 100, 40]`) al ritmo de cada latido recibido.
- **Integración con Pulsoid:** Conexión directa por WebSocket y proxy API (`https://dev.pulsoid.net/api/v1/data/real_time`).
- **Modo Simulación Inteligente (Fallback):** Si la pulsera se está cargando o Pulsoid no está transmitiendo, se activa un modelo biológico con arritmia sinusal respiratoria (fluctuación suave según el ciclo de respiración de 4 segundos) y preajustes (Reposo 64 BPM, Tranquilo 78 BPM, Enamorado 98 BPM, Emocionado 125 BPM).
- **Temperatura Corporal Simulada Realista:**
  - Genera una lectura cutánea dentro del rango fisiológico humano (`36.1°C` a `37.2°C`).
  - **Lógica acoplada:** Consulta el clima en tiempo real mediante **Open-Meteo API** (sin API key requerida). Si el clima supera los 28°C o el pulso sube (>95 BPM), la piel sube gradualmente a `36.8°C - 37.1°C`; si hace frío (<15°C) o el pulso es bajo (<65 BPM), baja a `36.2°C - 36.5°C`, con micro-fluctuaciones armónicas suaves cada 15 segundos para replicar un sensor real.

---

### 3. Módulo 2: "Latidos en Pareja" (Fotopletismografía - PPG)
- **Sala Sincronizada:** Presencia mutua en tiempo real ("Conectado con Verónica/Demian" vs "Esperando a tu pareja").
- **Sensor Óptico por Cámara Trasera + Flash:**
  - Solicita acceso a la cámara trasera (`facingMode: "environment"`) y activa la linterna (`torch: true`).
  - Procesa los fotogramas de video en un `<canvas>` oculto a 30 FPS.
  - **Validación de contacto:** Verifica la saturación del canal Rojo y la relación cromática frente al Verde y Azul. Si se retira el dedo, alerta inmediatamente y pausa el cálculo.
  - **Filtrado Matemático Paso Banda:**
    - Filtro paso alto (~0.7 Hz / 42 BPM) mediante sustracción de línea de base móvil.
    - Filtro paso bajo (~3.5 Hz / 210 BPM) para eliminar el ruido y parpadeo de la cámara.
    - Detección adaptativa de picos sistólicos con período refractario de 285ms.
- **Osciloscopio Dual en Vivo:** Dibuja la onda de pulso arterial del usuario (carmesí) y la onda de pulso de la pareja recibida por WebSockets (violeta).
- **Transmisión Cruzada Sub-100ms y Vibración Mutua:**
  - Cada vez que el dedo de Demian detecta un pico de sístole, envía un evento instantáneo vía Socket.io al teléfono de Verónica, haciéndolo vibrar (`navigator.vibrate(70)`) y destellar su corazón en ese milisegundo exacto.
  - Simultáneamente, el pulso de Verónica hace vibrar el celular de Demian.
  - **Sincronía de Almas:** Si ambos tienen sus dedos puestos, calcula el porcentaje de sincronía. Cuando están en sintonía (< 3 BPM de diferencia), ¡se dispara una animación de confeti romántico y vibración entrelazada!

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons, Canvas-Confetti.
- **Backend:** Node.js, Express, Socket.io (WebSockets de baja latencia con ping optimizado de 8s/5s).
- **Hardware / APIs Web Nativas:**
  - `navigator.vibrate()`
  - `navigator.mediaDevices.getUserMedia()` con `torch: true`
  - HTML5 `<canvas>` (muestreo óptico y osciloscopio)
  - `Screen Wake Lock API` (`navigator.wakeLock`)
  - Web Audio API (Sintetizador cardiológico sub-grave)
  - Open-Meteo Weather API

---

## 📱 Guía de Configuración: Xiaomi Smart Band 9 + Notify for Xiaomi + Pulsoid

Para transmitir el ritmo cardíaco de tu pulsera Xiaomi Smart Band 9 a la aplicación:

1. **Vincular Xiaomi Band 9:**
   - En tu smartphone Android, descarga la app [Notify for Xiaomi](https://play.google.com/store/apps/details?id=com.mc.xiaomi1) o utiliza la app oficial de Xiaomi.
2. **Configurar Pulsoid:**
   - Entra en [Pulsoid.net](https://pulsoid.net) y crea una cuenta gratuita.
   - Instala la app de **Pulsoid** en tu smartphone.
   - Abre la app de Pulsoid y conéctala a tu Xiaomi Smart Band 9 por Bluetooth BLE (o configúrala desde Notify for Xiaomi para reenviar los datos a Pulsoid).
3. **Obtener tu Token de Pulsoid:**
   - En la web de Pulsoid, ve a la sección de **Configuration** o **API / Widgets**.
   - Copia tu **Access Token** o el identificador de tu Widget.
4. **Pegarlo en la App:**
   - En la aplicación, abre el menú superior de **Ajustes** (icono de engranaje) o toca **"Ajustar Banda"**.
   - Pega tu token en el campo **Pulsoid Token / Feed Key** y selecciona **"En Vivo (Mi Band 9)"**.
   - ¡Listo! Tu pulso real se transmitirá continuamente a Verónica.

---

## 🚀 Despliegue en la Nube (100% Gratuito)

### Opción A: Despliegue Unificado Full-Stack en Render o Railway (Recomendado)
El servidor Express en `backend/src/server.ts` ya está configurado para servir tanto la API/WebSockets como los archivos estáticos compilados de Vite en `frontend/dist`.

1. Sube este repositorio a tu GitHub (ej: `demian-veronica/latidos-compartidos`).
2. En [Render.com](https://render.com) (o [Railway.app](https://railway.app)):
   - Crea un nuevo **Web Service**.
   - Conecta tu repositorio de GitHub.
   - Configura:
     - **Build Command:** `npm run build`
     - **Start Command:** `npm start`
     - **Environment Variable:** `PORT=3001`
   - ¡Listo! Tu app estará disponible en una URL HTTPS (ej: `https://latidos-compartidos.onrender.com`). Al ser HTTPS, las APIs de cámara, linterna y vibración funcionarán perfectamente en los celulares.

### Opción B: Frontend en Vercel + Backend en Render
1. **Backend (Render / Railway):**
   - **Root Directory:** `backend`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - Obtén la URL (ej: `https://mi-backend.onrender.com`).
2. **Frontend (Vercel):**
   - Conecta el repo en [Vercel.com](https://vercel.com).
   - **Root Directory:** `frontend`
   - **Environment Variable:**
     - `VITE_BACKEND_URL` = `https://mi-backend.onrender.com`
   - Despliega.

---

## 💻 Ejecución Local para Pruebas

Para probarlo localmente en tu computadora o en tu red WiFi doméstica:

```bash
# 1. Instalar dependencias en ambas carpetas
npm run install:all

# 2. Iniciar el servidor backend (puerto 3001)
npm run dev:backend

# 3. En otra terminal, iniciar el cliente Vite (puerto 5173 con acceso de red)
npm run dev:frontend
```

Abre en tu navegador:
- En tu PC: `http://localhost:5173`
- En tu smartphone (conectado a la misma red WiFi): `http://TU_IP_LOCAL:5173` (ejemplo: `http://192.168.1.50:5173`).

---

## 📲 Cómo Instalar como PWA en tu Celular

- **En Android (Google Chrome):**
  1. Abre el enlace de la aplicación.
  2. Toca el menú de tres puntos (⋮) en la esquina superior derecha.
  3. Selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
  4. La app aparecerá en tu menú de aplicaciones con icono propio y se abrirá en pantalla completa sin barra de navegación.

- **En iPhone (Apple Safari):**
  1. Abre el enlace en Safari.
  2. Toca el botón **Compartir** (icono cuadrado con flecha hacia arriba en la barra inferior).
  3. Desplaza hacia abajo y selecciona **"Agregar a la pantalla de inicio"**.
  4. Se creará el acceso directo con icono íntimo y soporte de pantalla completa.

---

❤️ *Creado con dedicación para Demian & Verónica.*

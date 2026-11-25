# Couch Co-op

App para el celular para anotar puntajes cuando se juega de a varios en el sillón: jugadores, torneos, tablas e historial. Una sola persona anota desde su teléfono, los datos quedan guardados en el teléfono y la app funciona sin internet.

Juegos: Rocket League (partidos con equipos que rotan) y Trackmania (time trial por eliminación). Las reglas completas están en el documento "Couch Co-op: reglas y modelo de datos".

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm test         # tests de la lógica
npm run build    # build de producción en dist/
```

## Estructura

- `src/model/`: tipos del modelo de datos y la lógica pura de cada juego (propuestas de formato, puntajes).
- `src/store/`: cambios sobre los datos (`actions.ts`, funciones puras), guardado en `localStorage` con versión de esquema (`persistence.ts`) y el hook `useData`.
- `src/pages/` y `src/components/`: pantallas.

Los datos se guardan en `localStorage` bajo `couch-coop/data` con `schemaVersion`. Si el esquema cambia, se agrega un paso en `migrate()`. Desde Ajustes se puede descargar y restaurar una copia de seguridad en JSON.

## Deploy

Cada push a `main` corre los tests, hace el build y publica en GitHub Pages (Settings → Pages → Source: GitHub Actions).

## Datos compartidos (Firebase, gratis)

Sin configurar, cada teléfono guarda sus datos. Con Firebase (plan gratis Spark,
sin tarjeta) todos ven en vivo lo que carga el que anota:

1. Crear un proyecto en https://console.firebase.google.com (sin Google Analytics).
2. Compilación → Realtime Database → Crear base de datos (modo bloqueado).
   En la pestaña Reglas pegar (con el email del que anota):
   ```json
   {
     "rules": {
       "couchCoop": {
         ".read": true,
         ".write": "auth != null && auth.token.email == 'EMAIL_DEL_QUE_ANOTA'"
       }
     }
   }
   ```
3. Compilación → Authentication → Comenzar → Correo electrónico/contraseña → Habilitar.
   En Usuarios → Agregar usuario, crear la cuenta del que anota.
4. Configuración del proyecto → Tus apps → Web (`</>`): registrar la app y copiar
   `apiKey`, `authDomain`, `databaseURL`, `projectId` y `appId` en `src/sync/config.ts`.
   No son secretos: lo que protege los datos son las reglas.
5. En la app, el que anota entra en Ajustes → "¿Sos el que anota?". Los demás no hacen nada.

Para probar en local con los emuladores de Firebase (auth en 9099, database en 9000):
`VITE_CLOUD_EMULATOR=1 VITE_CLOUD_CONFIG='{"apiKey":"x","authDomain":"x","databaseURL":"http://127.0.0.1:9000?ns=demo-couch-default-rtdb","projectId":"demo-couch","appId":"x"}' npm run dev`

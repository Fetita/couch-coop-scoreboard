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

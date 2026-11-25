// Configuración de Firebase para compartir los datos entre teléfonos.
//
// Estos valores no son secretos: identifican el proyecto y viajan igual en la app.
// Lo que protege los datos son las reglas de la base (solo el que anota puede escribir).
// Con `null` la app funciona como antes: todo queda solo en cada teléfono.

export interface CloudConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  appId: string;
}

const PROJECT_CONFIG: CloudConfig | null = null;

/** Para pruebas locales se puede pasar otra configuración con VITE_CLOUD_CONFIG (JSON). */
const fromEnv = import.meta.env.VITE_CLOUD_CONFIG as string | undefined;

export const cloudConfig: CloudConfig | null = fromEnv ? (JSON.parse(fromEnv) as CloudConfig) : PROJECT_CONFIG;

/** Solo para pruebas: usar los emuladores de Firebase en esta máquina. */
export const useEmulator = import.meta.env.VITE_CLOUD_EMULATOR === '1';

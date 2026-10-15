# orderflow-engine-infra

[English](README.md)

El stack completo de Orderflow Engine con Docker Compose (la base de datos y la API, construidas desde los repositorios hermanos), y el comando de pruebas del espacio de trabajo (`scripts/test-all`) que ejecuta juntas las pruebas de la API, la verificación de la documentación y la verificación de integridad.

## Estado

Construido en la tarea T-01 del plan de tareas (`spec/TASKS.md` del repositorio `orderflow-engine-docs`): `compose.yaml` levanta la base de datos y la API, y `scripts/test-all` ejecuta todas las verificaciones del espacio de trabajo. La pantalla web se suma al stack, y sus pruebas a `test-all`, en T-17.

## Estructura de clonado

Es el único repositorio que referencia a sus hermanos, porque los orquesta. Clona los repositorios uno al lado del otro:

```text
workspace/
├── orderflow-engine-api/
├── orderflow-engine-web/
├── orderflow-engine-infra/   ← ejecuta docker compose aquí
├── orderflow-engine-docs/
├── orderflow-engine-tools/
└── orderflow-engine-app/
```

`docker compose` solo necesita `orderflow-engine-api` junto a este repositorio. `test-all` necesita los seis, porque la verificación de la documentación lee todos los repositorios. `orderflow-engine-api` también se ejecuta solo, con su propio `compose.yaml`, y `orderflow-engine-web` tendrá el suyo en T-17. Las claves de configuración están en `.env.example`. `.env` nunca se versiona.

## Cómo ejecutarlo

| Requisito | Versión |
|-----------|---------|
| Docker | en ejecución, para el stack y para las pruebas de la API (Testcontainers) |
| JDK | 21, para `test-all` |
| Node | 18 o posterior, para `test-all` |
| PowerShell | 7 (`pwsh`), solo para `test-all.ps1` en Windows |

Levanta el stack completo desde este repositorio, con los hermanos clonados como se muestra arriba:

```bash
docker compose up --build
```

Compose construye la imagen de la API desde `../orderflow-engine-api` y levanta primero PostgreSQL. La API arranca cuando la base de datos está sana. Salud: `http://localhost:8080/actuator/health`. `docker compose down` detiene el stack, y `docker compose down -v` además borra el volumen de la base de datos.

La configuración viene de variables de entorno. `.env.example` lista cada clave con un comentario, y sus valores son los predeterminados, así que el stack arranca sin un `.env`. Cópialo a `.env` solo para cambiar un valor. Por ejemplo, `API_PORT` mueve el puerto de la API dentro del contenedor y en el host. El stack de `orderflow-engine-api` publica el mismo puerto, así que ejecuta un stack a la vez o dale a uno de ellos otro `API_PORT`.

Ejecuta todas las pruebas del espacio de trabajo desde este repositorio, con bash (Linux, macOS, Git Bash):

```bash
bash scripts/test-all.sh
```

o con PowerShell en Windows:

```powershell
pwsh -File scripts/test-all.ps1
```

`test-all` encuentra la raíz del espacio de trabajo dos niveles por encima del script, así que también se ejecuta desde cualquier otra carpeta usando su ruta. Ejecuta, en orden:

1. `./mvnw verify` en `orderflow-engine-api` (`mvnw.cmd verify` en PowerShell)
2. `node orderflow-engine-tools/docs-check/check-docs.mjs`
3. `node orderflow-engine-tools/integrity/check-integrity.mjs`

Se detiene en el primer fallo con `test-all: FAIL (<step>, exit code <n>)` y ese código de salida. Cuando todos los pasos pasan, termina con `test-all: OK (API verify, documentation check, integrity check)`.

## Documentación

- Especificación: `spec/SPEC.md` del repositorio `orderflow-engine-docs`
- Reglas de integridad: `governance/repository-integrity.md` del repositorio `orderflow-engine-docs`
- Mapa de documentos: `README.es.md` del repositorio `orderflow-engine-docs`

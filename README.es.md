# orderflow-engine-infra

[English](README.md)

El stack completo de Orderflow Engine con Docker Compose (la base de datos, la API y el cliente web, construidos desde los repositorios hermanos), y el comando de pruebas del espacio de trabajo (`scripts/test-all`) que ejecuta juntas las pruebas de la API, las pruebas web, el flujo de extremo a extremo, la verificación de la documentación y la verificación de integridad.

## Estado

Construido en la tarea T-01 del plan de tareas (`spec/TASKS.md` del repositorio `orderflow-engine-docs`): `compose.yaml` levanta la base de datos y la API, y `scripts/test-all` ejecuta todas las verificaciones del espacio de trabajo. T-17 suma el cliente web al stack y sus pruebas a `test-all`. T-19 hace que Docker reinicie el stack y suma el flujo de extremo a extremo a `test-all`.

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

`docker compose` solo necesita `orderflow-engine-api` y `orderflow-engine-web` junto a este repositorio. `test-all` necesita los seis, porque la verificación de la documentación lee todos los repositorios. `orderflow-engine-api` y `orderflow-engine-web` también se ejecutan solos, cada uno con su propio `compose.yaml`. Las claves de configuración están en `.env.example`. `.env` nunca se versiona.

## Cómo ejecutarlo

| Requisito | Versión |
|-----------|---------|
| Docker | en ejecución, para el stack, las pruebas de la API (Testcontainers), las pruebas web y el flujo de extremo a extremo (contenedores) |
| JDK | 21, para `test-all` |
| Node | 18 o posterior, para las verificaciones de documentación e integridad de `test-all` y la verificación de versión del flujo de extremo a extremo. Las pruebas web y el flujo de extremo a extremo traen su propio Node en sus contenedores |
| PowerShell | 7 (`pwsh`), solo para `test-all.ps1` en Windows |

Levanta el stack completo desde este repositorio, con los hermanos clonados como se muestra arriba:

```bash
docker compose up --build
```

Compose construye la imagen de la API desde `../orderflow-engine-api` y la imagen web desde `../orderflow-engine-web`, y levanta primero PostgreSQL. La API arranca cuando la base de datos está sana, y el cliente web arranca después de la API. Abre el cliente en `http://localhost:8081`. Su nginx sirve el cliente y reenvía `/api/` a la API por la red de compose (`API_UPSTREAM` sigue a `API_PORT`), así que el navegador ve un solo origen y la API no necesita CORS. Salud de la API: `http://localhost:8080/actuator/health`, solo en el puerto de la API, porque el origen del cliente no reenvía `/actuator`. `docker compose down` detiene el stack, y `docker compose down -v` además borra el volumen de la base de datos.

Cada servicio tiene `restart: unless-stopped`: Docker vuelve a iniciar un servicio cuando termina, y vuelve a levantar el stack cuando arranca el daemon de Docker (por ejemplo, tras reiniciar el equipo). Un servicio detenido a mano, con `docker compose stop` o `docker compose down`, sigue detenido.

La configuración viene de variables de entorno. `.env.example` lista cada clave con un comentario, y sus valores son los predeterminados, así que el stack arranca sin un `.env`. Cópialo a `.env` solo para cambiar un valor. Por ejemplo, `API_PORT` mueve el puerto de la API dentro del contenedor y en el host, y `WEB_PORT` mueve el puerto del cliente en el host. Los stacks de `orderflow-engine-api` y `orderflow-engine-web` publican los mismos puertos, así que ejecuta un stack a la vez o dale a uno de ellos otro `API_PORT` u otro `WEB_PORT`.

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
2. `docker build --target test .` en `orderflow-engine-web`: las pruebas web en la etapa de pruebas de su `Dockerfile` (la verificación de texto literal y luego cada spec en Chromium sin interfaz), así que el host no necesita Node para ellas. Un spec que falla hace fallar la construcción
3. `scripts/e2e.sh` en este repositorio (`scripts/e2e.ps1` en PowerShell): el flujo de extremo a extremo contra el stack completo (ver "Flujo de extremo a extremo" más abajo)
4. `node orderflow-engine-tools/docs-check/check-docs.mjs`
5. `node orderflow-engine-tools/integrity/check-integrity.mjs`

Se detiene en el primer fallo con `test-all: FAIL (<step>, exit code <n>)` y ese código de salida. Cuando todos los pasos pasan, termina con `test-all: OK (API verify, web tests, end-to-end, documentation check, integrity check)`.

## Flujo de extremo a extremo

`e2e/` contiene una suite de Playwright que recorre el flujo completo en un navegador contra el stack real (PostgreSQL, la API y el cliente web): carrito → cotización → confirmación → pedido → Mis pedidos, una vez en español y otra en inglés. Elige los productos por SKU, nunca por nombre, porque los nombres son datos del tenant. Tras cada confirmación verifica que el número del pedido nuevo aparece primero en Mis pedidos, con el mismo total que mostró la pantalla del pedido, y que el historial de pedidos (`GET /api/v1/orders?customerId=`), leído por el origen del cliente, lo devuelve primero con el total confirmado. Pulsa los textos de los propios diccionarios del cliente, así que sigue su redacción, y falla ante cualquier error en la consola del navegador.

`scripts/e2e.sh` (`scripts/e2e.ps1` en PowerShell) la ejecuta, también por sí solo:

1. `e2e/check-playwright-version.mjs` verifica que `e2e/package.json` y la imagen de `e2e/Dockerfile` usan la versión de `playwright` que fija `orderflow-engine-web`, así que el flujo corre sobre el mismo navegador que las pruebas web
2. `docker build` crea la imagen del ejecutor desde `e2e/Dockerfile`, sobre `mcr.microsoft.com/playwright:v<versión>-noble`
3. `docker compose --project-name ofe-e2e up --build --detach --wait` levanta el stack completo con la API en el puerto 18080 y el cliente en el 18081, así que nunca choca con un stack levantado a mano en 8080 y 8081
4. el ejecutor se une a la red del stack y corre la suite contra `http://web:8080`, cuando la API ya responde a través del cliente
5. `docker compose --project-name ofe-e2e down --volumes --remove-orphans` siempre elimina el stack y su base de datos, también cuando un paso falla, así que cada ejecución parte de los datos semilla. Tras un fallo, primero imprime el final de los logs del stack

`E2E_PROJECT`, `E2E_API_PORT` y `E2E_WEB_PORT` cambian el nombre del proyecto y los dos puertos del host. Para correr la suite desde el host contra un stack ya levantado, desde `e2e/`: `npm ci`, `npx playwright install chromium` y luego `npx playwright test` con `E2E_BASE_URL=http://localhost:8081`.

## Documentación

- Especificación: `spec/SPEC.md` del repositorio `orderflow-engine-docs`
- Reglas de integridad: `governance/repository-integrity.md` del repositorio `orderflow-engine-docs`
- Mapa de documentos: `README.es.md` del repositorio `orderflow-engine-docs`

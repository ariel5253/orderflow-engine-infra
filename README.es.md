# orderflow-engine-infra

[English](README.md)

El stack completo de Orderflow Engine con Docker Compose (base de datos, API y, cuando exista, la pantalla web), y el comando de pruebas del espacio de trabajo (`scripts/test-all`) que ejecuta juntas las pruebas de la API, las pruebas web, la verificación de la documentación y la verificación de integridad.

## Estado

Planeado. Se construye en la tarea T-01 del plan de tareas (`spec/TASKS.md` del repositorio `orderflow-engine-docs`), y la pantalla web se suma en T-17.

## Estructura de clonado

Es el único repositorio que referencia a sus hermanos, porque los orquesta. Clona los repositorios uno al lado del otro:

```text
workspace/
├── orderflow-engine-api/
├── orderflow-engine-web/
├── orderflow-engine-infra/   ← ejecuta docker compose aquí
├── orderflow-engine-docs/
└── orderflow-engine-tools/
```

Cada uno de los demás repositorios también se ejecuta solo, con su propio `compose.yaml`. Las claves de configuración están en `.env.example`. `.env` nunca se versiona.

## Documentación

- Especificación: `spec/SPEC.md` del repositorio `orderflow-engine-docs`
- Reglas de integridad: `governance/repository-integrity.md` del repositorio `orderflow-engine-docs`
- Mapa de documentos: `README.es.md` del repositorio `orderflow-engine-docs`

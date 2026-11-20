# WorkFlow Técnico — versión 2.0

**Tipo:** Operaciones y seguimiento. **Estado:** prototipo académico ejecutable (NO es un sistema empresarial en producción).

Coordina órdenes de trabajo con un tablero Kanban arrastrable, checklist de intervención y bitácora de cada cambio.

## Funciones implementadas y comprobables
- Kanban por estados
- Checklist persistente por orden
- Bitácora de observaciones
- Duplicación de incidencias y CSV

- Persistencia local mediante SQLite.
- API HTTP construida con Node.js, sin instalación de dependencias de terceros.
- Diseño adaptable a escritorio y celular.
- Datos inventados, visibles desde el primer inicio.

## Requisitos

- Windows, macOS o Linux; Node.js **22.13 o posterior**, preferentemente LTS reciente. `node:sqlite` figura como experimental en Node 22.
- No se necesita instalar paquetes con npm ni tener cuentas externas.

## Ejecutar

```bash
node server.js
```

Abre http://127.0.0.1:3001/

En Windows se puede ejecutar `INICIAR_WINDOWS.bat` con doble clic.
Para ejecutar pruebas:

```bash
npm test
```

Se incluyen dos archivos de prueba por proyecto. Para reiniciar la demostración, detén la aplicación y elimina `data/demo.sqlite` (si existe), luego vuelve a ejecutarla.

## Seguridad, alcance y límites

- La demostración corre solo en **127.0.0.1**; no ofrece autenticación ni servicios en la nube.
- No introduzcas datos personales reales ni información confidencial de una empresa.
- Los nombres, repuestos, costos y registros incluidos son ficticios.
- El proyecto no demuestra que una empresa real haya usado ni aprobado la herramienta.
- GitHub: repositorio **no creado** hasta publicarlo manualmente.

## Qué puedes explicar al profesor

- El problema genérico que resuelve el sistema, sin atribuir requisitos internos a TECNO SUR.
- Cómo diseñaste la interfaz y las validaciones de la API.
- Cómo se almacenan los datos y se impiden operaciones incorrectas.
- Qué prueba puedes ejecutar para demostrar el comportamiento.

## Evidencia verificada
Dos pruebas automatizadas (API y funciones V2). Se verifican estados, checklist, notas y duplicación.

## Endpoints V2 destacados

`GET /api/orders`, `GET /api/orders/:id/detail`, `POST /api/orders/:id/checklist`, `PATCH /api/orders/:id/checklist/:task`, `POST /api/orders/:id/notes`, `POST /api/orders/:id/duplicate`, `PATCH /api/orders/:id`.

El tablero se puede operar arrastrando tarjetas o cambiando el estado desde el detalle. Cada movimiento de estado deja una entrada en la bitácora.

# Lab02: aplicación local de presentaciones

## Qué se pide

Construir una aplicación web cliente para crear y presentar diapositivas. Debe funcionar en el navegador, sin backend activo, usando React 18+, TypeScript, IndexedDB y Tailwind CSS o W3.CSS. La arquitectura separa Modelos, Vistas y Controladores (MVC) y usa interfaces para que IndexedDB pueda sustituirse después por un repositorio REST.

La aplicación debe permitir:

- Crear, listar y eliminar proyectos y guardar sus diapositivas localmente.
- Usar una portada como primer slide y slides de desarrollo con layouts de solo texto, solo imagen o texto e imagen.
- Editar slides y presentar a pantalla completa, navegando con las flechas izquierda/derecha.
- Copiar o mover slides a otros proyectos.
- Exportar una versión HTML descargable y preparar la impresión/guardado como PDF.
- Definir adaptadores simulados (stubs) para exportar a PowerPoint y LibreOffice.
- Escribir primero pruebas unitarias y de integración con Jest y React Testing Library (TDD).

## Guía resumida por fases

### Fase 1: preparar el proyecto y los modelos

1. Inicializar React + TypeScript y configurar Tailwind CSS o W3.CSS.
2. Definir los tipos `Project` y `Slide`.
3. Crear los contratos `IProjectRepository` e `IExporter`.
4. Mantener las interfaces independientes de la implementación concreta de almacenamiento.

### Fase 2: persistencia y lógica (TDD)

1. Escribir pruebas para inicialización, guardado y lectura de proyectos en IndexedDB.
2. Implementar `IndexedDbProjectRepository` hasta que pasen las pruebas.
3. Escribir pruebas para los hooks controladores.
4. Implementar `useProjectController` y `useSlideController` para concentrar las reglas de negocio fuera de la vista.
5. Dejar un `HttpMicroserviceRepository` como stub para una posible versión futura.

### Fase 3: interfaz y presentación

1. Crear `HeaderFooter` con autor, tema, número y fecha para slides de desarrollo.
2. Crear los layouts `LayoutTextOnly`, `LayoutImageOnly` y `LayoutTextAndImage`.
3. Crear `SlideRenderer` para decidir portada o contenido y elegir el layout adecuado.
4. Crear la vista de edición con campos de texto, selector de layout y URL de imagen.
5. Crear la vista de presentación a pantalla completa con navegación mediante flechas.

### Fase 4: reutilización, exportación y entrega

1. Implementar copia y traslado de slides entre proyectos y su menú en la interfaz.
2. Generar un archivo HTML autónomo descargable.
3. Preparar estilos `@media print` y `window.print()` para imprimir o guardar como PDF.
4. Definir `PptxExporterAdapter` y `OdpExporterAdapter` como stubs.
5. Ejecutar `npm test`, corregir fallos y hacer push al repositorio GitHub.

## Estructura sugerida

```text
src/
├── models/                 # Tipos y contratos
│   └── ports/              # IProjectRepository, IExporter
├── infrastructure/         # IndexedDB y stubs de infraestructura
├── controllers/            # Hooks con lógica de negocio
├── views/
│   ├── components/         # Renderer, encabezado y layouts
│   └── containers/          # Editor y presentación
└── tests/                  # Pruebas unitarias y de integración
```

## Orden de trabajo recomendado

Completar cada fase antes de pasar a la siguiente: primero contratos y pruebas, después repositorio/controladores, luego interfaz, y finalmente exportación y entrega. Al iniciar la implementación revisaremos qué herramientas y dependencias ya están disponibles en el equipo.

## Estado del trabajo

- **Fase 1 iniciada:** base Vite + React + TypeScript, configuración Tailwind y contratos iniciales en `src/models`.
- **Fase 2 implementada:** repositorio IndexedDB, hook controlador de proyectos y pruebas automatizadas para ambas capas.
- **Fase 3 implementada:** editor de proyectos y diapositivas, portada, tres layouts de contenido, vista previa y modo presentación con navegación por teclado.
- **Fase 4 implementada:** exportación HTML y preparación de impresión para PDF.
- Las pruebas se ejecutan con `npm test` (23 pruebas pasan).
- `npm run build` compila TypeScript y genera la versión de producción. Las importaciones locales usan extensiones explícitas para resolver correctamente la ruta del proyecto, que contiene `#`.
- `npm run dev` inicia Vite desde un enlace temporal con una ruta compatible; el enlace se elimina al cerrar el servidor.
- Para instalar las dependencias y abrir el proyecto localmente, ejecuta en esta carpeta:

  ```bash
  npm install
  npm run dev
  ```

- La estructura de modelos está en `src/models/`; la aplicación inicial está en `src/views/App.tsx`.
- La persistencia está en `src/infrastructure/IndexedDbProjectRepository.ts` y la lógica de proyectos en `src/controllers/useProjectController.ts`.

## Observación sobre la ejecución local

Se observó que al abrir la aplicación localmente el documento `index.html` carga, pero la interfaz React puede quedar en blanco o mostrarse incompleta. Se añadió un mensaje de diagnóstico para ese caso. La causa del fallo de renderizado todavía debe identificarse; que `npm run build` y `npm test` finalicen correctamente no confirma por sí solo el funcionamiento visual en el navegador.

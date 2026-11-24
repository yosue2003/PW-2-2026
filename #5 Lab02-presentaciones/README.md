# Lab02: aplicación local de presentaciones

Editor web de diapositivas hecho con React, TypeScript, Tailwind CSS e IndexedDB. Los proyectos se guardan en el navegador del equipo; la aplicación no necesita un backend.

## Ejecutar en esta computadora

Desde esta carpeta:

```bash
npm install
npm run dev
```

Abre en el navegador la dirección local que muestra Vite. El script `dev` usa una ruta temporal sin caracteres especiales para que Vite funcione aunque el nombre de esta carpeta incluya `#`.

## Funciones

- Crear, listar y eliminar proyectos.
- Crear una portada y diapositivas de desarrollo con layouts de texto, imagen o texto e imagen.
- Editar títulos, contenido, metadatos y URLs de imágenes.
- Presentar a pantalla completa con las flechas izquierda/derecha y salir con `Esc`.
- Copiar o trasladar una diapositiva a otro proyecto.
- Descargar una versión HTML estática e imprimirla o guardarla como PDF desde el navegador.
- Mantener los datos en IndexedDB entre aperturas del navegador.

Las exportaciones a PowerPoint y LibreOffice están definidas como adaptadores simulados y muestran un mensaje de que esos formatos aún no están disponibles. `HttpMicroserviceRepository` es un stub para una futura integración.

## Arquitectura

- `src/models/`: tipos `Project` y `Slide`, y contratos de repositorio y exportación.
- `src/infrastructure/`: repositorio IndexedDB, stub REST y exportadores.
- `src/controllers/`: lógica de proyectos y diapositivas.
- `src/views/`: editor, layouts y modo de presentación.
- `src/tests/`: pruebas unitarias y de integración con Jest y React Testing Library.

La primera diapositiva se mantiene como portada. Al eliminar o trasladar la portada, la primera diapositiva restante se convierte en portada.

## Comprobaciones

```bash
npm test
npm run build
```

`npm test` ejecuta la suite de Jest y `npm run build` valida TypeScript y genera la versión de producción en `dist/`.

Los proyectos quedan asociados a este navegador y perfil local. Si se borran los datos del sitio en el navegador, también se eliminan las presentaciones guardadas.

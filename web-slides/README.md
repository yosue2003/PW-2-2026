# Web Slides

Editor de diapositivas **100 % frontend**, desarrollado en **HTML, CSS, JavaScript y W3.CSS**.

## Abrir el proyecto

1. Descomprime el ZIP.
2. Abre `index.html` en un navegador actualizado (Chrome, Edge, Firefox o Safari).
3. Edita la diapositiva 0 (portada) y crea nuevas con el botón **Añadir diapositiva**.
4. Haz clic en **Presentar** para mostrar la presentación a pantalla de aplicación.

No se necesita Node.js, servidor de aplicaciones, npm ni una cuenta.

**Nota de compatibilidad:** el comportamiento de `IndexedDB` cuando se abre un documento mediante `file://` varía según el navegador y las restricciones de privacidad. Si aparece «Sesión temporal», puedes seguir editando y exportar/importar un JSON para conservar la información. Si deseas persistencia garantizada, publica los archivos como sitio estático con HTTPS o sírvelos desde `localhost` (sin necesidad de backend de datos).

## Almacenamiento

- API: `window.indexedDB`, no `localStorage`.
- Nombre de la base: **`index.db`**.
- Object store: **`presentations`**.
- Clave del registro: **`main`**.
- Almacenamiento automático tras los cambios.
- Los datos quedan en el perfil del navegador y el origen de la página.
- `index.db` es el nombre lógico de IndexedDB: **no es un archivo SQLite** ni se genera automáticamente un archivo físico `index.db` en la carpeta.
- Para transferir proyectos entre navegadores o equipos, utiliza **Exportar / Importar JSON**.

## Estructura

```text
web-slides/
├── index.html     # Encabezado, editor, barra lateral y pie de página
├── styles.css     # Diseño responsive + estilos de las diapositivas
├── app.js         # Editor, navegación y almacenamiento IndexedDB
└── README.md      # Instrucciones
```

## Funcionalidades

- Diapositiva 0 como portada y diapositivas N de contenido.
- Añadir, duplicar, mover, eliminar (excepto portada) y navegar.
- Editar título y cuerpo desde el panel lateral o directamente en la diapositiva.
- Formatos 16:9 (ancho predeterminado) y 4:3 (estándar).
- Seis temas de color y selección personalizada de fondo y color del texto.
- Alinear encabezado, texto del cuerpo y número independientemente.
- Mostrar u ocultar la numeración.
- Modo presentación y navegación por teclado (flechas, AvPág/RePág, Inicio/Fin, Escape).
- Guardado automático y exportación/importación JSON sin backend.

## Recursos externos opcionales

`index.html` referencia W3.CSS desde W3Schools y las tipografías DM Sans / Manrope desde Google Fonts. Se necesita conexión para esas hojas de estilo externas. Las funciones del editor se implementan en archivos locales y la hoja `styles.css` ofrece un diseño funcional incluso cuando la CDN no carga.

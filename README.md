🚀 Seminario de Actualización II - Nivelación 2026
Este proyecto forma parte de la etapa de nivelación del Seminario de Actualización II. Consiste en la exploración de diferentes formas de implementar y desplegar un sitio web, desde una versión estática pura hasta una arquitectura cliente-servidor utilizando Node.js.

📂 Estructura del Proyecto
El repositorio está organizado en tres secciones principales que representan la evolución de la aplicación:

Implementacion-1/: Versión estática pura. Contiene un archivo index.html que integra HTML, CSS y JS en un solo lugar para ejecutarse directamente en el navegador.

Implementacion-2/: Versión con servidor web. Utiliza un backend con Express para servir archivos de manera profesional.

SitioWebSimple/: Una versión modular del sitio con los estilos (CSS), la lógica (JS) y la estructura (HTML) separados en archivos y carpetas independientes para mejorar la mantenibilidad.

🛠️ Tecnologías Utilizadas
Frontend: HTML5, CSS3 (Flexbox), JavaScript (Vanilla).

Backend: Node.js, Express (v5.2.1).

Herramientas de Desarrollo: Nodemon (para reinicio automático), Git para control de versiones.

⚙️ Instalación y Configuración
Sigue estos pasos para tener el proyecto funcionando en tu máquina local:

1. Requisitos previos
Asegúrate de tener instalado Node.js (se recomienda la versión LTS).

2. Clonar el repositorio
Bash
git clone https://github.com/RamzLu/SeminarioDeActualizacionII2026.git
cd SeminarioDeActualizacionII2026
3. Instalar dependencias
Entra en la carpeta de la Implementación 2 e instala los paquetes necesarios:

Bash
cd Implementacion-2
npm install
🚀 Cómo ejecutar las versiones
Implementación 1 (Sin Servidor)
Simplemente busca el archivo index.html dentro de la carpeta Implementacion-1 y haz doble clic para abrirlo en tu navegador favorito.

Implementación 2 (Con Servidor Express)
Para correr esta versión utilizando el script de desarrollo configurado en el package.json:

Bash
# Dentro de la carpeta Implementacion-2
npm run dev
Luego, abre tu navegador y accede a: http://localhost:3000.

📝 Características del Sitio
Interacción en tiempo real: Validación de entrada de texto y alertas personalizadas.

Selector de Temas: Un botón interactivo que alterna dinámicamente entre diferentes combinaciones de colores de fondo y texto utilizando lógica de arreglos y el operador de módulo.

Diseño Responsivo: Centrado dinámico mediante Flexbox para una visualización óptima en diferentes pantallas.

🛡️ Control de Versiones
El proyecto incluye un archivo .gitignore configurado para evitar la subida innecesaria de la carpeta node_modules, manteniendo el repositorio liviano y profesional.

✨ Desarrollado por Luana para el Seminario de Actualización II - 2026.
import express from "express";
import fs from "fs";

const app = express();

// Servir los archivos de la carpeta "public"
app.use(express.static("public"));
app.use(express.json());

const archivoDatos = "estudiantes.json";

// Función para leer datos guardados sin errores
function leerDatos() {
  if (!fs.existsSync(archivoDatos)) {
    return [];
  }
  const texto = fs.readFileSync(archivoDatos, "utf-8");
  if (texto.trim() === "") {
    return [];
  }
  return JSON.parse(texto);
}

// Ruta para enviar los datos a la página
app.get("/api/estudiantes", (req, res) => {
  const datos = leerDatos();
  res.json(datos);
});

// Ruta para recibir nuevos datos y guardarlos
app.post("/api/estudiantes", (req, res) => {
  const estudiantes = leerDatos();
  estudiantes.push(req.body);

  fs.writeFileSync(archivoDatos, JSON.stringify(estudiantes, null, 2));
  res.json({ mensaje: "Guardado con éxito" });
});

app.listen(3000, () => {
  console.log("Servidor listo en http://localhost:3000");
});

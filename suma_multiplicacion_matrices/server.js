import express from "express";
const app = express();
app.use(express.json());
app.use(express.static("public")); // Para servir el HTML
const PORT = 3000;
app.post("/calcular", (req, res) => {
  const { m1, m2, operacion } = req.body;
  let resultado = [];
  const filas = m1.length;
  const cols = m1[0].length;

  for (let i = 0; i < filas; i++) {
    resultado[i] = [];
    for (let j = 0; j < cols; j++) {
      if (operacion === "sumar") {
        resultado[i][j] = m1[i][j] + m2[i][j];
      } else {
        resultado[i][j] = m1[i][j] * m2[i][j];
      }
    }
  }
  res.json({ resultado });
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));

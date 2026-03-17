import * as readline from "node:readline/promises";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
let personas = [];

while (true) {
  let nombre = await rl.question("Ingrese nombre (o 'finalizar' para salir): ");
  if (nombre === "finalizar") break;

  let edad = parseInt(await rl.question("Ingrese edad: "));
  let nota = parseFloat(await rl.question("Ingrese nota: "));

  personas.push([nombre, edad, nota]);
}

rl.close();

console.log("Lista original");
personas.forEach((p) =>
  console.log(`Nombre: ${p[0]}, Edad: ${p[1]}, Nota: ${p[2]}`),
);

console.log("Lista ordenada");
let ordenadas = [...personas].sort((a, b) => b[2] - a[2]);
ordenadas.forEach((p) =>
  console.log(`Nombre: ${p[0]}, Edad: ${p[1]}, Nota: ${p[2]}`),
);

console.log("Promedio");
let suma = personas.reduce((total, p) => total + p[2], 0);
console.log("Promedio general:", suma / personas.length);

const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");

// 1. ESTRUCTURA DE DATOS (Estado de la App)
let estudiantes = [
  [
    "Juan",
    [
      ["Matematicas", 8],
      ["Lengua", 9],
      ["Sociales", 7],
      ["Naturales", 7],
    ],
  ],
  [
    "Ana",
    [
      ["Lengua", 9],
      ["Matematicas", 10],
      ["Sociales", 8],
      ["Naturales", 6],
    ],
  ],
  [
    "Luis",
    [
      ["Lengua", 6],
      ["Sociales", 8],
      ["Matematicas", 7],
      ["Naturales", 6],
    ],
  ],
  [
    "María",
    [
      ["Lengua", 9],
      ["Sociales", 10],
      ["Naturales", 10],
      ["Matematicas", 9],
    ],
  ],
];

//  FUNCIONES AUXILIARES Y DE LÓGICA (Módulos)
// Buscar un alumno por su nombre (Case insensitive)
const encontrarAlumno = (nombre) => {
  return estudiantes.find(
    (alumno) => alumno[0].toLowerCase() === nombre.toLowerCase(),
  );
};

// Bonus: Calcular promedio de un alumno
const calcularPromedio = (materias) => {
  if (materias.length === 0) return 0;
  const suma = materias.reduce((acc, materia) => acc + materia[1], 0);
  return (suma / materias.length).toFixed(2);
};

// Imprimir información de un solo alumno
const imprimirAlumno = (alumno) => {
  const nombre = alumno[0];
  const materias = alumno[1];
  const promedio = calcularPromedio(materias);

  let infoMaterias = materias.map((m) => `${m[0]}: ${m[1]}`).join(", ");
  console.log(
    ` ${nombre} |  Promedio: ${promedio} | Materias: [${infoMaterias}]`,
  );
};

// Mostrar todos los alumnos
const verAlumnos = () => {
  console.log("\n---  LISTA DE ALUMNOS ---");
  if (estudiantes.length === 0) {
    console.log("No hay alumnos registrados.");
    return;
  }
  //  Bonus: Mostrar alumnos ordenados por promedio
  const estudiantesOrdenados = [...estudiantes].sort((a, b) => {
    return calcularPromedio(b[1]) - calcularPromedio(a[1]);
  });

  estudiantesOrdenados.forEach(imprimirAlumno);

  //  Bonus: Mostrar el mejor alumno
  console.log("\n Alumno con mejor promedio:");
  imprimirAlumno(estudiantesOrdenados[0]);
};

// Opción 2: Agregar nuevo alumno
const agregarAlumno = async (rl) => {
  console.log("\n--- AGREGAR ALUMNO ---");
  const nombre = await rl.question("Ingrese el nombre del alumno: ");

  if (encontrarAlumno(nombre)) {
    console.log(` El alumno "${nombre}" ya está registrado.`);
    const respuesta = await rl.question(
      "¿Desea modificar/agregar sus notas? (s/n): ",
    );
    if (respuesta.toLowerCase() === "s") {
      await agregarOModificarNotas(rl, nombre);
    }
    return;
  }

  let materias = [];
  let agregandoMaterias = true;

  while (agregandoMaterias) {
    const materia = await rl.question(
      "Ingrese el nombre de la materia (o deje en blanco para terminar): ",
    );
    if (!materia) {
      agregandoMaterias = false;
      break;
    }
    const notaStr = await rl.question(`Ingrese la nota para ${materia}: `);
    const nota = parseFloat(notaStr);

    if (isNaN(nota) || nota < 0 || nota > 10) {
      console.log(
        "❌ Nota inválida. Debe ser un número entre 0 y 10. Materia no agregada.",
      );
    } else {
      materias.push([materia, nota]);
      console.log(` ${materia} agregada con nota ${nota}.`);
    }
  }

  estudiantes.push([nombre, materias]);
  console.log(` Alumno ${nombre} registrado exitosamente.`);
};

const agregarOModificarNotas = async (rl, nombrePredefinido = null) => {
  console.log("\n--- AGREGAR/MODIFICAR NOTAS ---");
  const nombre =
    nombrePredefinido || (await rl.question("Ingrese el nombre del alumno: "));

  const alumno = encontrarAlumno(nombre);

  if (!alumno) {
    console.log(` El alumno "${nombre}" no existe en el sistema.`);
    return;
  }

  const materiasAlumno = alumno[1];
  const nombreMateria = await rl.question("Ingrese el nombre de la materia: ");

  const indiceMateria = materiasAlumno.findIndex(
    (m) => m[0].toLowerCase() === nombreMateria.toLowerCase(),
  );

  const notaStr = await rl.question(
    `Ingrese la nueva nota para ${nombreMateria}: `,
  );
  const nota = parseFloat(notaStr);

  if (isNaN(nota) || nota < 0 || nota > 10) {
    console.log(" Nota inválida. Operación cancelada.");
    return;
  }

  if (indiceMateria !== -1) {
    materiasAlumno[indiceMateria][1] = nota;
    console.log(
      ` Nota de ${nombreMateria} actualizada a ${nota} para ${alumno[0]}.`,
    );
  } else {
    // La materia no existe, agregar
    materiasAlumno.push([nombreMateria, nota]);
    console.log(
      `Materia ${nombreMateria} agregada con nota ${nota} a ${alumno[0]}.`,
    );
  }
};

// MENÚ INTERACTIVO PRINCIPAL
const iniciarSistema = async () => {
  const rl = readline.createInterface({ input, output });
  let ejecutando = true;

  console.log("=================================");
  console.log("SISTEMA DE GESTIÓN DE NOTAS ");
  console.log("=================================");

  while (ejecutando) {
    console.log("\n MENÚ PRINCIPAL:");
    console.log("1. Ver alumnos (Ordenados por promedio y destacado el mejor)");
    console.log("2. Agregar alumno");
    console.log("3. Agregar o modificar notas");
    console.log("4. Salir");

    const opcion = await rl.question("\nSeleccione una opción (1-4): ");

    switch (opcion) {
      case "1":
        verAlumnos();
        break;
      case "2":
        await agregarAlumno(rl);
        break;
      case "3":
        await agregarOModificarNotas(rl);
        break;
      case "4":
        console.log("Saliendo del sistema. ¡Hasta luego!");
        ejecutando = false;
        break;
      default:
        console.log("Opción no válida. Por favor, intente de nuevo.");
    }
  }

  rl.close();
};

iniciarSistema();

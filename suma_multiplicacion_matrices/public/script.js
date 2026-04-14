function dibujarMatrices() {
  const f = parseInt(document.getElementById("filas").value);
  const c = parseInt(document.getElementById("columnas").value);
  const contenedor = document.getElementById("contenedor-matrices");
  contenedor.innerHTML = "";

  if (!f || !c) return alert("Ingresa filas y columnas válidas");

  for (let i = 1; i <= 2; i++) {
    let div = document.createElement("div");
    div.innerHTML = `<h3>Matriz ${i}</h3>`;
    for (let r = 0; r < f; r++) {
      for (let l = 0; l < c; l++) {
        div.innerHTML += `<input type="number" class="m${i}" data-f="${r}" data-c="${l}" value="0">`;
      }
      div.innerHTML += "<br>";
    }
    contenedor.appendChild(div);
  }
  document.getElementById("controles").style.display = "block";
}

function obtenerMatriz(clase) {
  const f = parseInt(document.getElementById("filas").value);
  const c = parseInt(document.getElementById("columnas").value);
  const inputs = document.querySelectorAll(`.${clase}`);
  let matriz = [];
  let k = 0;

  for (let i = 0; i < f; i++) {
    matriz[i] = [];
    for (let j = 0; j < c; j++) {
      let val = inputs[k].value;
      if (val === "" || isNaN(val)) return null; // Validación
      matriz[i][j] = parseFloat(val);
      k++;
    }
  }
  return matriz;
}

function operar(tipo) {
  const m1 = obtenerMatriz("m1");
  const m2 = obtenerMatriz("m2");
  if (!m1 || !m2) return alert("Carga todos los datos numéricos");

  const f = m1.length;
  const c = m1[0].length;
  let res = [];

  if (tipo === "sumar") {
    for (let i = 0; i < f; i++) {
      res[i] = [];
      for (let j = 0; j < c; j++) {
        res[i][j] = m1[i][j] + m2[i][j];
      }
    }
  } else if (tipo === "multiplicar") {
    // Multiplicación elemento a elemento (rústico) para matrices de igual tamaño
    for (let i = 0; i < f; i++) {
      res[i] = [];
      for (let j = 0; j < c; j++) {
        res[i][j] = m1[i][j] * m2[i][j];
      }
    }
  }
  mostrarResultado(res);
}
// async function operarServidor(tipo) {
//     const m1 = obtenerMatriz('m1');
//     const m2 = obtenerMatriz('m2');

//     const respuesta = await fetch('/calcular', {
//         method: 'POST',
//         headers: {'Content-Type': 'application/json'},
//         body: JSON.stringify({ m1, m2, operacion: tipo })
//     });

//     const data = await respuesta.json();
//     mostrarResultado(data.resultado);
// }
function mostrarResultado(m) {
  let html = "Resultado:<br>";
  m.forEach((fila) => {
    html += fila.join(" | ") + "<br>";
  });
  document.getElementById("resultado").innerHTML = html;
}

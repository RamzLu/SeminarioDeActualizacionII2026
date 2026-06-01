# Tic-Tac-Toe con Redes Neuronales (TensorFlow.js)

Este documento describe la implementación web interactiva del clásico juego Tic-Tac-Toe (Ta-Te-Ti), donde el usuario se enfrenta a un modelo de inteligencia artificial preentrenado. El proyecto demuestra la capacidad de ejecutar modelos de Machine Learning directamente en el cliente (navegador) utilizando **TensorFlow.js**.

La interfaz de usuario está diseñada con un enfoque minimalista y moderno, empleando técnicas de _Glassmorphism_ para la presentación visual.

## Características Principales

- **Inferencia en el Cliente:** El modelo de red neuronal se carga y ejecuta localmente en el navegador del usuario, eliminando la necesidad de realizar peticiones a una API de backend durante el juego.
- **Procesamiento de Tensores:** Conversión del estado del DOM (tablero de juego) a tensores 2D para la predicción de la próxima jugada óptima por parte del modelo.
- **Interfaz de Usuario Reactiva:** Diseño responsivo y fluido desarrollado con Vanilla JavaScript, HTML5 y CSS3 moderno.

## Tecnologías y Herramientas

- **Frontend:** HTML5, CSS3, JavaScript (ES6+).
- **Machine Learning:** TensorFlow.js (`@tensorflow/tfjs`).
- **Arquitectura del Modelo:** Red Neuronal Secuencial preentrenada (exportada en formato JSON de Keras/TensorFlow).

## Requisitos de Ejecución e Instalación

Para garantizar la correcta carga de los pesos del modelo neuronal (`ttt_model.json` y `ttt_model.weights.bin`), el proyecto debe ser servido a través de un servidor web local. Ejecutar el archivo `index.html` directamente desde el sistema de archivos (`file:///`) resultará en un bloqueo por políticas **CORS** (Cross-Origin Resource Sharing).

Se recomienda utilizar **Apache (vía XAMPP/WAMP)**, Nginx, o herramientas de desarrollo como **Live Server** (VS Code).

1. Alojar los archivos en el directorio público del servidor web (ej. `C:\xampp\htdocs\tateti\`).
2. Iniciar el servicio HTTP (Apache).
3. Acceder a la aplicación a través de la ruta local: `http://localhost/tateti/`.

## Estructura del Proyecto

```text
/tateti/
│── index.html                 # Punto de entrada de la aplicación, UI y lógica de inferencia
│── ttt_states.jpg             # Imagen de referencia de estados lógicos
└── model/                     # Directorio de los artefactos del modelo de IA
    │── ttt_model.json         # Topología y configuración de capas del modelo
    └── ttt_model.weights.bin  # Pesos binarios generados durante el entrenamiento
```

### Aclaración sobre las modificaciones de archivos

Nota importante: únicamente se modificó y reescribió el archivo index.html.

Los demás archivos listados en la estructura (los pesos ttt_model.weights.bin, la topología estructural ttt_model.json y la imagen ttt_states.jpg) se mantuvieron completamente intactos respecto a su versión original y no sufrieron ninguna alteración.

### Anexos: Código Fuente de la Solución

A continuación se exponen los archivos principales que componen la lógica y estructura del proyecto. El archivo binario de pesos (ttt_model.weights.bin) se omite por su naturaleza no textual.

### 1. Archivo Principal: `index.html`

Contiene la estructura del DOM, los estilos visuales (CSS) y la lógica de inferencia del juego (JavaScript).

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Ta-Te-Ti vs IA</title>
    <script src="[https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.0.0/dist/tf.min.js](https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.0.0/dist/tf.min.js)"></script>
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: linear-gradient(135deg, #ffdee9 0%, #b5fffc 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #4a4a4a;
        padding: 20px;
      }
      .game-container {
        background: rgba(255, 255, 255, 0.4);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 32px;
        padding: 35px;
        width: 100%;
        max-width: 420px;
        box-shadow: 0 10px 32px 0 rgba(255, 154, 162, 0.25);
        text-align: center;
      }
      h1 {
        font-size: 26px;
        color: #ff6b8b;
        margin-bottom: 8px;
      }
      .status {
        font-size: 16px;
        margin-bottom: 25px;
        font-weight: 600;
        color: #ff85a2;
        min-height: 24px;
      }
      .board {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin-bottom: 30px;
      }
      .cell {
        aspect-ratio: 1;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 44px;
        cursor: pointer;
        transition: all 0.25s ease;
        box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.5);
        user-select: none;
      }
      .cell:hover {
        background: rgba(255, 255, 255, 0.95);
        transform: translateY(-3px);
      }
      .cell.taken {
        cursor: not-allowed;
        transform: none;
        background: rgba(255, 255, 255, 0.5);
      }
      .btn-restart {
        background: #ff85a2;
        color: white;
        border: none;
        padding: 12px 32px;
        font-size: 16px;
        font-weight: bold;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 133, 162, 0.4);
      }
      .btn-restart:hover {
        background: #ff6b8b;
        transform: scale(1.04);
      }
      .loading-overlay {
        font-size: 18px;
        color: #ff6b8b;
        font-weight: bold;
        padding: 20px;
      }
    </style>
  </head>
  <body>
    <div class="game-container">
      <div id="loading" class="loading-overlay">
        Cargando modelo neuronal...
      </div>
      <div id="gameContent" style="display: none;">
        <h1>Ta-Te-Ti vs IA</h1>
        <div class="status" id="statusText">Tu turno: Humano (🎀)</div>
        <div class="board" id="boardGrid"></div>
        <button class="btn-restart" onclick="reiniciarJuego()">
          Reiniciar Partida
        </button>
      </div>
    </div>

    <script>
      let model;
      let board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      let juegoTerminado = false;

      const boardGrid = document.getElementById("boardGrid");
      const statusText = document.getElementById("statusText");
      const loadingDiv = document.getElementById("loading");
      const gameContentDiv = document.getElementById("gameContent");

      function inicializarTableroUI() {
        boardGrid.innerHTML = "";
        for (let i = 0; i < 9; i++) {
          const cell = document.createElement("div");
          cell.classList.add("cell");
          cell.addEventListener("click", () => realizarMovimientoHumano(i));
          boardGrid.appendChild(cell);
        }
      }

      tf.ready().then(async () => {
        try {
          model = await tf.loadLayersModel("model/ttt_model.json");
          loadingDiv.style.display = "none";
          gameContentDiv.style.display = "block";
          inicializarTableroUI();
        } catch (error) {
          loadingDiv.innerText =
            "Error CORS: Ejecute en un servidor web local.";
          console.error(error);
        }
      });

      function refrescarTableroUI() {
        const celdas = document.querySelectorAll(".cell");
        celdas.forEach((cell, idx) => {
          if (board[idx] === -1) {
            cell.innerText = "🎀";
            cell.classList.add("taken");
          } else if (board[idx] === 1) {
            cell.innerText = "🐱";
            cell.classList.add("taken");
          } else {
            cell.innerText = "";
            cell.classList.remove("taken");
          }
        });
      }

      function realizarMovimientoHumano(pos) {
        if (juegoTerminado || board[pos] !== 0 || !model) return;
        board[pos] = -1;
        refrescarTableroUI();
        if (evaluarEstadoJuego(-1, "Victoria Humana detectada.")) return;
        statusText.innerText = "Calculando inferencia de IA...";
        setTimeout(ejecutarTurnoIA, 350);
      }

      function ejecutarTurnoIA() {
        if (juegoTerminado) return;
        tf.tidy(() => {
          const inputTensor = tf.tensor2d([board]);
          const prediction = model.predict(inputTensor);
          const probs = prediction.dataSync();

          let mejorMovimiento = -1,
            maxProb = -Infinity;
          for (let i = 0; i < 9; i++) {
            if (board[i] === 0 && probs[i] > maxProb) {
              maxProb = probs[i];
              mejorMovimiento = i;
            }
          }

          if (mejorMovimiento !== -1) {
            board[mejorMovimiento] = 1;
            refrescarTableroUI();
            if (
              evaluarEstadoJuego(1, "Victoria de la Inteligencia Artificial.")
            )
              return;
            statusText.innerText = "Tu turno: Humano (🎀)";
          }
        });
      }

      function evaluarEstadoJuego(jugador, mensajeVictoria) {
        const lineas = [
          [0, 1, 2],
          [3, 4, 5],
          [6, 7, 8],
          [0, 3, 6],
          [1, 4, 7],
          [2, 5, 8],
          [0, 4, 8],
          [2, 4, 6],
        ];
        const gano = lineas.some(
          (l) =>
            board[l[0]] === jugador &&
            board[l[1]] === jugador &&
            board[l[2]] === jugador,
        );
        if (gano) {
          statusText.innerText = mensajeVictoria;
          juegoTerminado = true;
          return true;
        }
        if (!board.includes(0)) {
          statusText.innerText = "Empate técnico alcanzado.";
          juegoTerminado = true;
          return true;
        }
        return false;
      }

      window.reiniciarJuego = function () {
        board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        juegoTerminado = false;
        statusText.innerText = "Tu turno: Humano (🎀)";
        refrescarTableroUI();
      };
    </script>
  </body>
</html>
```

### 2. Archivo del Modelo: `model/ttt_model.json`:

```json
{
  "modelTopology": {
    "class_name": "Sequential",
    "config": {
      "name": "sequential_6",
      "layers": [
        {
          "class_name": "Dense",
          "config": {
            "units": 64,
            "activation": "relu",
            "use_bias": true,
            "kernel_initializer": {
              "class_name": "VarianceScaling",
              "config": {
                "scale": 1,
                "mode": "fan_avg",
                "distribution": "normal",
                "seed": null
              }
            },
            "bias_initializer": { "class_name": "Zeros", "config": {} },
            "name": "dense_Dense16",
            "trainable": true,
            "batch_input_shape": [null, 9],
            "dtype": "float32"
          }
        },
        {
          "class_name": "Dense",
          "config": {
            "units": 64,
            "activation": "relu",
            "use_bias": true,
            "kernel_initializer": {
              "class_name": "VarianceScaling",
              "config": {
                "scale": 1,
                "mode": "fan_avg",
                "distribution": "normal",
                "seed": null
              }
            },
            "bias_initializer": { "class_name": "Zeros", "config": {} },
            "name": "dense_Dense17",
            "trainable": true
          }
        },
        {
          "class_name": "Dense",
          "config": {
            "units": 9,
            "activation": "softmax",
            "use_bias": true,
            "kernel_initializer": {
              "class_name": "VarianceScaling",
              "config": {
                "scale": 1,
                "mode": "fan_avg",
                "distribution": "normal",
                "seed": null
              }
            },
            "bias_initializer": { "class_name": "Zeros", "config": {} },
            "name": "dense_Dense18",
            "trainable": true
          }
        }
      ]
    },
    "keras_version": "tfjs-layers 1.7.4",
    "backend": "tensor_flow.js"
  },
  "format": "layers-model",
  "generatedBy": "TensorFlow.js tfjs-layers v1.7.4",
  "convertedBy": null,
  "weightsManifest": [
    {
      "paths": ["./ttt_model.weights.bin"],
      "weights": [
        {
          "name": "dense_Dense16/kernel",
          "shape": [9, 64],
          "dtype": "float32"
        },
        { "name": "dense_Dense16/bias", "shape": [64], "dtype": "float32" },
        {
          "name": "dense_Dense17/kernel",
          "shape": [64, 64],
          "dtype": "float32"
        },
        { "name": "dense_Dense17/bias", "shape": [64], "dtype": "float32" },
        {
          "name": "dense_Dense18/kernel",
          "shape": [64, 9],
          "dtype": "float32"
        },
        { "name": "dense_Dense18/bias", "shape": [9], "dtype": "float32" }
      ]
    }
  ]
}
```

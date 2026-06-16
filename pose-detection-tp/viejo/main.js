const videoElement = document.getElementById("input_video");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const terminal = document.getElementById("terminal-log");

// Variables para métricas
let lastFrameTime = performance.now();
let fpsSmoothed = 0;
let frameCount = 0;

// Lista de puntos principales para mostrar en los chips
const KP_NAMES = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

// MediaPipe usa índices fijos del 0 al 32.
// Mapeamos los índices a las regiones corporales para las barras.
const REGION_INDICES = {
  face: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  shoulder: [11, 12],
  elbow: [13, 14],
  wrist: [15, 16],
  hip: [23, 24],
  knee: [25, 26],
  ankle: [27, 28],
};

function log(msg, type = "t-ok") {
  const p = document.createElement("p");
  p.className = type;
  p.textContent = `> ${msg}`;
  terminal.appendChild(p);
  terminal.scrollTop = terminal.scrollHeight;
}

// Inicializar los chips en la UI
function setupChips() {
  const kpList = document.getElementById("kp-list");
  KP_NAMES.forEach((name, i) => {
    const chip = document.createElement("span");
    chip.className = "kp-chip";
    chip.id = `chip-${i}`; // Usaremos el índice para activarlos
    chip.textContent = name.replace(/_/g, " ");
    kpList.appendChild(chip);
  });
}

function updateMetrics(landmarks) {
  // 1. Contar keypoints activos (visibilidad > 0.5)
  // Nota: MediaPipe usa 'visibility' en lugar de 'score'
  let activeCount = 0;
  landmarks.forEach((lm, index) => {
    const isVisible = lm.visibility > 0.5;
    if (isVisible) activeCount++;

    // Si este punto está en nuestros 17 chips principales, actualizar clase
    if (index < 17) {
      const chip = document.getElementById(`chip-${index}`);
      if (chip) chip.classList.toggle("active", isVisible);
    }
  });
  document.getElementById("metric-kp").innerText = activeCount;

  // 2. Actualizar barras de confianza por región
  for (const [region, indices] of Object.entries(REGION_INDICES)) {
    let sumVis = 0;
    indices.forEach((idx) => (sumVis += landmarks[idx].visibility));
    const avgVis = sumVis / indices.length;

    const pct = Math.round(avgVis * 100);
    const bar = document.getElementById(`bar-${region}`);
    const val = document.getElementById(`bv-${region}`);

    if (bar && val) {
      bar.style.width = `${pct}%`;
      bar.style.opacity = pct > 10 ? "1" : "0.3";
      val.innerText = `${pct}%`;
    }
  }
}

// Función principal de dibujo y actualización
function onResults(results) {
  // Calcular FPS
  const now = performance.now();
  const delta = now - lastFrameTime;
  lastFrameTime = now;
  fpsSmoothed = fpsSmoothed * 0.85 + (delta > 0 ? 1000 / delta : 0) * 0.15;

  frameCount++;
  if (frameCount % 5 === 0) {
    const fpsText = Math.round(fpsSmoothed);
    document.getElementById("metric-fps").innerText = fpsText;
    document.getElementById("fps-display").innerText = `${fpsText} FPS`;
  }

  // Dibujo en Canvas
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height,
  );

  if (results.poseLandmarks) {
    document.getElementById("cam-status").innerText = "LIVE · DETECTANDO";
    document.getElementById("cam-status").style.color = "#00e5ff";

    // Llamamos a nuestra función de métricas
    updateMetrics(results.poseLandmarks);

    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: "#00e5ff", // Cian para conectar con el estilo
      lineWidth: 3,
    });

    drawLandmarks(canvasCtx, results.poseLandmarks, {
      color: "#e040fb", // Magenta para los puntos
      lineWidth: 2,
      radius: 4,
    });
  } else {
    document.getElementById("cam-status").innerText = "LIVE · BUSCANDO";
    document.getElementById("cam-status").style.color = "#ff2d78";
  }
  canvasCtx.restore();
}

setupChips();
log("Inicializando MediaPipe Pose...");

const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

pose.onResults(onResults);
pose.initialize().then(() => log("Modelo cargado exitosamente."));

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});

log("Solicitando permisos de cámara...");
camera.start().then(() => log("Cámara activa."));

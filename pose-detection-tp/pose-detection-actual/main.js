/**
 * ============================================================
 * NekoAI Pose — main.js
 * Comparativa: MoveNet (2021) vs PoseNet (2018)
 * ============================================================
 */

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as poseDetection from "@tensorflow-models/pose-detection";

const KEYPOINT_NAMES = [
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

const SKELETON_PAIRS = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [5, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
];

const COLOR_UPPER = "#ff2d78";
const COLOR_LOWER = "#00e5ff";
const COLOR_KP = "#e040fb";

let activeModel = "new";
let moveNetDetector = null;
let poseNetDetector = null; // Reemplazamos bodyPixNet por poseNetDetector
let videoStream = null;
let animFrameId = null;
let isRunning = false;
let lastFrameTime = performance.now();
let frameCount = 0;
let fpsSmoothed = 0;
let modelsReady = { new: false, old: false };

const video = document.getElementById("video");
const canvas = document.getElementById("canvas-overlay");
const ctx = canvas.getContext("2d");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingBar = document.getElementById("loading-bar");
const loadingMsg = document.getElementById("loading-msg");
const terminal = document.getElementById("terminal-log");
const errorToast = document.getElementById("error-toast");
const navToggle = document.getElementById("nav-toggle");
const togglePill = document.getElementById("toggle-pill");
const labelViejo = document.getElementById("label-viejo");
const labelNuevo = document.getElementById("label-nuevo");
const fabSwitch = document.getElementById("fab-switch");
const modelBadge = document.getElementById("model-badge");
const activeModelName = document.getElementById("active-model-name");
const activeModelSub = document.getElementById("active-model-sub");
const activeModelDesc = document.getElementById("active-model-desc");
const metricFps = document.getElementById("metric-fps");
const metricMs = document.getElementById("metric-ms");
const metricKp = document.getElementById("metric-kp");
const fpsDom = document.getElementById("fps-display");
const camStatus = document.getElementById("cam-status");

function log(msg, type = "") {
  const p = document.createElement("p");
  p.className = type ? `t-${type}` : "";
  p.textContent = `> ${msg}`;
  terminal.appendChild(p);
  terminal.scrollTop = terminal.scrollHeight;
}

function showError(msg) {
  errorToast.textContent = msg;
  errorToast.classList.add("show");
  setTimeout(() => errorToast.classList.remove("show"), 5000);
}

function setLoadingProgress(pct, msg) {
  loadingBar.style.width = `${pct}%`;
  if (msg) loadingMsg.textContent = msg;
}

function hideLoading() {
  loadingOverlay.classList.add("hidden");
  setTimeout(() => (loadingOverlay.style.display = "none"), 700);
}

function buildKpList() {
  const container = document.getElementById("kp-list");
  container.innerHTML = "";
  KEYPOINT_NAMES.forEach((name) => {
    const chip = document.createElement("div");
    chip.className = "kp-chip";
    chip.id = `kp-${name}`;
    chip.textContent = name.replace(/_/g, " ");
    container.appendChild(chip);
  });
}

function updateKpChips(keypoints) {
  KEYPOINT_NAMES.forEach((name, i) => {
    const chip = document.getElementById(`kp-${name}`);
    if (!chip) return;
    const kp = keypoints ? keypoints[i] : null;
    const score = kp ? (kp.score ?? 0) : 0;
    chip.classList.toggle("active", score > 0.3);
  });
}

function updateConfidenceBars(keypoints) {
  const groups = {
    face: [0, 1, 2, 3, 4],
    shoulder: [5, 6],
    elbow: [7, 8],
    wrist: [9, 10],
    hip: [11, 12],
    knee: [13, 14],
    ankle: [15, 16],
  };
  Object.entries(groups).forEach(([key, indices]) => {
    const scores = indices.map((i) => keypoints?.[i]?.score ?? 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const pct = Math.round(avg * 100);
    const bar = document.getElementById(`bar-${key}`);
    const val = document.getElementById(`bv-${key}`);
    if (bar) bar.style.width = `${pct}%`;
    if (val) val.textContent = `${pct}%`;
  });
}

function updateMetrics(fps, inferenceMs, kpCount) {
  metricFps.textContent = fps.toFixed(1);
  metricMs.textContent = inferenceMs.toFixed(1);
  metricKp.textContent = kpCount;
  fpsDom.textContent = `${Math.round(fps)} FPS`;
}

function refreshModelInfo() {
  if (activeModel === "new") {
    modelBadge.textContent = "🆕 MoveNet · Lightning";
    activeModelName.textContent = "MoveNet Lightning";
    activeModelSub.textContent = "Pose Detection · 2021";
    activeModelDesc.innerHTML =
      "Regresión directa de 17 keypoints.<br>" +
      "Backbone MobileNetV2 + FPN.<br>" +
      "Súper rápido y liviano (~2 MB).<br>" +
      "Optimizado para fluidez en WebGL.<br>" +
      "🐱 Filtro neko activo.";
  } else {
    modelBadge.textContent = "🕰 PoseNet";
    activeModelName.textContent = "PoseNet Clásico";
    activeModelSub.textContent = "Pose Detection · 2018";
    activeModelDesc.innerHTML =
      "El modelo clásico predecesor.<br>" +
      "Backbone MobileNetV1.<br>" +
      "Menos preciso en movimientos rápidos.<br>" +
      "Mayor latencia por frame.<br>" +
      "🐱 Filtro neko activo.";
  }

  if (activeModel === "new") {
    togglePill.classList.add("right");
    labelViejo.classList.replace("active", "inactive");
    labelNuevo.classList.replace("inactive", "active");
  } else {
    togglePill.classList.remove("right");
    labelNuevo.classList.replace("active", "inactive");
    labelViejo.classList.replace("inactive", "active");
  }
}

async function startCamera() {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user",
      },
      audio: false,
    });
    video.srcObject = videoStream;
    await new Promise((resolve) => (video.onloadedmetadata = resolve));
    await video.play();
    log("Cámara web iniciada correctamente", "ok");
    return true;
  } catch (err) {
    log(`Error de cámara: ${err.message}`, "warn");
    showError(`No se pudo acceder a la cámara: ${err.message}`);
    return false;
  }
}

// ─── CARGADORES DE MODELOS ──────────────────────────────────────────────

async function loadMoveNet() {
  log("Cargando MoveNet Lightning (Nuevo)...");
  setLoadingProgress(30, "Descargando MoveNet (~2MB)...");
  try {
    moveNetDetector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      },
    );
    modelsReady.new = true;
    log("MoveNet listo ✓", "ok");
    return true;
  } catch (err) {
    log(`Error MoveNet: ${err.message}`, "warn");
    return false;
  }
}

async function loadPoseNet() {
  log("Cargando PoseNet (Viejo)...");
  setLoadingProgress(55, "Descargando PoseNet...");
  try {
    // Cargamos PoseNet usando la misma API genérica de detección
    poseNetDetector = await poseDetection.createDetector(
      poseDetection.SupportedModels.PoseNet,
      {
        architecture: "MobileNetV1",
        outputStride: 16,
        multiplier: 0.75,
        // FIX: PoseNet procesa internamente a resolución reducida y NO reescala
        // automáticamente las coordenadas al tamaño del canvas (a diferencia de MoveNet).
        // Sin esto, los keypoints caen todos en ~0-225px (esquina sup-izq) y son invisibles.
        inputResolution: { width: 640, height: 480 },
      },
    );
    modelsReady.old = true;
    log("PoseNet listo ✓", "ok");
    return true;
  } catch (err) {
    log(`Error PoseNet: ${err.message}`, "warn");
    return false;
  }
}

// ─── DIBUJO UNIVERSAL (Sirve para ambos modelos) ─────────────────────────

function drawSkeletonAndFilter(keypoints, threshold = 0.3) {
  if (!keypoints || keypoints.length === 0) return;
  const W = canvas.width;
  const kp = keypoints.map((k) => ({ ...k, x: W - k.x }));

  SKELETON_PAIRS.forEach(([i, j]) => {
    const a = kp[i],
      b = kp[j];
    if (!a || !b) return;
    if ((a.score ?? 0) < threshold || (b.score ?? 0) < threshold) return;

    const isLower = i >= 11 || j >= 11;
    const color = isLower ? COLOR_LOWER : COLOR_UPPER;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  kp.forEach((k, idx) => {
    if ((k.score ?? 0) < threshold) return;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = COLOR_KP;
    ctx.shadowColor = COLOR_KP;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  drawCatFilter(kp);
}

function drawCatFilter(kp) {
  const nose = kp[0];
  const leftEye = kp[1];
  const rightEye = kp[2];

  if ((nose?.score ?? 0) < 0.3) return;
  if ((leftEye?.score ?? 0) < 0.3 || (rightEye?.score ?? 0) < 0.3) return;

  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  const scale = eyeDist * 1.1;
  const midX = (leftEye.x + rightEye.x) / 2;
  const midY = (leftEye.y + rightEye.y) / 2;
  const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  ctx.save();
  ctx.translate(midX, midY - scale * 0.6);
  ctx.rotate(angle);

  function drawEar(offsetX, flip = 1) {
    ctx.save();
    ctx.translate(offsetX, 0);
    ctx.beginPath();
    const h = scale * 0.65;
    const w = scale * 0.5;
    ctx.moveTo(0, 0);
    ctx.lineTo(-w * 0.5 * flip, -h);
    ctx.lineTo(w * 0.5 * flip, -h);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,45,120,0.35)";
    ctx.strokeStyle = "#ff2d78";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#ff2d78";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.15);
    ctx.lineTo(-w * 0.28 * flip, -h * 0.82);
    ctx.lineTo(w * 0.28 * flip, -h * 0.82);
    ctx.closePath();
    ctx.fillStyle = "rgba(224,64,251,0.45)";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawEar(-scale * 0.75, -1);
  drawEar(scale * 0.75, 1);
  ctx.restore();

  if ((nose.score ?? 0) > 0.4) {
    ctx.save();
    ctx.translate(nose.x, nose.y);
    ctx.rotate(angle);

    const whiskerLen = scale * 0.85;
    const whiskerY = scale * 0.12;

    ctx.strokeStyle = "rgba(255,45,120,0.85)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#ff2d78";
    ctx.shadowBlur = 8;

    [-0.1, 0, 0.1].forEach((yOff, i) => {
      const spread = (i - 1) * scale * 0.12;
      ctx.beginPath();
      ctx.moveTo(0, whiskerY + spread);
      ctx.lineTo(-whiskerLen, whiskerY + spread - scale * 0.08 * (i - 1));
      ctx.stroke();
    });
    [-0.1, 0, 0.1].forEach((yOff, i) => {
      const spread = (i - 1) * scale * 0.12;
      ctx.beginPath();
      ctx.moveTo(0, whiskerY + spread);
      ctx.lineTo(whiskerLen, whiskerY + spread - scale * 0.08 * (i - 1));
      ctx.stroke();
    });

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ─── LOOP PRINCIPAL ───────────────────────────────────────────────────

async function runLoop() {
  if (!isRunning) return;
  if (video.readyState < 2) {
    animFrameId = requestAnimationFrame(runLoop);
    return;
  }

  const t0 = performance.now();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let kpCount = 0;
  let inferenceKeypoints = null;

  try {
    // Definimos qué detector usar basándonos en el switch de la UI
    const detector = activeModel === "new" ? moveNetDetector : poseNetDetector;

    if (detector) {
      const poses = await detector.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false,
        // FIX: PoseNet necesita scoreThreshold más bajo que MoveNet (0.3 filtraba todo)
        scoreThreshold: activeModel === "new" ? 0.3 : 0.1,
      });

      if (poses.length > 0) {
        const { keypoints } = poses[0];
        inferenceKeypoints = keypoints;
        const drawThreshold = activeModel === "new" ? 0.3 : 0.15;
        drawSkeletonAndFilter(keypoints, drawThreshold);
        kpCount = keypoints.filter(
          (k) => (k.score ?? 0) > drawThreshold,
        ).length;
      }
    }
  } catch (err) {
    if (!err.message?.includes("disposed")) {
      console.warn("Inference error:", err.message);
    }
  }

  const inferenceMs = performance.now() - t0;
  const now = performance.now();
  const delta = now - lastFrameTime;
  lastFrameTime = now;
  const instantFps = delta > 0 ? 1000 / delta : 0;
  fpsSmoothed = fpsSmoothed * 0.85 + instantFps * 0.15;

  frameCount++;
  if (frameCount % 5 === 0) {
    updateMetrics(fpsSmoothed, inferenceMs, kpCount);

    const kpForUI = inferenceKeypoints
      ? KEYPOINT_NAMES.map((name, i) => {
          const kp = inferenceKeypoints[i];
          return kp ? { score: kp.score ?? 0 } : { score: 0 };
        })
      : null;

    updateKpChips(kpForUI);
    updateConfidenceBars(kpForUI);
  }

  animFrameId = requestAnimationFrame(runLoop);
}

function switchModel() {
  window.location.href = "posenet.html";
}

async function init() {
  log("Inicializando TensorFlow.js...");
  setLoadingProgress(5, "Configurando backend WebGL...");

  await tf.setBackend("webgl");
  await tf.ready();
  const backend = tf.getBackend();
  log(`Backend activo: ${backend}`, "ok");
  setLoadingProgress(15, `Backend: ${backend} ✓`);

  setLoadingProgress(20, "Solicitando acceso a la cámara...");
  const camOk = await startCamera();
  if (!camOk) {
    loadingMsg.textContent =
      "⚠ Sin acceso a la cámara. Recarga y acepta el permiso.";
    return;
  }
  setLoadingProgress(25, "Cámara lista ✓");

  buildKpList();

  const moveNetOk = await loadMoveNet();
  setLoadingProgress(55, "MoveNet listo ✓");

  if (moveNetOk) {
    activeModel = "new";
    refreshModelInfo();
    isRunning = true;
    runLoop();
    hideLoading();
    log("Sistema activo. Ejecutando MoveNet.", "ok");
  }

  setLoadingProgress(65, "Cargando PoseNet en segundo plano...");
  loadPoseNet().then((ok) => {
    if (ok) log("PoseNet disponible. Puedes cambiar de modelo.", "ok");
    if (!moveNetOk && ok) {
      activeModel = "old";
      refreshModelInfo();
      isRunning = true;
      runLoop();
      hideLoading();
    }
  });

  if (!moveNetOk) log("MoveNet falló. Esperando PoseNet...", "warn");
}

navToggle.addEventListener("click", switchModel);
fabSwitch.addEventListener("click", switchModel);

init().catch((err) => {
  console.error("Error fatal en init():", err);
  showError(`Error de inicialización: ${err.message}`);
  loadingMsg.textContent = `Error: ${err.message}`;
});

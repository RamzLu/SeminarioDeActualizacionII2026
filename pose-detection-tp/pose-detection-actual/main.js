/**
 * ============================================================
 * NekoAI Pose — main.js
 * Standalone: MoveNet Lightning (17 Keypoints)
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

let moveNetDetector = null;
let videoStream = null;
let animFrameId = null;
let isRunning = false;
let lastFrameTime = performance.now();
let frameCount = 0;
let fpsSmoothed = 0;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas-overlay");
const ctx = canvas.getContext("2d");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingBar = document.getElementById("loading-bar");
const loadingMsg = document.getElementById("loading-msg");
const terminal = document.getElementById("terminal-log");
const errorToast = document.getElementById("error-toast");
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
  modelBadge.textContent = "🆕 MoveNet · Lightning";
  activeModelName.textContent = "MoveNet Lightning";
  activeModelSub.textContent = "Pose Detection · 2021";
  activeModelDesc.innerHTML =
    "Regresión directa de 17 keypoints.<br>" +
    "Backbone MobileNetV2 + FPN.<br>" +
    "Súper rápido y liviano (~2 MB).<br>" +
    "Optimizado para fluidez en WebGL.";
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

// ─── CARGADOR DE MODELO ──────────────────────────────────────────────

async function loadMoveNet() {
  log("Cargando MoveNet Lightning...");
  setLoadingProgress(40, "Descargando MoveNet (~2MB)...");
  try {
    moveNetDetector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true,
      },
    );
    log("MoveNet listo ✓", "ok");
    return true;
  } catch (err) {
    log(`Error MoveNet: ${err.message}`, "warn");
    return false;
  }
}

// ─── DIBUJO ──────────────────────────────────────────────────────────

function drawSkeleton(keypoints, threshold = 0.3) {
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

  kp.forEach((k) => {
    if ((k.score ?? 0) < threshold) return;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = COLOR_KP;
    ctx.shadowColor = COLOR_KP;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
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
    if (moveNetDetector) {
      const poses = await moveNetDetector.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false,
        scoreThreshold: 0.3,
      });

      if (poses.length > 0) {
        const { keypoints } = poses[0];
        inferenceKeypoints = keypoints;
        drawSkeleton(keypoints, 0.3);
        kpCount = keypoints.filter((k) => (k.score ?? 0) > 0.3).length;
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

async function init() {
  log("Inicializando TensorFlow.js...");
  setLoadingProgress(10, "Configurando backend WebGL...");

  await tf.setBackend("webgl");
  await tf.ready();
  log(`Backend activo: ${tf.getBackend()}`, "ok");

  setLoadingProgress(20, "Solicitando acceso a la cámara...");
  const camOk = await startCamera();
  if (!camOk) {
    loadingMsg.textContent =
      "⚠ Sin acceso a la cámara. Recarga y acepta el permiso.";
    return;
  }

  buildKpList();

  const moveNetOk = await loadMoveNet();
  setLoadingProgress(100, "Iniciando...");

  if (moveNetOk) {
    refreshModelInfo();
    isRunning = true;
    runLoop();
    hideLoading();
    log("Sistema activo. Ejecutando MoveNet.", "ok");
  } else {
    log("MoveNet falló.", "warn");
  }
}

init().catch((err) => {
  console.error("Error fatal en init():", err);
  showError(`Error de inicialización: ${err.message}`);
  loadingMsg.textContent = `Error: ${err.message}`;
});

/**
 * ============================================================
 * NekoAI Pose — posenet.js (PÁGINA 2)
 * Exclusivo para PoseNet (Modelo Viejo)
 *
 * ──────────────────────────────────────────────────────────
 * 🐛 BUG CORREGIDO — Por qué PoseNet detectaba pero no dibujaba
 * ──────────────────────────────────────────────────────────
 *
 * El problema tenía DOS causas:
 *
 * CAUSA 1 — Coordenadas fuera de escala:
 *   PoseNet con outputStride:16 + multiplier:0.75 procesa la imagen
 *   internamente a una resolución reducida (inputResolution). La nueva
 *   API @tensorflow-models/pose-detection NO reescala automáticamente
 *   esas coordenadas al tamaño del canvas (640×480) como sí hace MoveNet.
 *   Resultado: coordenadas válidas pero en rango 0-225px aprox., todas
 *   se dibujaban en la esquina superior izquierda o fuera del canvas.
 *
 *   SOLUCIÓN: declarar explícitamente inputResolution: {width:640, height:480}
 *   en createDetector para forzar que PoseNet escale su salida al
 *   tamaño real del video/canvas.
 *
 * CAUSA 2 — scoreThreshold muy estricto o ausente:
 *   Sin scoreThreshold en estimatePoses, la API de PoseNet filtra
 *   muchos keypoints válidos. Se añade scoreThreshold: 0.1 para que
 *   muestre incluso detecciones de baja confianza.
 *
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

// Tamaño real del canvas y video
const CANVAS_W = 640;
const CANVAS_H = 480;

let poseNetDetector = null;
let videoStream = null;
let animFrameId = null;
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
const navToggle = document.getElementById("nav-toggle");
const fabSwitch = document.getElementById("fab-switch");

function log(msg, type = "") {
  const p = document.createElement("p");
  p.className = type ? `t-${type}` : "";
  p.textContent = `> ${msg}`;
  terminal.appendChild(p);
  terminal.scrollTop = terminal.scrollHeight;
}

function forceUIPoseNet() {
  document.getElementById("model-badge").textContent = "🕰 PoseNet · Clásico";
  document.getElementById("active-model-name").textContent = "PoseNet Clásico";
  document.getElementById("active-model-sub").textContent =
    "Pose Detection · 2018";
  document.getElementById("active-model-desc").innerHTML =
    "Detección por mapas de calor (heatmaps).<br>" +
    "Backbone MobileNetV1 · ~5 MB.<br>" +
    "Usa desplazamiento de offset vectors<br>" +
    "para refinar la posición de cada punto.<br>" +
    "🐱 Filtro neko activo.";

  document.getElementById("toggle-pill").classList.remove("right");
  document
    .getElementById("label-nuevo")
    .classList.replace("active", "inactive");
  document
    .getElementById("label-viejo")
    .classList.replace("inactive", "active");
  document.getElementById("cam-status").textContent = "LIVE · PoseNet";
}

function setupUI() {
  const kpList = document.getElementById("kp-list");
  kpList.innerHTML = "";
  KEYPOINT_NAMES.forEach((name) => {
    const chip = document.createElement("span");
    chip.className = "kp-chip";
    chip.id = `kp-${name}`;
    chip.textContent = name.replace(/_/g, " ");
    kpList.appendChild(chip);
  });
}

async function startCamera() {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: CANVAS_W },
        height: { ideal: CANVAS_H },
        facingMode: "user",
      },
      audio: false,
    });
    video.srcObject = videoStream;
    await new Promise((resolve) => (video.onloadedmetadata = resolve));
    await video.play();
    log("Cámara web iniciada", "ok");
    return true;
  } catch (err) {
    log(`Error de cámara: ${err.message}`, "warn");
    return false;
  }
}

async function loadPoseNet() {
  log("Descargando PoseNet (Viejo)...");
  loadingBar.style.width = "50%";
  loadingMsg.textContent = "Cargando PoseNet MobileNetV1...";
  try {
    poseNetDetector = await poseDetection.createDetector(
      poseDetection.SupportedModels.PoseNet,
      {
        architecture: "MobileNetV1",
        outputStride: 16,
        multiplier: 0.75,
        // ✅ FIX CAUSA 1: inputResolution igual al canvas
        // Esto le indica a PoseNet que debe escalar su salida
        // de keypoints al espacio de coordenadas 640×480,
        // en lugar de dejarlas en el espacio interno reducido.
        inputResolution: { width: CANVAS_W, height: CANVAS_H },
      },
    );
    log("PoseNet listo ✓ (MobileNetV1, stride=16, 640×480)", "ok");
    return true;
  } catch (err) {
    log(`Error PoseNet: ${err.message}`, "warn");
    console.error(err);
    return false;
  }
}

// ─── DIBUJO ────────────────────────────────────────────────────────────────────

function drawSkeletonAndFilter(keypoints) {
  if (!keypoints || keypoints.length === 0) return;

  // Espejear X para coincidir con el video (que tiene transform: scaleX(-1) en CSS)
  const kp = keypoints.map((k) => ({ ...k, x: CANVAS_W - k.x }));

  // ── Líneas del esqueleto ──────────────────────────────────────────
  SKELETON_PAIRS.forEach(([i, j]) => {
    const a = kp[i],
      b = kp[j];
    if (!a || !b) return;
    // ✅ FIX CAUSA 2: umbral bajo (0.15) para PoseNet que es menos confiado
    if ((a.score ?? 0) < 0.15 || (b.score ?? 0) < 0.15) return;

    const color = i >= 11 || j >= 11 ? COLOR_LOWER : COLOR_UPPER;
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

  // ── Puntos (keypoints) ────────────────────────────────────────────
  kp.forEach((k) => {
    if ((k.score ?? 0) < 0.15) return;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = COLOR_KP;
    ctx.shadowColor = COLOR_KP;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // ── Filtro de Gato 🐱 ────────────────────────────────────────────
  drawCatFilter(kp);
}

function drawCatFilter(kp) {
  const nose = kp[0];
  const leftEye = kp[1];
  const rightEye = kp[2];

  if ((nose?.score ?? 0) < 0.15) return;
  if ((leftEye?.score ?? 0) < 0.15 || (rightEye?.score ?? 0) < 0.15) return;

  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  if (eyeDist < 5) return; // evitar dibujo si los ojos están demasiado juntos

  const scale = eyeDist * 1.1;
  const midX = (leftEye.x + rightEye.x) / 2;
  const midY = (leftEye.y + rightEye.y) / 2;
  // Nota: en posenet.js el ángulo se calcula con leftEye-rightEye (izq→der)
  // que es el orden natural para obtener el ángulo correcto de la cabeza
  const angle = Math.atan2(leftEye.y - rightEye.y, leftEye.x - rightEye.x);

  // ── Orejas de gato ───────────────────────────────────────────────
  ctx.save();
  ctx.translate(midX, midY - scale * 0.6);
  ctx.rotate(angle);

  function drawEar(offsetX, flip = 1) {
    ctx.save();
    ctx.translate(offsetX, 0);
    ctx.beginPath();
    const h = scale * 0.65,
      w = scale * 0.5;
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
    // Interior fucsia
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

  drawEar(-scale * 0.75, -1); // oreja izquierda
  drawEar(scale * 0.75, 1); // oreja derecha
  ctx.restore();

  // ── Bigotes ──────────────────────────────────────────────────────
  if ((nose.score ?? 0) > 0.15) {
    ctx.save();
    ctx.translate(nose.x, nose.y);
    ctx.rotate(angle);

    const whiskerLen = scale * 0.85;
    const whiskerY = scale * 0.12;

    ctx.strokeStyle = "rgba(255,45,120,0.85)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#ff2d78";
    ctx.shadowBlur = 8;

    [-0.1, 0, 0.1].forEach((_, i) => {
      const spread = (i - 1) * scale * 0.12;
      // Bigotes izquierdos
      ctx.beginPath();
      ctx.moveTo(0, whiskerY + spread);
      ctx.lineTo(-whiskerLen, whiskerY + spread - scale * 0.08 * (i - 1));
      ctx.stroke();
      // Bigotes derechos
      ctx.beginPath();
      ctx.moveTo(0, whiskerY + spread);
      ctx.lineTo(whiskerLen, whiskerY + spread - scale * 0.08 * (i - 1));
      ctx.stroke();
    });

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ─── LOOP PRINCIPAL ────────────────────────────────────────────────────────────

async function runLoop() {
  if (video.readyState < 2) {
    animFrameId = requestAnimationFrame(runLoop);
    return;
  }

  const t0 = performance.now();
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  let kpCount = 0;

  try {
    if (poseNetDetector) {
      // ✅ FIX CAUSA 2: scoreThreshold explícito y bajo para PoseNet
      const poses = await poseNetDetector.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false,
        scoreThreshold: 0.1, // PoseNet necesita umbral más bajo que MoveNet
      });

      if (poses.length > 0) {
        const { keypoints } = poses[0];
        drawSkeletonAndFilter(keypoints);
        updateConfidenceBars(keypoints);
        kpCount = keypoints.filter((k) => (k.score ?? 0) > 0.15).length;

        document.getElementById("metric-kp").textContent = kpCount;
        KEYPOINT_NAMES.forEach((name, i) => {
          const chip = document.getElementById(`kp-${name}`);
          if (chip)
            chip.classList.toggle("active", (keypoints[i]?.score ?? 0) > 0.15);
        });
      }
    }
  } catch (err) {
    if (!err.message?.includes("disposed")) {
      console.warn("PoseNet inference error:", err.message);
    }
  }

  // ── Métricas ──────────────────────────────────────────────────────
  const inferenceMs = performance.now() - t0;
  const now = performance.now();
  const delta = now - lastFrameTime;
  lastFrameTime = now;
  fpsSmoothed = fpsSmoothed * 0.85 + (delta > 0 ? 1000 / delta : 0) * 0.15;

  frameCount++;
  if (frameCount % 5 === 0) {
    document.getElementById("metric-fps").textContent = fpsSmoothed.toFixed(1);
    document.getElementById("metric-ms").textContent = inferenceMs.toFixed(1);
    document.getElementById("fps-display").textContent =
      `${Math.round(fpsSmoothed)} FPS`;
  }

  animFrameId = requestAnimationFrame(runLoop);
}

// ─── BARRAS DE CONFIANZA ───────────────────────────────────────────────────────

function updateConfidenceBars(keypoints) {
  // PoseNet devuelve {x, y, score, name} — igual que MoveNet con la nueva API
  const getAvgScore = (names) => {
    const pts = keypoints.filter((k) => names.includes(k.name));
    if (pts.length === 0) return 0;
    return pts.reduce((sum, k) => sum + (k.score || 0), 0) / pts.length;
  };

  const regions = {
    face: ["nose", "left_eye", "right_eye", "left_ear", "right_ear"],
    shoulder: ["left_shoulder", "right_shoulder"],
    elbow: ["left_elbow", "right_elbow"],
    wrist: ["left_wrist", "right_wrist"],
    hip: ["left_hip", "right_hip"],
    knee: ["left_knee", "right_knee"],
    ankle: ["left_ankle", "right_ankle"],
  };

  for (const [id, names] of Object.entries(regions)) {
    const pct = Math.round(getAvgScore(names) * 100);
    const bar = document.getElementById(`bar-${id}`);
    const val = document.getElementById(`bv-${id}`);
    if (bar) {
      bar.style.width = `${pct}%`;
      bar.style.opacity = pct > 10 ? "1" : "0.3";
    }
    if (val) val.textContent = `${pct}%`;
  }
}

// ─── NAVEGACIÓN ────────────────────────────────────────────────────────────────

function switchToMoveNet() {
  window.location.href = "index.html";
}
navToggle.addEventListener("click", switchToMoveNet);
fabSwitch.addEventListener("click", switchToMoveNet);

// ─── INICIALIZACIÓN ────────────────────────────────────────────────────────────

async function init() {
  forceUIPoseNet();
  setupUI();
  log("Iniciando TensorFlow.js...");

  await tf.setBackend("webgl");
  await tf.ready();
  log(`Backend: ${tf.getBackend()} ✓`, "ok");

  const camOk = await startCamera();
  if (!camOk) {
    loadingMsg.textContent = "⚠ Sin cámara. Recarga y acepta el permiso.";
    return;
  }

  const ok = await loadPoseNet();
  if (ok) {
    loadingOverlay.classList.add("hidden");
    setTimeout(() => (loadingOverlay.style.display = "none"), 700);
    log("Sistema activo. Ejecutando PoseNet. 🐾", "ok");
    runLoop();
  } else {
    loadingMsg.textContent = "⚠ Error al cargar PoseNet. Ver consola.";
  }
}

init();

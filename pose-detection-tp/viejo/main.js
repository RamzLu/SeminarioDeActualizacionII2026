const videoElement = document.getElementById("input_video");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const statusText = document.getElementById("status");

// 1. Función que dibuja los resultados en el canvas
function onResults(results) {
  statusText.innerText = "¡Modelo activo y detectando!";
  statusText.style.color = "#a8e6cf"; // Cambia a verde menta cuando funciona

  canvasCtx.save();
  // Limpiamos el canvas antes de dibujar el nuevo frame
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Dibujamos el video de tu cámara como fondo
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height,
  );

  // Si el modelo detecta un cuerpo, dibujamos el esqueleto
  if (results.poseLandmarks) {
    // Dibuja las líneas que conectan las articulaciones
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: "#ffb6c1",
      lineWidth: 4,
    });

    // Dibuja los puntos exactos de las articulaciones
    drawLandmarks(canvasCtx, results.poseLandmarks, {
      color: "#ff69b4",
      lineWidth: 2,
      radius: 5,
    });
  }
  canvasCtx.restore();
}

// 2. Inicializamos el modelo MediaPipe Pose
const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  },
});

pose.setOptions({
  modelComplexity: 1, // Balance perfecto entre velocidad y precisión
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

// Le decimos qué hacer cuando tenga resultados
pose.onResults(onResults);

// 3. Encendemos la cámara y le pasamos los frames al modelo
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});

camera.start();

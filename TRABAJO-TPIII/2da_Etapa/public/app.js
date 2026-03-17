const form = document.getElementById("dataForm");
const dataList = document.getElementById("dataList");

// Cargar los datos apenas se abre la página
document.addEventListener("DOMContentLoaded", loadData);

// Acción al presionar el botón de guardar
form.addEventListener("submit", async function (event) {
  event.preventDefault(); // Evita que la página se recargue

  const studentInfo = {
    name: document.getElementById("name").value,
    age: document.getElementById("age").value,
    grades: document.getElementById("grades").value,
  };

  // Enviar la información al servidor
  await fetch("/api/estudiantes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(studentInfo),
  });

  // Mostrar el nuevo registro en pantalla y limpiar el formulario
  displayRecord(studentInfo);
  form.reset();
});

// Pedir los datos al servidor para mostrarlos
async function loadData() {
  const respuesta = await fetch("/api/estudiantes");
  const records = await respuesta.json();

  dataList.innerHTML = ""; // Limpiar la lista antes de mostrar todo
  records.forEach(function (record) {
    displayRecord(record);
  });
}

// Crear la tarjeta visual en la pantalla
function displayRecord(studentInfo) {
  const card = document.createElement("div");
  card.className = "record-card";
  card.innerHTML = `
        <p><strong>Nombre:</strong> ${studentInfo.name}</p>
        <p><strong>Edad:</strong> ${studentInfo.age}</p>
        <p><strong>Notas:</strong> ${studentInfo.grades}</p>
    `;
  dataList.appendChild(card);
}

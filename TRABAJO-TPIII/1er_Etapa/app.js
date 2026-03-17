const form = document.getElementById("dataForm");
const dataList = document.getElementById("dataList");

document.addEventListener("DOMContentLoaded", loadData);

form.addEventListener("submit", function (event) {
  event.preventDefault();
  const name = document.getElementById("name").value;
  const age = document.getElementById("age").value;
  const grades = document.getElementById("grades").value;

  const studentInfo = {
    name: name,
    age: age,
    grades: grades,
  };

  saveToStorage(studentInfo);
  displayRecord(studentInfo);

  form.reset();
});

function saveToStorage(studentInfo) {
  let records = getStorageRecords();
  records.push(studentInfo);
  localStorage.setItem("studentRecords", JSON.stringify(records));
}

function getStorageRecords() {
  let records = localStorage.getItem("studentRecords");
  if (records === null) {
    return [];
  } else {
    return JSON.parse(records);
  }
}

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

function loadData() {
  let records = getStorageRecords();
  records.forEach(function (record) {
    displayRecord(record);
  });
}

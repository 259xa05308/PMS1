const STORAGE_PATIENTS = "smartPMS.v2.patients";
const STORAGE_LOGS = "smartPMS.v2.logs";
let patients = readStore(STORAGE_PATIENTS, []);
let logs = readStore(STORAGE_LOGS, []);
let pendingForm = null;

function readStore(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : fallback; }
  catch { return fallback; }
}
function persist() {
  localStorage.setItem(STORAGE_PATIENTS, JSON.stringify(patients));
  localStorage.setItem(STORAGE_LOGS, JSON.stringify(logs));
  renderDashboard();
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function uidNorm(value) { return String(value || "").trim().replace(/\s+/g, "").toUpperCase(); }
function makeId() {
  let id;
  do { id = "P" + Date.now().toString().slice(-9) + Math.floor(10 + Math.random() * 90); }
  while (patients.some(p => p.id === id));
  return id;
}
function logAction(action, patientId = "", details = "") {
  logs.unshift({time: new Date().toLocaleString(), action, patientId, details});
  logs = logs.slice(0, 300);
  persist();
}
function toast(message, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = message; el.className = "toast" + (type === "error" ? " error" : "");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.classList.add("hidden"), 4000);
}
function go(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.add("hidden"));
  document.getElementById("page-" + page).classList.remove("hidden");
  document.querySelectorAll(".nav").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  const titles = {dashboard:"Dashboard",patients:"Patient Records",register:"Register Patient",rfid:"RFID Lookup",recovery:"Lost Card Recovery",logs:"Activity Logs"};
  document.getElementById("pageTitle").textContent = titles[page] || "Smart PMS";
  if (page === "patients") renderPatients();
  if (page === "logs") renderLogs();
  renderDashboard();
  window.scrollTo({top:0, behavior:"smooth"});
}
document.querySelectorAll("[data-page]").forEach(el => el.addEventListener("click", () => go(el.dataset.page)));
document.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", () => go(el.dataset.go)));

function renderDashboard() {
  document.getElementById("statPatients").textContent = patients.length;
  document.getElementById("statCards").textContent = patients.filter(p => p.uid && p.cardActive).length;
  document.getElementById("statDuplicates").textContent = logs.filter(l => l.action === "Possible duplicate reviewed").length;
  document.getElementById("statLogs").textContent = logs.length;
  const recent = logs.slice(0, 6);
  document.getElementById("recentLogs").innerHTML = recent.length ? tableHTML(
    ["Time","Action","Patient ID","Details"],
    recent.map(l => [l.time,l.action,l.patientId || "—",l.details || "—"])
  ) : emptyHTML("No activity yet. Register a demo patient to get started.");
}
function tableHTML(headers, rows) {
  return '<div class="table-wrap"><table><thead><tr>' + headers.map(h => `<th>${esc(h)}</th>`).join("") +
    '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map(cell => `<td>${cell}</td>`).join("") + '</tr>').join("") +
    '</tbody></table></div>';
}
function emptyHTML(message) { return `<div class="empty">${esc(message)}</div>`; }
function patientRows(list) {
  if (!list.length) return emptyHTML("No patient records found.");
  return tableHTML(["Patient ID","Patient","Age","Phone","RFID status","Action"], list.map(p => [
    `<span class="id-text">${esc(p.id)}</span>`, esc(p.name), esc(p.age || "—"), esc(p.phone || "—"),
    p.cardActive && p.uid ? '<span class="tag active">Active card</span>' : '<span class="tag inactive">No active card</span>',
    `<button class="table-action" data-view="${esc(p.id)}">View record</button>`
  ]));
}
function renderPatients() {
  const q = (document.getElementById("patientSearch").value || "").trim().toLowerCase();
  const list = patients.filter(p => [p.id,p.name,p.phone].some(v => String(v || "").toLowerCase().includes(q)));
  document.getElementById("patientTable").innerHTML = patientRows(list);
}
document.getElementById("patientSearch").addEventListener("input", renderPatients);
document.getElementById("clearSearch").addEventListener("click", () => { document.getElementById("patientSearch").value = ""; renderPatients(); });
document.addEventListener("click", e => {
  const button = e.target.closest("[data-view]");
  if (button) openPatient(button.dataset.view);
});

function collectForm() {
  const name = document.getElementById("fullName").value.trim();
  const ageText = document.getElementById("age").value.trim();
  const age = ageText === "" ? "" : Number(ageText);
  return {
    name, age, phone:document.getElementById("phone").value.trim(),
    dob:document.getElementById("dob").value, uid:uidNorm(document.getElementById("uid").value),
    notes:document.getElementById("notes").value.trim()
  };
}
function findDuplicates(data) {
  return patients.filter(p =>
    (data.phone && p.phone && data.phone === p.phone) ||
    (data.dob && p.dob && data.dob === p.dob) ||
    (data.name && p.name.toLowerCase() === data.name.toLowerCase())
  );
}
document.getElementById("patientForm").addEventListener("submit", e => {
  e.preventDefault();
  const data = collectForm();
  const box = document.getElementById("duplicateBox");
  box.innerHTML = "";
  if (!data.name) return toast("Patient name is required.", "error");
  if (data.age !== "" && (!Number.isInteger(data.age) || data.age < 0 || data.age > 130)) return toast("Enter a valid age from 0 to 130.", "error");
  if (data.uid && patients.some(p => p.uid === data.uid && p.cardActive)) return toast("This UID is already assigned to an active card.", "error");
  const duplicates = findDuplicates(data);
  if (duplicates.length && !pendingForm) {
    pendingForm = data;
    box.innerHTML = '<div class="notice"><b>Possible duplicate detected.</b><p>Review these records. Matching details are only a warning, not proof that the person is the same.</p>' +
      duplicates.map(p => `<div>• <b>${esc(p.id)}</b> — ${esc(p.name)} · Phone: ${esc(p.phone || "—")}</div>`).join("") +
      '<div class="dialog-actions"><button type="button" class="primary" id="confirmSeparate">Create separate record anyway</button><button type="button" class="secondary" id="cancelSeparate">Cancel</button></div></div>';
    logAction("Possible duplicate reviewed", "", `${duplicates.length} possible match(es) found during registration`);
    document.getElementById("confirmSeparate").addEventListener("click", () => savePatient(pendingForm));
    document.getElementById("cancelSeparate").addEventListener("click", () => { pendingForm = null; box.innerHTML = ""; });
    return;
  }
  savePatient(data);
});
function savePatient(data) {
  if (!data) return;
  const patient = {...data, id:makeId(), cardActive:!!data.uid, createdAt:new Date().toLocaleString()};
  patients.unshift(patient);
  pendingForm = null;
  document.getElementById("patientForm").reset();
  document.getElementById("duplicateBox").innerHTML = "";
  persist();
  logAction("Patient registered", patient.id, "Patient record created");
  toast(`Patient registered successfully. ID: ${patient.id}`);
  go("patients");
}
document.getElementById("resetForm").addEventListener("click", () => {
  document.getElementById("patientForm").reset(); pendingForm = null;
  document.getElementById("duplicateBox").innerHTML = "";
});

document.getElementById("rfidForm").addEventListener("submit", e => {
  e.preventDefault();
  const uid = uidNorm(document.getElementById("scanUID").value);
  const p = patients.find(p => p.uid === uid && p.cardActive);
  const result = document.getElementById("rfidResult");
  if (p) {
    result.innerHTML = `<div class="notice"><b>Active card match found</b><p>Patient ID: ${esc(p.id)}<br>Patient name: ${esc(p.name)}</p><button class="primary" data-view="${esc(p.id)}">Review record</button></div>`;
    logAction("RFID lookup success", p.id, "Manual UID simulation");
  } else {
    result.innerHTML = '<div class="notice"><b>No active match found</b><p>Use Lost Card Recovery to search for the existing patient record.</p></div>';
    logAction("RFID lookup failed", "", "Unknown or inactive UID entered");
  }
});
document.getElementById("recoveryForm").addEventListener("submit", e => {
  e.preventDefault();
  const q = document.getElementById("recoveryQuery").value.trim().toLowerCase();
  const matches = patients.filter(p => p.id.toLowerCase() === q ||
    (p.phone && p.phone.toLowerCase() === q) || p.name.toLowerCase().includes(q));
  const result = document.getElementById("recoveryResult");
  result.innerHTML = matches.length ? '<div class="notice"><b>Possible records found</b><p>Verify identity through an approved process before accessing or changing a record.</p></div>' + patientRows(matches) : '<div class="notice">No matching record found. Check the search details.</div>';
  logAction("Lost-card recovery search", "", `Search submitted; ${matches.length} possible match(es)`);
});
function openPatient(id) {
  const p = patients.find(x => x.id === id); if (!p) return;
  logAction("Patient record viewed", p.id, "Record opened in demo UI");
  document.getElementById("dialogContent").innerHTML = `
    <div class="detail-row">
      <div class="detail-item"><small>Patient ID</small><b>${esc(p.id)}</b></div>
      <div class="detail-item"><small>Full name</small><b>${esc(p.name)}</b></div>
      <div class="detail-item"><small>Age</small><b>${esc(p.age || "—")}</b></div>
      <div class="detail-item"><small>Phone</small><b>${esc(p.phone || "—")}</b></div>
      <div class="detail-item"><small>Date of birth</small><b>${esc(p.dob || "—")}</b></div>
      <div class="detail-item"><small>RFID UID</small><b>${esc(p.cardActive ? p.uid : "No active card")}</b></div>
    </div>
    <p><b>Notes</b><br>${esc(p.notes || "No notes recorded.")}</p>
    <p class="small-muted">Created: ${esc(p.createdAt || "—")}</p>
    <div class="dialog-actions"><button class="primary" id="replaceCard">Replace / assign card</button><button class="secondary" id="closeDialog2">Close</button></div>`;
  const dialog = document.getElementById("patientDialog");
  dialog.showModal();
  document.getElementById("closeDialog2").addEventListener("click", () => dialog.close());
  document.getElementById("replaceCard").addEventListener("click", () => replaceCard(p.id));
}
function replaceCard(id) {
  const p = patients.find(x => x.id === id); if (!p) return;
  const verified = confirm("For this demo: have you verified the patient's identity using an approved process?");
  if (!verified) return;
  const newUid = uidNorm(prompt("Enter the new RFID UID:") || "");
  if (!newUid) return;
  if (patients.some(other => other.id !== id && other.cardActive && other.uid === newUid)) {
    toast("That UID is already assigned to another active patient.", "error"); return;
  }
  const oldUid = p.uid;
  p.uid = newUid; p.cardActive = true;
  persist();
  logAction("RFID card assigned/replaced", p.id, `${oldUid ? "Previous card deactivated; " : ""}new UID assigned`);
  document.getElementById("patientDialog").close();
  toast("Card UID updated for this patient.");
  renderPatients();
}
function renderLogs() {
  document.getElementById("logsTable").innerHTML = logs.length ? tableHTML(
    ["Time","Action","Patient ID","Details"],
    logs.map(l => [esc(l.time),esc(l.action),esc(l.patientId || "—"),esc(l.details || "—")])
  ) : emptyHTML("No activity logged yet.");
}
document.getElementById("closeDialog").addEventListener("click", () => document.getElementById("patientDialog").close());
document.getElementById("exportLogs").addEventListener("click", () => {
  const rows = [["Time","Action","Patient ID","Details"], ...logs.map(l => [l.time,l.action,l.patientId,l.details])];
  const csv = rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = "smart-pms-activity-logs.csv"; a.click(); URL.revokeObjectURL(url);
});
renderDashboard();

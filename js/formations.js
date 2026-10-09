/* ==========================================================
   formations.js – Gestionnaire de tactique
   Chaque formation correspond à une classe CSS .formation-XXX
   (définie dans css/pitch.css). Changer de formation = changer
   la classe du terrain. Les joueurs restent dans leur zone de
   dépôt (même numéro de slot) : ils ne disparaissent donc jamais.
   ========================================================== */

// "lines" = nombre de joueurs par ligne, de la défense vers l'attaque (hors gardien)
const FORMATIONS = {
  "433":  { label: "4-3-3",   lines: [4, 3, 3] },
  "442":  { label: "4-4-2",   lines: [4, 4, 2] },
  "4231": { label: "4-2-3-1", lines: [4, 2, 3, 1] },
  "451":  { label: "4-5-1",   lines: [4, 5, 1] },
  "352":  { label: "3-5-2",   lines: [3, 5, 2] },
  "343":  { label: "3-4-3",   lines: [3, 4, 3] },
  "532":  { label: "5-3-2",   lines: [5, 3, 2] }
};

const DEFAULT_FORMATION = "433";
let currentFormation = DEFAULT_FORMATION;

/** "4-3-3" -> "433" */
function formationCodeFromLabel(label) {
  return String(label || "").replace(/\D/g, "");
}

/** Applique une formation au terrain. Retourne false si le code est inconnu. */
function setFormation(code) {
  if (!FORMATIONS[code]) return false;

  const pitch = document.getElementById("pitch");
  Object.keys(FORMATIONS).forEach(function (c) {
    pitch.classList.remove("formation-" + c);
  });
  pitch.classList.add("formation-" + code);

  currentFormation = code;

  const select = document.getElementById("formation-select");
  if (select) select.value = code;

  return true;
}

function getFormation() {
  return currentFormation;
}

/** Remplit le menu déroulant et écoute ses changements. */
function initFormations() {
  const select = document.getElementById("formation-select");

  Object.keys(FORMATIONS).forEach(function (code) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = FORMATIONS[code].label;
    select.appendChild(opt);
  });

  select.addEventListener("change", function () {
    setFormation(select.value);
    showToast("Formation : " + FORMATIONS[select.value].label);
  });

  setFormation(DEFAULT_FORMATION);
}

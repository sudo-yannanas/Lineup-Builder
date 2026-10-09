/* ==========================================================
   storage.js – Sauvegarde locale (3 slots) et partage par URL
   Format d'une composition :
     { t: "433", j: [id gardien, id, id, ... ] (11 valeurs, 0 = vide), c: id capitaine }
   ========================================================== */

const SLOT_COUNT = 3;
const STORAGE_PREFIX = "lineup-builder-slot-";

/** Lit le terrain et retourne l'état actuel de la composition. */
function getPitchState() {
  const joueurs = Array.prototype.map.call(
    document.querySelectorAll("#pitch .dz"),
    function (dz) {
      const card = dz.querySelector(".player");
      return card ? Number(card.dataset.id) : 0;
    }
  );
  return { t: getFormation(), j: joueurs, c: getCaptainId() };
}

/** Vide le terrain puis place les joueurs selon l'état fourni. */
function applyState(state) {
  if (!state || typeof state !== "object") return false;

  const code = formationCodeFromLabel(state.t);
  clearPitch();
  setFormation(FORMATIONS[code] ? code : DEFAULT_FORMATION);

  const zones = document.querySelectorAll("#pitch .dz");
  (state.j || []).slice(0, zones.length).forEach(function (id, i) {
    const card = App.cards.get(Number(id));
    // On ignore les ids inconnus et les doublons
    if (card && !card.closest(".dz")) moveCard(card, zones[i]);
  });

  const captain = App.cards.get(Number(state.c));
  if (captain && captain.closest(".dz")) captain.classList.add("is-captain");

  onLineupChange();
  return true;
}

/* ---------- Sauvegarde locale ---------- */

function saveToLocal(slot) {
  try {
    const data = getPitchState();
    data.date = new Date().toISOString();
    localStorage.setItem(STORAGE_PREFIX + slot, JSON.stringify(data));
    refreshSlotButtons();
    showToast("Composition sauvegardée dans le slot " + slot + " ✅");
  } catch (err) {
    showToast("Sauvegarde impossible (stockage local indisponible).");
  }
}

function loadFromLocal(slot) {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_PREFIX + slot);
  } catch (err) {
    showToast("Stockage local indisponible.");
    return;
  }

  if (!raw) {
    showToast("Le slot " + slot + " est vide.");
    return;
  }

  try {
    applyState(JSON.parse(raw));
    showToast("Slot " + slot + " chargé 📂");
  } catch (err) {
    showToast("Sauvegarde du slot " + slot + " illisible.");
  }
}

/** Met en évidence les slots qui contiennent une sauvegarde. */
function refreshSlotButtons() {
  document.querySelectorAll(".slot").forEach(function (el) {
    let filled = false;
    try {
      filled = !!localStorage.getItem(STORAGE_PREFIX + el.dataset.slot);
    } catch (err) { /* ignoré */ }
    el.classList.toggle("filled", filled);
  });
}

/* ---------- Partage par lien ---------- */

/** Construit le lien ?t=433&j=1,4,5...&c=10 et le copie dans le presse-papier. */
function generateShareUrl() {
  const state = getPitchState();
  const base = location.href.split("#")[0].split("?")[0];
  const url = base + "?t=" + state.t + "&j=" + state.j.join(",") + "&c=" + state.c;

  const done = function () { showToast("Lien copié dans le presse-papier 🔗"); };
  const fallback = function () { window.prompt("Copiez ce lien :", url); };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(done, fallback);
  } else {
    fallback();
  }
  return url;
}

/** Au chargement : applique la composition contenue dans l'URL, s'il y en a une. */
function parseUrlParams() {
  const params = new URLSearchParams(location.search);
  if (!params.has("t")) return false;

  const joueurs = (params.get("j") || "")
    .split(",")
    .map(function (n) { return parseInt(n, 10) || 0; })
    .slice(0, 11);

  return applyState({
    t: params.get("t"),
    j: joueurs,
    c: parseInt(params.get("c"), 10) || 0
  });
}

/** Branche les boutons de l'en-tête. */
function initStorage() {
  document.querySelectorAll(".slot [data-action]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const slot = Number(btn.dataset.slot);
      if (btn.dataset.action === "save") saveToLocal(slot);
      else loadFromLocal(slot);
    });
  });

  document.getElementById("share-btn").addEventListener("click", generateShareUrl);
  refreshSlotButtons();
}

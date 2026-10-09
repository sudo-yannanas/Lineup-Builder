/* ==========================================================
   storage.js – Sauvegarde locale (3 slots) et partage par URL
   Format d'une composition :
     { 
       t: "433", 
       j: [id gardien, id, id, ... ] (11 valeurs, 0 = vide), 
       c: id capitaine,
       r: [id remplaçant, id, ... ],
       tp: [{id, nom, poste}, ...] (Joueurs temporaires)
     }
   ========================================================== */

const SLOT_COUNT = 3;
const STORAGE_PREFIX = "lineup-builder-slot-";

/** Lit le terrain et les remplaçants, retourne l'état actuel de la composition. */
function getPitchState() {
  const joueurs = Array.prototype.map.call(
    document.querySelectorAll("#pitch .dz"),
    function (dz) {
      const card = dz.querySelector(".player");
      return card ? Number(card.dataset.id) : 0;
    }
  );

  const remplaçants = Array.prototype.map.call(
    document.querySelectorAll("#subs .player"),
    function (card) {
      return Number(card.dataset.id);
    }
  );

  // NOUVEAU : Détecter et exporter les joueurs temporaires (ID très grand généré par Date.now())
  const allIds = [...joueurs, ...remplaçants];
  const tempPlayers = [];
  
  allIds.forEach(function (id) {
    if (id > 1000000) { // Si c'est un joueur temporaire
      const p = App.players.find(player => player.id === id);
      // On l'ajoute si on l'a trouvé et qu'il n'est pas déjà dans la liste
      if (p && !tempPlayers.some(t => t.id === id)) {
        tempPlayers.push(p);
      }
    }
  });

  return { t: getFormation(), j: joueurs, c: getCaptainId(), r: remplaçants, tp: tempPlayers };
}

/** Vide le terrain puis place les joueurs et les remplaçants selon l'état fourni. */
function applyState(state) {
  if (!state || typeof state !== "object") return false;

  // NOUVEAU : Recréer les joueurs temporaires s'ils n'existent pas encore dans cette session
  if (state.tp && Array.isArray(state.tp)) {
    state.tp.forEach(function(p) {
      if (!App.cards.has(Number(p.id))) {
        App.players.push(p);              // On l'ajoute à la base de données de l'application
        const card = buildCard(p);        // On recrée sa carte HTML
        App.cards.set(Number(p.id), card);
        const bench = document.getElementById("bench");
        if (bench) bench.appendChild(card); // On le pose sur le banc en attendant d'être placé
      }
    });
  }

  const code = formationCodeFromLabel(state.t);
  clearPitch();
  setFormation(FORMATIONS[code] ? code : DEFAULT_FORMATION);

  // Placement des joueurs sur le terrain
  const zones = document.querySelectorAll("#pitch .dz");
  (state.j || []).slice(0, zones.length).forEach(function (id, i) {
    const card = App.cards.get(Number(id));
    if (card && !card.closest(".dz")) moveCard(card, zones[i]);
  });

  // Placement des remplaçants
  const subsZone = document.getElementById("subs");
  if (subsZone && state.r && state.r.length > 0) {
    state.r.forEach(function (id) {
      const card = App.cards.get(Number(id));
      if (card && !card.closest(".dz") && !card.closest("#subs")) {
        moveCard(card, subsZone);
      }
    });
  }

  // Capitaine
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

/** Construit le lien et le copie dans le presse-papier. */
function generateShareUrl() {
  const state = getPitchState();
  const base = location.href.split("#")[0].split("?")[0];
  let url = base + "?t=" + state.t + "&j=" + state.j.join(",") + "&c=" + state.c;

  if (state.r && state.r.length > 0) {
    url += "&r=" + state.r.join(",");
  }

  // NOUVEAU : Encoder les joueurs temporaires dans l'URL (format: id|nom|poste,id|nom|poste)
  if (state.tp && state.tp.length > 0) {
    const tpString = state.tp.map(function(p) {
      return p.id + "|" + encodeURIComponent(p.nom) + "|" + p.poste;
    }).join(",");
    url += "&tp=" + tpString;
  }

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

  let remps = [];
  if (params.has("r") && params.get("r")) {
    remps = params.get("r")
      .split(",")
      .map(function (n) { return parseInt(n, 10) || 0; });
  }

  // NOUVEAU : Décoder les joueurs temporaires depuis l'URL
  let tempPlayers = [];
  if (params.has("tp") && params.get("tp")) {
    tempPlayers = params.get("tp").split(",").map(function(str) {
      const parts = str.split("|");
      return {
        id: Number(parts[0]),
        nom: decodeURIComponent(parts[1] || ""),
        poste: parts[2] || "GB"
      };
    });
  }

  return applyState({
    t: params.get("t"),
    j: joueurs,
    c: parseInt(params.get("c"), 10) || 0,
    r: remps,
    tp: tempPlayers
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
/* ==========================================================
   app.js – Le chef d'orchestre
   Charge les données, construit les cartes joueurs, gère le
   capitaine, les compositions types et démarre l'application.
   (Doit être chargé en dernier : il appelle init() en fin de fichier.)
   ========================================================== */

const App = {
  players: [],          // contenu de players.json
  presets: {},          // contenu de presets.json
  cards: new Map()      // id du joueur -> élément DOM de sa carte
};

/* ---------- Petit message temporaire ---------- */
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
}

/* ---------- Cartes joueurs ---------- */
function buildCard(player) {
  const card = document.createElement("div");
  card.className = "player";
  card.draggable = true;
  card.dataset.id = player.id;
  card.dataset.poste = player.poste;
  card.title = "Double-clic ou clic droit : capitaine";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = player.poste;

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = player.nom;

  card.append(badge, name);
  return card;
}

/* ---------- Capitaine ---------- */
function clearCaptain() {
  document.querySelectorAll(".player.is-captain").forEach(function (c) {
    c.classList.remove("is-captain");
  });
}

function getCaptainId() {
  const c = document.querySelector("#pitch .player.is-captain");
  return c ? Number(c.dataset.id) : 0;
}

function toggleCaptain(card) {
  if (!card.closest(".dz")) {
    showToast("Placez d'abord ce joueur sur le terrain.");
    return;
  }
  const wasCaptain = card.classList.contains("is-captain");
  clearCaptain();
  if (!wasCaptain) {
    card.classList.add("is-captain");
    showToast(card.querySelector(".name").textContent + " est capitaine ©");
  }
}

/* ---------- Filtres du banc ---------- */
let currentSearch = "";
let currentFilter = "ALL";

// Fonction utilitaire pour enlever les accents (ex: Lefèvre -> lefevre)
function normalizeText(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function applyFilters() {
  // App.cards est une Map (Map<id, Element>). On itère sur ses valeurs.
  App.cards.forEach(function (card) {
    const nameEl = card.querySelector(".name");
    if (!nameEl) return;
    
    const nom = normalizeText(nameEl.textContent);
    const searchString = normalizeText(currentSearch);
    const poste = card.dataset.poste; // Récupère GB, DEF, MIL ou ATT
    
    const matchSearch = nom.includes(searchString);
    const matchFilter = currentFilter === "ALL" || poste === currentFilter;
    
    // Si le joueur correspond, on enlève la classe "filtered-out"
    if (matchSearch && matchFilter) {
      card.classList.remove("filtered-out");
    } else {
      card.classList.add("filtered-out");
    }
  });
}

function initFilters() {
  const searchInput = document.getElementById("search-player");
  const filterBtns = document.querySelectorAll(".btn-filter");

  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      currentSearch = e.target.value;
      applyFilters();
    });
  }

  if (filterBtns.length > 0) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        // e.currentTarget assure qu'on clique bien sur le bouton
        const targetBtn = e.currentTarget; 
        
        filterBtns.forEach(b => b.classList.remove("active"));
        targetBtn.classList.add("active");
        
        currentFilter = targetBtn.getAttribute("data-poste");
        applyFilters();
      });
    });
  }
}

/* ---------- Mises à jour après chaque changement ---------- */
function onLineupChange() {
  // Un joueur renvoyé sur le banc perd le brassard
  document.querySelectorAll("#bench .player.is-captain").forEach(function (c) {
    c.classList.remove("is-captain");
  });

  const n = document.querySelectorAll("#pitch .player").length;
  const count = document.getElementById("count");
  count.textContent = n + " / 11 sur le terrain";
  count.classList.toggle("complete", n === 11);

  // Message si le banc est vide
  const bench = document.getElementById("bench");
  let msg = bench.querySelector(".bench-message");
  if (bench.querySelector(".player")) {
    if (msg) msg.remove();
  } else if (!msg) {
    msg = document.createElement("p");
    msg.className = "bench-message";
    msg.textContent = "Tous les joueurs sont sur le terrain.";
    bench.appendChild(msg);
  }
}

/** Renvoie tous les joueurs (terrain + remplaçants) au banc et retire le capitaine. */
function clearPitch() {
  const bench = document.getElementById("bench");
  
  // Vider le terrain
  document.querySelectorAll("#pitch .player").forEach(function (card) {
    bench.appendChild(card);
  });
  
  // Vider les remplaçants
  document.querySelectorAll("#subs .player").forEach(function (card) {
    bench.appendChild(card);
  });
  
  clearCaptain();
  if (typeof clearSelection === "function") clearSelection();
  onLineupChange();
}

/* ---------- Compositions types (presets.json) ---------- */
function initPresets() {
  const select = document.getElementById("preset-select");

  Object.keys(App.presets).forEach(function (key) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = App.presets[key].nom || key;
    select.appendChild(opt);
  });

  select.addEventListener("change", function () {
    const p = App.presets[select.value];
    if (p) {
      applyState({ t: p.formation, j: p.joueurs, c: p.capitaine });
      showToast("Composition chargée : " + (p.nom || select.value));
    }
    select.value = "";
  });
}

/* ---------- Chargement d'un fichier JSON ---------- */
async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(path + " : HTTP " + response.status);
  return response.json();
}

/* ---------- Ajout rapide de joueur (Temporaire) ---------- */
function initCustomPlayer() {
  const btn = document.getElementById("add-custom-player-btn");
  const nameInput = document.getElementById("custom-player-name");
  const posteSelect = document.getElementById("custom-player-poste");
  const bench = document.getElementById("bench");

  if (!btn || !nameInput || !posteSelect || !bench) return;

  btn.addEventListener("click", function() {
    const nom = nameInput.value.trim();
    if (!nom) return;

    const poste = posteSelect.value;
    // On génère un ID unique très grand basé sur l'heure pour ne pas écraser les IDs du JSON
    const newId = Date.now(); 

    const newPlayer = { id: newId, nom: nom, poste: poste };
    
    // 1. Créer la carte HTML
    const card = buildCard(newPlayer);
    
    // 2. L'ajouter à la mémoire de l'application
    App.players.push(newPlayer);
    App.cards.set(newId, card);
    
    // 3. L'ajouter visuellement sur le banc
    bench.appendChild(card);
    
    // 4. Mettre à jour les compteurs et les filtres
    if (typeof applyFilters === "function") applyFilters();
    onLineupChange();
    
    // 5. Nettoyer le champ pour le prochain joueur
    nameInput.value = "";
    showToast(nom + " a été ajouté au banc !");
  });

  // Permettre de valider avec la touche "Entrée"
  nameInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      btn.click();
    }
  });
}

/* ---------- Démarrage ---------- */
async function init() {
  initFormations();
  initDragDrop();
  initStorage();
  initFilters();
  initCustomPlayer();

  const bench = document.getElementById("bench");

  document.getElementById("clear-btn").addEventListener("click", function () {
    clearPitch();
    showToast("Terrain vidé");
  });

  // Capitaine : double-clic ou clic droit sur une carte
  document.addEventListener("dblclick", function (e) {
    const card = e.target instanceof Element ? e.target.closest(".player") : null;
    if (card) {
      e.preventDefault();
      toggleCaptain(card);
    }
  });
  document.addEventListener("contextmenu", function (e) {
    const card = e.target instanceof Element ? e.target.closest(".player") : null;
    if (card) {
      e.preventDefault();
      toggleCaptain(card);
    }
  });

  // Joueurs
  try {
    App.players = await loadJson("data/players.json");
  } catch (err) {
    console.error(err);
    const msg = document.createElement("p");
    msg.className = "bench-message";
    msg.textContent =
      "Impossible de charger data/players.json. Ouvrez le site via un serveur " +
      "local (ex. « python3 -m http.server ») et non en double-cliquant sur index.html.";
    bench.appendChild(msg);
    return;
  }

  App.players.forEach(function (p) {
    const card = buildCard(p);
    App.cards.set(Number(p.id), card);
    bench.appendChild(card);
  });

  // Compositions types (facultatif)
  try {
    App.presets = await loadJson("data/presets.json");
    initPresets();
  } catch (err) {
    console.warn("presets.json non chargé :", err);
  }

  // Lien partagé ? Sinon terrain vide en 4-3-3
  if (!parseUrlParams()) setFormation(DEFAULT_FORMATION);
  onLineupChange();
}

init();

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
  card.title = "Cliquez pour modifier (Capitaine / Numéro)";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = "-";
  badge.dataset.customNum = "false";
  
  // NOUVEAU : On écoute le clic sur toute la carte
  card.addEventListener('click', function(e) {
    // On n'ouvre le menu que si le joueur est sur le terrain (dans une "dz")
    if (this.closest('.dz')) {
      openPlayerMenu(this);
    }
  });

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

/* ---------- Tri automatique du banc ---------- */
function sortBench() {
  const bench = document.getElementById("bench");
  if (!bench) return;
  
  // On récupère uniquement les cartes des joueurs présents sur le banc
  const cards = Array.from(bench.querySelectorAll(".player"));
  const ordrePostes = { "GB": 1, "DEF": 2, "MIL": 3, "ATT": 4 };
  
  // On les trie selon le poste
  cards.sort(function(a, b) {
    const oA = ordrePostes[a.dataset.poste] || 99;
    const oB = ordrePostes[b.dataset.poste] || 99;
    return oA - oB;
  });
  
  // On les replace proprement dans le banc dans le bon ordre
  cards.forEach(function(card) {
    bench.appendChild(card);
  });
}

/* ---------- Mises à jour après chaque changement ---------- */
function onLineupChange() {
  // Un joueur renvoyé sur le banc perd le brassard
  document.querySelectorAll("#bench .player.is-captain").forEach(function (c) {
    c.classList.remove("is-captain");
  });

  // On retrie le banc immédiatement
  sortBench();

  // On met à jour les numéros de maillots !
  autoAssignNumbers();

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
  initExportCompo();

  // NOUVEAU : Crée le menu caché dans la page au démarrage
  createPlayerMenuHTML();

  const bench = document.getElementById("bench");

  document.getElementById("clear-btn").addEventListener("click", function () {
    clearPitch();
    showToast("Terrain vidé");
  });

  // Joueurs
  try {
    const fichier = typeof FICHIER_JOUEURS !== 'undefined' ? FICHIER_JOUEURS : "players.json";
    App.players = await loadJson("data/" + fichier);
  } catch (err) {
    console.error(err);
    const msg = document.createElement("p");
    msg.className = "bench-message";
    msg.textContent = "Impossible de charger les joueurs.";
    bench.appendChild(msg);
    return;
  }

  // Tri des joueurs par poste (GB > DEF > MIL > ATT)
  const ordrePostes = { "GB": 1, "DEF": 2, "MIL": 3, "ATT": 4 };
  
  App.players.sort(function(a, b) {
    const ordreA = ordrePostes[a.poste] || 99;
    const ordreB = ordrePostes[b.poste] || 99;
    return ordreA - ordreB;
  });

  // Création des cartes
  App.players.forEach(function (p) {
    const card = buildCard(p);
    App.cards.set(Number(p.id), card);
    bench.appendChild(card);
  });

  // Compositions types (facultatif)
  try {
    const fichierPresets = typeof FICHIER_PRESETS !== 'undefined' ? FICHIER_PRESETS : "presets.json";
    App.presets = await loadJson("data/" + fichierPresets);
    initPresets();
  } catch (err) {
    console.warn("presets.json non chargé :", err);
  }

  // Lien partagé ? Sinon terrain vide en 4-3-3
  if (!parseUrlParams()) setFormation(DEFAULT_FORMATION);
  onLineupChange();
}

// ==========================================
// AUTO-NUMÉROTATION DES JOUEURS
// ==========================================
function autoAssignNumbers() {
  const logicalNumbers = {
    0: 1,   1: 2,   2: 4,   3: 5,   4: 3, 
    5: 6,   6: 8,   7: 10,  8: 7,   9: 9, 10: 11
  };

  // 1. Terrain
  const dropZones = document.querySelectorAll('.dz');
  dropZones.forEach(dz => {
    const slotIndex = parseInt(dz.getAttribute('data-slot'));
    const player = dz.querySelector('.player');
    
    if (player) {
      const badge = player.querySelector('.badge');
      if (badge && badge.dataset.customNum !== "true") {
        badge.textContent = logicalNumbers[slotIndex] || "-"; 
      }
    }
  });

  // 2. Remplaçants (Zone sous le terrain, à partir de 12)
  let subNumber = 12;
  const subsPlayers = document.querySelectorAll('#subs .player');
  subsPlayers.forEach(player => {
    const badge = player.querySelector('.badge');
    if (badge && badge.dataset.customNum !== "true") {
      badge.textContent = subNumber;
      subNumber++;
    }
  });

  // 3. Banc de touche principal (Réinitialisation avec un tiret)
  const benchPlayers = document.querySelectorAll('#bench .player');
  benchPlayers.forEach(player => {
    const badge = player.querySelector('.badge');
    if (badge && badge.dataset.customNum !== "true") {
      badge.textContent = "-";
    }
  });
}

/* ---------- Export de la composition (Image) ---------- */
function initExportCompo() {
  const btnExport = document.getElementById('btn-export-compo');
  const captureArea = document.getElementById('capture-terrain');
  
  // SÉCURITÉ : Si on est sur une page sans le bouton ou sans terrain, on ne fait rien !
  if (!btnExport || !captureArea) return; 

  btnExport.addEventListener('click', function() {
    const originalText = this.innerHTML;
    this.innerHTML = "⏳ Génération en cours..."; 
    this.style.opacity = "0.7";

    html2canvas(captureArea, { scale: 2, useCORS: true, backgroundColor: null }).then(canvas => {
      canvas.toBlob(async function(blob) {
        const file = new File([blob], 'Composition.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: 'Notre Composition' });
          } catch (err) {
            console.log('Partage annulé ou échoué', err);
          }
        } else {
          // Secours pour PC
          const link = document.createElement('a');
          link.download = 'Composition.png';
          link.href = URL.createObjectURL(blob);
          link.click();
        }

        // Restaure le bouton
        btnExport.innerHTML = originalText; 
        btnExport.style.opacity = "1";
        
      }, 'image/png');
    });
  });
}

// ==========================================
// MENU JOUEUR (MODALE CAPITAINE / NUMÉRO)
// ==========================================
let activePlayerCard = null;

function createPlayerMenuHTML() {
  if (document.getElementById('player-modal')) return;
  
  const modalHTML = `
    <div id="player-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.8); z-index:9999; justify-content:center; align-items:center;">
      <div style="background:#1e293b; padding:20px; border-radius:10px; border:1px solid #334155; width:90%; max-width:300px; color:white; text-align:center; font-family:system-ui,sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        
        <h3 id="modal-player-name" style="margin-top:0; color:#eab308; font-size: 1.3em;">Nom</h3>
        
        <!-- Boutons d'action principaux -->
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
          <button id="btn-modal-captain" style="padding:12px; border:none; border-radius:5px; font-weight:bold; cursor:pointer; color:white; font-size:1em; transition:0.2s;">© Mettre Capitaine</button>
          <button id="btn-modal-close" style="padding:10px; border:none; border-radius:5px; cursor:pointer; background:transparent; color:#94a3b8; text-decoration:underline;">Fermer le menu</button>
        </div>

        <hr style="border:0; border-top:1px solid #334155; margin:20px 0;">

        <!-- Zone de saisie du numéro tout en bas -->
        <div style="text-align:left;">
          <label style="display:block; margin-bottom:2px; color:#cbd5e1; font-weight:bold; font-size:0.9em;">Numéro de maillot :</label>
          <small style="color:#94a3b8; display:block; margin-bottom:10px; font-style:italic;">(Laisser vide pour le mode auto)</small>
          
          <div style="display:flex; gap:10px;">
            <input type="text" inputmode="numeric" pattern="[0-9]*" id="modal-player-number" placeholder="Auto" autocomplete="new-password" style="flex:1; padding:10px; border-radius:5px; border:1px solid #475569; background:#0f172a; color:white; font-size:1.1em; text-align:center; min-width:0;">
            <button id="btn-modal-save" style="padding:10px 15px; border:none; border-radius:5px; font-weight:bold; cursor:pointer; background:#22c55e; color:white;">Valider</button>
          </div>
        </div>

      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // On branche les boutons du menu
  document.getElementById('btn-modal-close').addEventListener('click', closePlayerMenu);
  document.getElementById('btn-modal-save').addEventListener('click', savePlayerMenu);
  document.getElementById('btn-modal-captain').addEventListener('click', toggleCaptainFromMenu);
}

function openPlayerMenu(card) {
  activePlayerCard = card;
  const name = card.querySelector('.name').textContent;
  const badge = card.querySelector('.badge');
  const isCaptain = card.classList.contains('is-captain');
  
  // Met à jour les textes du menu
  document.getElementById('modal-player-name').textContent = name;
  const numInput = document.getElementById('modal-player-number');
  numInput.value = (badge.dataset.customNum === "true") ? badge.textContent : "";
  
  // Adapte le bouton capitaine
  const capBtn = document.getElementById('btn-modal-captain');
  if (isCaptain) {
    capBtn.textContent = "❌ Retirer le brassard";
    capBtn.style.background = "#ef4444"; // rouge
  } else {
    capBtn.textContent = "© Mettre Capitaine";
    capBtn.style.background = "#3b82f6"; // bleu
  }

  // Affiche le menu
  document.getElementById('player-modal').style.display = "flex";
  numInput.focus();
}

function closePlayerMenu() {
  document.getElementById('player-modal').style.display = "none";
  activePlayerCard = null;
}

function savePlayerMenu() {
  if (!activePlayerCard) return;
  const numInput = document.getElementById('modal-player-number').value.trim();
  const badge = activePlayerCard.querySelector('.badge');
  
  if (numInput !== "") {
    badge.textContent = numInput;
    badge.dataset.customNum = "true";
  } else {
    badge.dataset.customNum = "false";
    autoAssignNumbers(); // Remet le numéro automatique
  }
  
  closePlayerMenu();
}

function toggleCaptainFromMenu() {
  if (!activePlayerCard) return;
  toggleCaptain(activePlayerCard); // Utilise ta fonction capitaine existante !
  closePlayerMenu();
}

init();

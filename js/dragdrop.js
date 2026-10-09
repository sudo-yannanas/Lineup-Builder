/* ==========================================================
   dragdrop.js – Moteur de mouvement
   - Drag & Drop HTML5 (souris) : dragstart / dragover / drop
   - Mode "clic puis clic" en complément (utile sur mobile, où le
     Drag & Drop HTML5 ne fonctionne pas).
   Un joueur peut aller : banc -> terrain, terrain -> banc,
   vers les remplaçants, ou changer de position sur le terrain.
   ========================================================== */

let draggedCard = null;   // carte en cours de glissement
let selectedCard = null;  // carte sélectionnée par clic

/** Retourne la cible de dépôt (zone du terrain, banc ou remplaçants) contenant l'élément. */
function getDropTarget(el) {
  if (!(el instanceof Element)) return null;
  // AJOUT : Ajout de #subs comme zone valide
  return el.closest(".dz, #bench, #subs");
}

/** Déplace une carte vers une zone (.dz), le banc (#bench) ou les remplaçants (#subs). */
function moveCard(card, target) {
  if (!card || !target) return;

  const origin = card.parentElement;
  if (origin === target) return;

  // Zone déjà occupée : le joueur en place prend l'ancienne position
  if (target.classList.contains("dz")) {
    const occupant = target.querySelector(".player");
    if (occupant && occupant !== card) origin.appendChild(occupant);
  }

  target.appendChild(card);
  // Fait appel à la fonction dans app.js pour mettre à jour les compteurs
  if (typeof onLineupChange === "function") onLineupChange();
}

function clearSelection() {
  if (selectedCard) selectedCard.classList.remove("selected");
  selectedCard = null;
}

function clearDragHighlights() {
  document.querySelectorAll(".drag-over").forEach(function (el) {
    el.classList.remove("drag-over");
  });
}

function initDragDrop() {
  // --- Glisser-déposer HTML5 ---
  document.addEventListener("dragstart", function (e) {
    const card = e.target instanceof Element ? e.target.closest(".player") : null;
    if (!card) return;

    draggedCard = card;
    clearSelection();
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", card.dataset.id); // requis par Firefox
  });

  document.addEventListener("dragend", function () {
    if (draggedCard) draggedCard.classList.remove("dragging");
    draggedCard = null;
    clearDragHighlights();
  });

  document.addEventListener("dragover", function (e) {
    const target = getDropTarget(e.target);
    if (!target || !draggedCard) return;
    e.preventDefault(); // autorise le dépôt
    e.dataTransfer.dropEffect = "move";
    target.classList.add("drag-over");
  });

  document.addEventListener("dragleave", function (e) {
    const target = getDropTarget(e.target);
    if (target && !target.contains(e.relatedTarget)) {
      target.classList.remove("drag-over");
    }
  });

  document.addEventListener("drop", function (e) {
    const target = getDropTarget(e.target);
    if (!target || !draggedCard) return;
    e.preventDefault();
    clearDragHighlights();
    moveCard(draggedCard, target);
  });

  // --- Clic puis clic (tactile / accessibilité) ---
  document.addEventListener("click", function (e) {
    if (!(e.target instanceof Element)) return;

    const card = e.target.closest(".player");
    const zone = e.target.closest(".dz");
    const bench = e.target.closest("#bench");
    const subs = e.target.closest("#subs"); // AJOUT : Constante pour les remplaçants

    // AJOUT : On inclut subs dans la condition de sortie
    if (!card && !zone && !bench && !subs) return;

    if (selectedCard) {
      if (card === selectedCard) {            // re-clic : on désélectionne
        clearSelection();
      } else if (zone) {                      // vers une zone du terrain
        moveCard(selectedCard, zone);
        clearSelection();
      } else if (card) {                      // autre carte : on change de sélection
        clearSelection();
        selectedCard = card;
        card.classList.add("selected");
      } else if (bench) {                     // vers le banc
        moveCard(selectedCard, bench);
        clearSelection();
      } else if (subs) {                      // AJOUT : vers les remplaçants
        moveCard(selectedCard, subs);
        clearSelection();
      }
    } else if (card) {
      selectedCard = card;
      card.classList.add("selected");
    }
  });
}
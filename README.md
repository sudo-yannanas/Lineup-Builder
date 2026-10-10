# ⚽ Lineup-Builder & Match Summary

Une application web statique intuitive permettant de créer, sauvegarder et partager des compositions d'équipes de football, ainsi que de générer des visuels professionnels pour les résumés de match. 

Pensée pour les entraîneurs et les passionnés, cette interface permet de gérer facilement différentes catégories (Séniors, U17, etc.) et de communiquer efficacement les événements et résultats sur les réseaux sociaux.

## 🔗 Accès aux outils

- **Équipe Sénior C** : [Accéder à la composition](https://sudo-yannanas.github.io/Lineup-Builder/EquipeC.html)
- **Équipe U17** : [Accéder à la composition](https://sudo-yannanas.github.io/Lineup-Builder/U17.html)
- **Résumé de Match** : [Générer un résumé](https://sudo-yannanas.github.io/Lineup-Builder/resume.html)

## ✨ Fonctionnalités

### 📋 Gestion des Compositions (Lineup)
- **Interface Drag & Drop :** Placez facilement vos joueurs du banc de touche vers le terrain.
- **Gestion multi-équipes :** Fichiers de données séparés pour gérer différentes listes de joueurs de manière indépendante.
- **Tri intelligent du banc :** Les joueurs sur le banc sont automatiquement triés par poste (Gardien, Défenseur, Milieu, Attaquant) pour une meilleure lisibilité.
- **Ajout rapide :** Possibilité d'ajouter temporairement un joueur ne figurant pas dans l'effectif de base directement depuis l'interface.
- **Sauvegarde et Partage :** 
  - Système de slots pour sauvegarder vos compositions en local.
  - Génération d'une URL de partage dynamique (Presets) pour envoyer la composition directement à d'autres personnes.
- **Compositions types :** Chargement rapide de schémas tactiques prédéfinis (4-4-2, 4-2-3-1, etc.).
- **Désignation du capitaine :** Attribution rapide du brassard via un double-clic ou clic droit.

### 📸 Générateur de Résumé de Match (Nouveau)
- **Génération de visuels (Format Story) :** Création et exportation en un clic d'une image haute définition du résumé de la rencontre.
- **Timeline chronologique intelligente :** Tri automatique des actions (buts, remplacements, cartons) avec gestion avancée du temps additionnel (ex: 45+2).
- **Calculs et formatages automatiques :** Mise à jour en direct du score en fonction des buts saisis et formatage automatique de la casse des noms des joueurs.
- **Séparateurs dynamiques :** Insertion automatique de barrières visuelles pour la mi-temps, la fin du match et les pauses fraîcheur.
- **Panneau de personnalisation :** Définition de l'intitulé du match, de l'adversaire (et son abréviation), de l'heure du coup d'envoi et de l'Homme du Match.

### 📱 Général
- **Design Responsive :** Toutes les interfaces sont adaptées pour une utilisation fluide sur ordinateur, tablette et smartphone.

## 🛠️ Technologies utilisées

- **Frontend :** HTML5, CSS3, JavaScript (Vanilla, sans framework)
- **Export visuel :** Utilisation de [html2canvas](https://html2canvas.hertzen.com/) pour le rendu client-side des images de résumé.
- **Base de données :** Fichiers `.json` statiques pour le stockage des effectifs et la gestion des presets d'équipes types.
- **Hébergement :** [GitHub Pages](https://pages.github.com/)

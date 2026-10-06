# Version mobile installable

Cette version est une application web progressive (PWA), utilisable sur téléphone et installable depuis le navigateur. Le même code sert sur iPhone/iPad et Android.

## Mise en ligne requise

Pour installer l’application et activer le mode hors ligne, hébergez le contenu de ce dossier sous une adresse HTTPS. L’ouverture directe du fichier `index.html` (`file://`) permet la prévisualisation, mais les navigateurs désactivent alors l’installation PWA et le cache hors ligne.

- **iPhone/iPad** : ouvrir l’adresse dans Safari → Partager → **Sur l’écran d’accueil**.
- **Android** : ouvrir l’adresse dans Chrome → **Installer l’application** (ou menu ⋮ → Ajouter à l’écran d’accueil).

Le bouton en haut à droite lance la fenêtre d’installation Android lorsqu’elle est disponible et affiche ces instructions sur iOS. Les données restent enregistrées sur l’appareil. L’application ne demande pas de compte.

Cette livraison fournit une PWA installable; elle ne contient pas de paquets natifs signés ni de soumission à l’App Store ou Google Play.

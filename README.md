# Atlas Objectif — Stratégie Atlas Earth

La version web s’ouvre avec `index.html`. Pour l’installer sur téléphone et utiliser le mode hors ligne, voir [INSTALLATION.md](INSTALLATION.md) : le dossier doit être hébergé en HTTPS.

## Concept stratégique

L’application propose quatre plans sur un horizon d’un mois :

1. **Sans dépense** : optimiser les AB actuellement disponibles.
2. **Season Pass** : ajouter les AB Premium que le joueur prévoit réellement de réclamer, puis comparer leur meilleur usage.
3. **Explorer Club** : vérifier le seuil de 5 badges, ajouter la projection d’AB d’un mois, puis comparer parcelles et badges.
4. **Season Pass + Explorer Club** : réunir les deux récompenses et optimiser ensemble leur allocation.

Pour chaque plan, le moteur compare les choix possibles de badges aux paliers du passeport et de parcelles aux paliers de boost. Il affiche le nombre d’achats, leur coût en AB, le solde conservé et les parcelles restantes avant le prochain changement de multiplicateur. Il simule les nouvelles parcelles selon la répartition moyenne 50/30/15/5, et peut recommander de garder des AB si franchir un palier réduit le revenu estimé. Les achats de badges sont conditionnés à leur accessibilité géographique. Le nombre d’AB Premium attendus est saisi directement dans le profil joueur afin de comparer une récompense réellement accessible.

Le calcul de revenu tient compte du pays, du nombre total de parcelles, des raretés existantes, du bonus passeport, du nombre d’heures de boost et du taux USD/EUR réglable. Les trois scénarios sont clairement distingués : prudent (2 h/jour), habituel (saisie du joueur) et optimisé (20 h/jour). Le SRB est un scénario séparé et n’augmente pas le revenu permanent affiché.

L’amortissement d’un abonnement d’un mois est calculé ainsi : coût du mois ÷ hausse de revenu mensuel récurrent par rapport au plan gratuit optimisé. Le modèle suppose que l’abonnement s’arrête ensuite et que les parcelles acquises restent. Il ne transforme pas le gain de revenu en garantie de rendement. Le retrait en argent réel demande un solde de loyer cumulé de 5 USD. Le modèle n’estime pas le temps nécessaire pour gagner des AB gratuits : conformément au brief, il ne demande pas d’AB/jour.

## Tableau des boosts et rappel publicitaire


Le rappel AB commence seulement lorsque le joueur appuie sur le bouton après une pub de 1 AB. Il affiche un compte à rebours de 20 minutes, le conserve après actualisation et déclenche une alerte dans la page; une notification système est utilisée si le navigateur l’autorise. La page doit rester ouverte pour recevoir l’alerte au moment prévu.

## Feuille de route, récompenses et rappels

La feuille de route transforme le profil entré en étapes : allocation aujourd’hui; dernier nombre de parcelles à conserver avant la baisse du boost; puis seuil de parcelles calculé pour retrouver le loyer maximal du palier précédent. Le saut et le coût d’AB sont recalculés après les achats envisagés et le bonus passeport du parcours retenu. Le tableau détaille aussi les paliers, estime le loyer sur le profil saisi et surligne le palier courant.

Pour l’Explorer Club, saisir le nombre d’heures de boost réellement visé avec l’offre. Le modèle n’accorde pas gratuitement 8 h : le joueur doit regarder les pubs pour maintenir ce rythme. Pour le Season Pass, saisir les AB qu’il pense toucher après avoir terminé les défis et réclamé les paliers. Les instructions rappellent l’accès à 5 badges et la piste de récompenses Premium. L’application affiche les frais en euros indicatifs; vérifier le montant et le cycle de facturation dans le Web App avant l’achat.

Le rappel publicitaire démarre au clic, après une vidéo de 1 AB; il conserve l’échéance de 20 minutes après actualisation, fait sonner l’alerte intégrée, et tente une notification système si le navigateur l’autorise. La page doit rester ouverte pour recevoir la notification à l’heure prévue.

## Limites connues

- Le taux USD/EUR et les tarifs en euros des abonnements sont indicatifs et modifiables; le prix final est celui affiché sur l’application Web Atlas Earth.
- Paliers Europe du tableau officiel fourni par le joueur : 1–70 ×20, 71–100 ×15, 101–135 ×10, 136–170 ×8, 171–200 ×7, 201–250 ×6, 251–300 ×5, 301–350 ×4, 351–400 ×3, puis ×2. À 149 parcelles, le multiplicateur est ×8.
- Le multiplicateur réel dépend du nombre de parcelles et du pays physique; vérifier l’écran Boost dans le jeu avant une décision.
- Projection AB sur 30 jours : 110 AB de bonus quotidien gratuit à partir de 3 parcelles; 600 AB via 20 pubs quotidiennes en France; repère Club 3 545 AB pour 30 jours d’accès aux deux pistes; repère Premium 1 030 AB si la piste saisonnière est terminée. Les récompenses peuvent varier et demandent une connexion quotidienne.
- L’amélioration légendaire Season Pass est appliquée seulement à la projection payante et nécessite une parcelle possédée.
- La projection de rareté pour de nouvelles parcelles utilise 50/30/15/5; la rareté réelle est aléatoire.
- L’amortissement ignore impôts, frais, conversion future, montant de loyer déjà encaissé et délai d’accumulation des AB.

## Sources

Consultées le 6 octobre 2026 :

- [Taux de revenu par rareté](https://atlasreality.helpshift.com/hc/en/3-atlas-earth/faq/31-what-is-parcel-rarity-and-what-does-it-mean/)
- [Prix des parcelles](https://atlasreality.helpshift.com/hc/en/3-atlas-earth/faq/30-how-do-i-buy-land/)
- [Prix des badges et gains publicitaires selon le pays](https://atlasreality.helpshift.com/hc/fr/3-atlas-earth/faq/83-how-do-i-buy-a-badge/)
- [Bonus de passeport](https://atlasreality.helpshift.com/hc/en/3-atlas-earth/faq/509-what-are-badges/)
- [Multiplicateurs de boost selon la région](https://atlasreality.helpshift.com/hc/en/3-atlas-earth/faq/39-why-do-ad-boosts-change-and-how-do-i-see-my-current-boost-rate/)
- [Événement SRB](https://atlasreality.helpshift.com/hc/en/3-atlas-earth/faq/89-what-is-a-super-rent-boost-event/)
- [Explorer Club : accès, tarifs et récompenses](https://atlasreality.helpshift.com/hc/en/3-atlas-earth/faq/102-how-can-i-join-atlas-explorer-club-aec-and-what-are-the-perks/)
- [Season Pass : tarifs et récompenses](https://atlasreality.helpshift.com/hc/en/3-atlas-earth/faq/175-what-is-the-premium-option/)
- [Défis mensuels et seuil de 1 600 points](https://atlasreality.helpshift.com/hc/en/3-atlas-earth/section/32-monthly-challenges---season-pass/)
- [Season Pass et Explorer Club](https://atlasreality.helpshift.com/hc/en/3-atlas-earth/faq/487-what-s-the-difference-between-the-season-pass-and-atlas-explorer-club-membership/)
- [Récompenses mensuelles et Premium](https://atlasreality.helpshift.com/hc/en/3-atlas-earth/faq/172-what-are-monthly-and-premium-rewards/)
- [Seuil de retrait de 5 USD](https://atlasreality.helpshift.com/hc/en/3-atlas-earth/faq/43-how-do-i-redeem-cash-out-my-virtual-rent-for-real-world-currency-usd-cad-etc/)
- [Tableau de boost France/Allemagne — guide régional](https://atlas-earth.fr/faq-atlas-earth/)
- [Multiplicateurs France/Europe — tableau communautaire](https://www.itatlas.it/atlas-earth-italia-salti-di-livello/)
- [Calculateur communautaire badge/parcelle et amortissement de palier](https://infinitycalculator.com/gaming/atlas-earth-calculator)

- Le parrainage affiché sur la capture utilisateur n’est pas intégré aux prévisions : malgré les montants annoncés (200 AB filleul, 100 AB parrain et saisie avant la 2e parcelle), l’aide officielle indique que la fonctionnalité n’est actuellement pas disponible.

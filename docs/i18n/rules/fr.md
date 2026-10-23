# ShashBesh — règles v1

DRAFT_REVIEW_REQUIRED. Traduction à relire, sans vérification indépendante par des locuteurs natifs. Source : docs/RULES_V1.md et approbation GAME UPDATE 06. Les autres questions restent ouvertes.

## Jeu et plateau

De 2 à 4 joueurs, cinq pions chacun. Le premier à remplir les cinq positions de sa maison en une chaîne contiguë gagne. Le parcours extérieur fermé comporte 48 cases, 1→2→…→48→1 ; le déplacement suit l’ordre croissant. Départs : P1=1, P2=13, P3=25, P4=37. Chaque maison comprend le départ extérieur partagé et quatre cases intérieures : pour P1, 1, Д1.2, Д1.3, Д1.4, Д1.5 ; de même pour les autres. 48 extérieures + 16 intérieures = 64 cases physiques distinctes. Coins : 7, 19, 31, 43. Le CSV définit la géométrie exacte.

## Début et ordre des tours

Chacun lance un d6. Le plus grand commence ; en cas d’égalité, seuls les premiers ex æquo relancent jusqu’à obtenir un seul premier. Ensuite, les tours suivent le sens horaire. Les autres attendent que le joueur actif termine toute sa série de lancers supplémentaires.

## Lancers et actions

Lancez deux dés indépendants à six faces. Un lancer a–b donne deux actions distinctes de a et b. L’ordre et la répartition entre pions respectent la priorité des sauts de coin autorisés. Choisir une prise est facultatif ; après un saut, tout pion peut utiliser légalement les valeurs restantes. Tout double n–n donne quatre actions n et un autre lancer : 6–6 signifie quatre six, pas deux ni trois. 6–5 ou 5–6 (« shashbesh ») donne les actions six et cinq, puis un autre lancer. Le nombre de lancers supplémentaires est illimité. Chaque lancer est entièrement joué et enregistré avant le suivant ; les actions ne se mélangent ni ne se reportent entre lancers.

Il faut utiliser la somme maximale possible des valeurs d’actions parmi les séquences complètes autorisées par les priorités de saut. Si 6+3=9 est possible, un déplacement de six empêchant l’utilisation du trois est interdit. Si seul l’un de cinq et trois est utilisable, utilisez cinq. À somme maximale égale, le choix stratégique est libre.

## Entrée, déplacement et prise

Un pion de réserve entre sur son propre départ pour une action de six, sans avancer de six cases. Un pion allié sur le départ interdit l’entrée ; un adversaire y est pris. Un seul pion par case physique. On ne peut ni passer, ni sauter, ni atterrir sur ses propres pions ; on peut dépasser les adversaires. Atterrir exactement sur un adversaire impose sa prise : il retourne en réserve et sa progression est remise à zéro. Choisir une prise est facultatif ; un autre déplacement autorisé peut être choisi. Ne pas ajouter de paires, blocs, piles ou cases extérieures sûres non spécifiées.

## Sauts de coin — priorité confirmée par le propriétaire

Cycle : 31→43→7→19→31. Un saut autorisé a priorité absolue sur une prise, un autre pion et l’ordre des dés. Vérifiez les séquences complètes avant le choix stratégique. Atteindre un coin est une action ordinaire qui consomme sa valeur. Le saut exige un un inutilisé et le consomme comme action séparée. Exemple depuis 40 avec 3–1 : 40→41→42→43 consomme trois ; 43→44→45→46→47→48→1→2→3→4→5→6→7 consomme un. Ce un ne peut être utilisé ailleurs ; le saut n’est pas gratuit.

Un pion déjà sur un coin doit sauter si un un inutilisé permet un saut autorisé. Sans un, atteindre le coin ne crée pas de priorité. La progression extérieure augmente des pas d’approche et de douze pour le saut ; les dés sont consommés selon les valeurs des actions. Les pions alliés bloquent l’approche et les douze cases du saut. Les adversaires intermédiaires restent ; seul celui de la destination est pris. Un saut bloqué par les siens ne crée pas d’obligation ; les actions ordinaires sont alors vérifiées selon les règles établies.

Conservez toutes les alternatives de coin autorisées respectant les obligations et la somme maximale. Une prise n’élimine pas une autre alternative de coin. Après le saut, choisissez toute action autorisée avec les valeurs restantes, y compris avec un autre pion. Avec 1–2, sautez d’abord avec 1, puis choisissez l’action avec 2 ; le 2 n’est jamais consommé automatiquement. Si aucun pion n’a d’action autorisée, la clôture existante d’un lancer injouable reste applicable. La politique provisoire `jumpEntry: skip` lors du franchissement de l’entrée par saut demeure ; les anciennes questions ne sont pas automatiquement résolues.

## Maison et victoire

Après un tour extérieur complet, le pion entre dans sa maison à son entrée ; recommencer volontairement un tour est interdit (des sauts obligatoires peuvent entraîner un tour supplémentaire). Les quatre cases intérieures sont protégées : les adversaires ne peuvent y entrer ni prendre. Plusieurs pions alliés encore mobiles peuvent s’y trouver, sans se dépasser ni partager une case. Avec A sur Д1.3, B peut entrer sur Д1.2, mais pas sauter A.

La valeur exacte est requise : on ne dépasse ni la dernière case ni l’arrivée. Une valeur trop grande est interdite pour ce pion, mais peut servir à un autre. Les pions restent dans la maison et deviennent définitivement immobiles en chaîne depuis le fond : Д1.5, Д1.4, Д1.3, Д1.2, puis le départ extérieur partagé (1, 13, 25 ou 37) après un tour complet. Les pions mobiles peuvent entrer avant que les précédents soient fixés. Remplir les cinq positions donne la victoire. Exemple avec 1–1, A sur Д1.3 et B sur Д1.2, sans saut obligatoire : A→Д1.4 ; B→Д1.3 ; A→Д1.5 ; B→Д1.4 est autorisé.

## Différé / exclu

Les dés tombés de la table ne sont pas modélisés. La prise est un choix facultatif ; atterrir sur un adversaire le capture automatiquement. Ne pas supposer de mises financières ni de blockchain : la chaîne de hachage est une fonction technique locale.

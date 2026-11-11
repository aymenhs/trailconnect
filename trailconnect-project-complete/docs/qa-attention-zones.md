# Vérification — zones d’attention et comparaison de parcours

**Date :** 18 août 2026  
**Périmètre :** création de sortie et édition organisateur d’un parcours manuel indicatif.

## Résultats de validation

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Contrats de zones (type, note, coordonnées) | Conforme | Tests du validateur, du routeur et du parseur de parcours : 80 assertions ciblées passantes. |
| Comparaison avant mise à jour | Conforme | Test d’interface : l’enregistrement n’est pas appelé avant l’étape de comparaison ; la confirmation transmet les zones conservées. |
| Typage et régression | Conforme | `pnpm check`, suite complète et build de production réussis. |
| Création sur ordinateur | Conforme | Contrôle à 1280 px : étapes, champs et actions Précédent/Suivant lisibles. |
| Création sur mobile | Conforme | Contrôle à 390 px : aucun débordement horizontal observé ; actions de navigation visibles et tactiles. |

> Les zones décrivent des informations factuelles indiquées par l’organisation. Elles ne valident ni la sécurité, ni l’accès, ni la navigabilité : les personnes doivent les vérifier sur le terrain.

## Limite de recette

La vérification interactive de l’éditeur publié requiert une session organisateur et une sortie manuelle existante. Son flux est couvert par le test d’interface dédié et les contrats serveur, tandis que la création responsive a été contrôlée dans l’aperçu réel.

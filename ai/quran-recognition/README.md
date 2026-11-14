# IRTAKI Quran Recognition — Tartil

Service indépendant de reconnaissance des récitations coraniques.

## Architecture

- service/app : API interne du moteur
- service/inference : adaptateurs de reconnaissance
- service/normalization : normalisation arabe versionnée
- service/wer : comparaison et calcul WER
- service/tests : tests automatisés
- models : accès local aux modèles
- benchmarks : évaluations comparatives
- training : préparation et entraînement
- evaluation : évaluation des modèles
- conversion : conversion des poids
- configurations : configurations versionnées

## Principes

- Traitement d'une ayah à la fois.
- Association de chaque résultat au Learner, à la riwaya et à l'ayah.
- WER calculé après normalisation versionnée.
- Seules les récitations ayant un WER exactement égal à zéro
  sont admissibles au corpus permanent.
- Les enregistrements rejetés ne sont pas conservés dans le corpus.
- Ne pas détourner le package @irtaki/audio.
- Ne pas modifier le fonctionnement de la Tilawa personnelle.

Les environnements Python et les poids des modèles restent locaux.

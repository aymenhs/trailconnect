# Références météo utilisées par TrailConnect

Ces références alimentent uniquement des indicateurs de préparation **indicatifs**. Elles ne remplacent pas les prévisions officielles locales, les alertes ni l’évaluation des conditions réelles sur le terrain.

| Sujet | Référence | Éléments retenus |
|---|---|---|
| Refroidissement éolien | [Environnement et Changement climatique Canada — Wind chill and the Wind Chill Index](https://www.canada.ca/en/services/environment/weather/severeweather/wind-chill-index.html) | Affichage officiel lorsque la température est de 0 °C ou moins et le vent de 5 km/h ou plus ; le vent et les conditions de terrain font varier le ressenti. |
| Humidex | [Environnement et Changement climatique Canada — How to use the Humidex](https://www.canada.ca/en/services/environment/weather/severeweather/humidex.html) | Seuils de confort : 20–29, 30–39, 40–45 et 46+ ; le ressenti varie selon la personne et les conditions. |
| Indice UV | [Environnement et Changement climatique Canada — Ultraviolet (UV) index and sun safety](https://www.canada.ca/en/environment-climate-change/services/weather-health/uv-index-sun-safety.html) | Échelle 0–2 faible, 3–5 modéré, 6–7 élevé, 8–10 très élevé, 11+ extrême ; le niveau quotidien est un maximum prévu et varie notamment avec le soleil, les nuages, l’altitude et la réverbération. |
| Variables de prévision | [Open-Meteo — Weather Forecast API](https://open-meteo.com/en/docs) | Variables quotidiennes `uv_index_max`, `wind_speed_10m_max` et `wind_gusts_10m_max`, ainsi que les séries horaires de température et point de rosée. |

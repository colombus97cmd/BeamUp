// Monnaie préférée du visiteur, déduite du fuseau horaire de son appareil (aucune donnée envoyée).
// Europe et territoires utilisant l'euro (Antilles françaises, Guyane, Réunion, Mayotte…) → euro ; ailleurs → dollar.

const EURO_ZONES_OUTSIDE_EUROPE = [
  'America/Guadeloupe', 'America/Martinique', 'America/Cayenne', 'America/St_Barthelemy', 'America/Marigot',
  'America/Miquelon', 'Indian/Reunion', 'Indian/Mayotte', 'Atlantic/Azores', 'Atlantic/Madeira', 'Atlantic/Canary',
];

export function preferredCurrency(): 'eur' | 'usd' {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return tz.startsWith('Europe/') || EURO_ZONES_OUTSIDE_EUROPE.includes(tz) ? 'eur' : 'usd';
  } catch {
    return 'usd';
  }
}

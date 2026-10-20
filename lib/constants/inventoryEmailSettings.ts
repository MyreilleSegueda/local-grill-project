/**
 * Constantes pour la configuration de l'envoi d'email d'inventaire
 * Stockées dans la table `setting`
 */

export const INVENTORY_EMAIL_SETTINGS = {
  // Activation/désactivation de l'envoi automatique
  ENABLED: 'inventory_email_enabled',
  
  // Jour du mois pour l'envoi (1-31)
  SEND_DAY: 'inventory_email_send_day',
  
  // Heure d'envoi (format 24h, ex: "09:00")
  SEND_TIME: 'inventory_email_send_time',
  
  // Dernière date d'envoi (pour éviter les doublons)
  LAST_SENT: 'inventory_email_last_sent',
  
  // Valeurs par défaut
  DEFAULTS: {
    ENABLED: 'true',
    SEND_DAY: '28',  // 28ème jour par défaut
    SEND_TIME: '09:00',
  }
} as const;

/**
 * Interface pour la configuration
 */
export interface InventoryEmailConfig {
  enabled: boolean;
  sendDay: number;
  sendTime: string;
  lastSent?: string | null;
}

/**
 * Parse les valeurs brutes de la base de données
 */
export function parseInventoryEmailSettings(settings: Record<string, string | null>): InventoryEmailConfig {
  return {
    enabled: settings[INVENTORY_EMAIL_SETTINGS.ENABLED] !== 'false',
    sendDay: parseInt(settings[INVENTORY_EMAIL_SETTINGS.SEND_DAY] || INVENTORY_EMAIL_SETTINGS.DEFAULTS.SEND_DAY, 10),
    sendTime: settings[INVENTORY_EMAIL_SETTINGS.SEND_TIME] || INVENTORY_EMAIL_SETTINGS.DEFAULTS.SEND_TIME,
    lastSent: settings[INVENTORY_EMAIL_SETTINGS.LAST_SENT] || null,
  };
}

/**
 * Convertit la configuration en objet pour la base de données
 */
export function serializeInventoryEmailConfig(config: InventoryEmailConfig): Record<string, string> {
  return {
    [INVENTORY_EMAIL_SETTINGS.ENABLED]: String(config.enabled),
    [INVENTORY_EMAIL_SETTINGS.SEND_DAY]: String(config.sendDay),
    [INVENTORY_EMAIL_SETTINGS.SEND_TIME]: config.sendTime,
  };
}

/**
 * Vérifie si aujourd'hui est le jour configuré pour l'envoi
 */
export function isScheduledDay(day: number): boolean {
  const today = new Date();
  const currentDay = today.getDate();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  // Si le jour configuré dépasse le dernier jour du mois, on envoie le dernier jour
  const effectiveDay = Math.min(day, lastDayOfMonth);
  
  return currentDay === effectiveDay;
}

/**
 * Vérifie si l'heure actuelle correspond à l'heure configurée
 */
export function isScheduledTime(timeStr: string): boolean {
  const [hour, minute] = timeStr.split(':').map(Number);
  const now = new Date();
  return now.getHours() === hour && now.getMinutes() === minute;
}

/**
 * Formate le jour pour l'affichage (avec suffixe ordinal)
 */
export function formatDayWithSuffix(day: number): string {
  const suffixes: Record<number, string> = {
    1: 'er', 21: 'er', 31: 'er'
  };
  return `${day}${suffixes[day] || ''}`;
}

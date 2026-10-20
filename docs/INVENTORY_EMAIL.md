# 📧 Envoi Mensuel de l'Inventaire par Email

## Description

Ce système envoie automatiquement un rapport d'inventaire complet par email à tous les utilisateurs ayant la permission `INVENTORY_VIEW` à la fin de chaque mois.

## 🎛️ Interface de Configuration

Accédez à **Paramètres > Email Inventaire** dans l'interface d'administration pour configurer :

- ✅ **Activation/désactivation** de l'envoi automatique
- 📅 **Jour du mois** pour l'envoi (1-31)
- ⏰ **Heure d'envoi** (format 24h)
- 📧 **Test manuel** — Envoyer un email immédiatement
- 📊 **Historique** — Dernier envoi affiché

![Configuration Email Inventaire](./screenshots/inventory-email-settings.png)

### Comportement intelligent du jour

Si vous configurez le jour 31 :
- En janvier → envoyé le 31
- En février → envoyé le 28 (ou 29)
- En avril → envoyé le 30

Le système adapte automatiquement au dernier jour du mois si nécessaire.

## Fonctionnement

### 1. Cron Job Automatique (Vercel)

Le cron est configuré dans `vercel.json` pour s'exécuter quotidiennement à 9h00 :

```json
{
  "crons": [
    {
      "path": "/api/inventory/send-monthly",
      "schedule": "0 9 * * *"
    }
  ]
}
```

La route vérifie :
1. Si l'envoi automatique est activé (setting `inventory_email_enabled`)
2. Si c'est le jour configuré (setting `inventory_email_send_day`)
3. Si c'est l'heure configurée (setting `inventory_email_send_time`)

Si toutes les conditions sont remplies → les emails sont envoyés.

### 2. API Routes

#### Envoi d'email

**Endpoint:** `POST /api/inventory/send-monthly`

**Authentification:**
- Header `Authorization: Bearer <token>` pour les admins (role ADMIN ou permission SETTINGS_EDIT)
- Header `x-cron-secret: <secret>` pour les appels cron automatiques

**Réponse:**
```json
{
  "success": true,
  "message": "3/3 emails envoyés avec succès",
  "recipients": 3,
  "errors": []
}
```

#### Configuration

**GET** `/api/admin/settings/inventory-email` — Récupérer la configuration

**POST** `/api/admin/settings/inventory-email` — Mettre à jour la configuration

```json
{
  "enabled": true,
  "sendDay": 28,
  "sendTime": "09:00"
}
```

### 3. Contenu de l'Email

Chaque email contient :
- **Sujet:** 📋 Rapport d'Inventaire — [Mois Année]
- **HTML:** Résumé visuel avec statistiques (KPIs colorés)
- **Pièces jointes:**
  - 📄 **PDF** — `Inventaire_[mois_annee].pdf`
    - KPIs (produits, variance, catégories, alertes)
    - Tableau détaillé de tous les produits
    - Statuts de stock (Disponible, Stock bas, Épuisé)
    - Variances et écarts
  - 📊 **Excel** — `Inventaire_[mois_annee].xlsx`
    - Feuille 1: Inventaire détaillé (avec toutes les données)
    - Feuille 2: Résumé par catégorie (agrégations)

## Configuration Requise

### Variables d'Environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
# Email (déjà configuré pour le système)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=votre-email@gmail.com
MAIL_PASS=votre-mot-de-passe-app
MAIL_FROM="Local Grill <noreply@localgrill.bf>"

# Pour les appels cron (sécurité)
CRON_SECRET=votre-secret-cron-securise

# URL de l'application (pour les liens dans les emails)
NEXT_PUBLIC_APP_URL=https://localgrill.bf
```

### Permissions

Les utilisateurs recevant l'email doivent avoir :
- Soit la permission directe `INVENTORY_VIEW`
- Soit un rôle contenant la permission `INVENTORY_VIEW`
- Un statut `ACTIVE`

## Utilisation Manuelle

### Via le script

```bash
npx ts-node scripts/send-inventory-email.ts
```

### Via l'interface admin (recommandé)

Allez dans **Paramètres > Email Inventaire** et utilisez la section "Email de test" :
- Remplissez l'email pour un envoi ciblé à un utilisateur spécifique
- Laissez vide pour envoyer à tous les utilisateurs avec INVENTORY_VIEW
- Cliquez sur **"Envoyer un test"**

### Via curl — Envoi normal (à tous)

```bash
curl -X POST https://votre-app.com/api/inventory/send-monthly \
  -H "Authorization: Bearer <votre-token-admin>"
```

### Via curl — Envoi de test (à un email spécifique)

```bash
curl -X POST https://votre-app.com/api/inventory/send-monthly \
  -H "Authorization: Bearer <votre-token-admin>" \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "admin@localgrill-bf.com"}'
```

> **Note :** L'email de test doit correspondre à un utilisateur actif ayant la permission INVENTORY_VIEW.

### Via l'API avec cron secret

```bash
curl -X POST https://votre-app.com/api/inventory/send-monthly \
  -H "x-cron-secret: votre-secret-cron"
```

## Fichiers Créés / Modifiés

```
lib/constants/inventoryEmailSettings.ts      # Constantes et utilitaires
lib/services/inventoryMailService.ts           # Logique d'envoi d'email
app/api/inventory/send-monthly/route.ts      # API Route d'envoi
app/api/admin/settings/inventory-email/     # API Route de configuration
  └─ route.ts
app/admin/settings/page.tsx                  # Ajout onglet "Email Inventaire"
scripts/send-inventory-email.ts              # Script manuel
docs/INVENTORY_EMAIL.md                      # Cette documentation
vercel.json                                  # Configuration cron
```

## Paramètres Stockés (table `setting`)

| Clé | Description | Valeur par défaut |
|-----|-------------|-------------------|
| `inventory_email_enabled` | Activation de l'envoi | `true` |
| `inventory_email_send_day` | Jour du mois (1-31) | `28` |
| `inventory_email_send_time` | Heure d'envoi | `09:00` |
| `inventory_email_last_sent` | Timestamp du dernier envoi | `null` |

## Tests

Pour tester sans envoyer d'emails réels :

1. Vérifiez que les utilisateurs avec `INVENTORY_VIEW` sont bien détectés
2. Générez le PDF et vérifiez son contenu
3. Utilisez un service comme [Ethereal Email](https://ethereal.email) pour tester les emails

## Dépannage

### Les emails ne sont pas envoyés

Vérifiez les logs Vercel :
1. Allez dans votre dashboard Vercel
2. Consultez les logs de la fonction `/api/inventory/send-monthly`

### Problèmes courants

| Problème | Solution |
|----------|----------|
| "Aucun utilisateur avec INVENTORY_VIEW" | Vérifiez que des utilisateurs ont cette permission dans la base de données |
| "Erreur SMTP" | Vérifiez vos variables d'environnement MAIL_* |
| "Non autorisé" | Vérifiez que CRON_SECRET est correctement défini |

## Personnalisation

### Modifier l'heure d'envoi

Modifiez le cron dans `vercel.json` :
- Format: `minute heure jour-mois mois jour-semaine`
- Exemple pour 8h00: `"0 8 28-31 * *"`
- Exemple pour 14h30: `"30 14 28-31 * *"`

### Modifier le contenu du PDF

Modifiez la fonction `generateInventoryPDF()` dans `lib/services/inventoryMailService.ts`.

### Modifier le template HTML

Modifiez la variable `htmlContent` dans `sendMonthlyInventoryEmail()`.

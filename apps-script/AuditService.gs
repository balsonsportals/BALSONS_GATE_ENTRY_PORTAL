/**
 * BALSONS JTRWF GATE ENTRY & SITE ACCESS PORTAL
 * Audit Service — Immutable System Ledger
 * Architecture: BALSONS-SAM-2026 (Locked)
 */

const AuditService = {
  /**
   * Log an event into the AUDIT_LOG sheet
   */
  log: function(actorId, actorRole, action, entityId, outcome, details) {
    try {
      var ssId = CONFIG.getSpreadsheetId();
      if (!ssId) return;

      var ss = SpreadsheetApp.openById(ssId);
      var sheet = ss.getSheetByName('AUDIT_LOG');
      if (!sheet) return;

      var auditId = 'AUD-' + new Date().getFullYear() + '-' + Utilities.getUuid().substring(0, 8).toUpperCase();
      var timestamp = new Date().toISOString();
      var detailsStr = (typeof details === 'object') ? JSON.stringify(details) : (details || '');

      sheet.appendRow([
        auditId,
        timestamp,
        actorId || 'SYSTEM',
        actorRole || 'SYSTEM',
        action || 'UNKNOWN',
        entityId || '-',
        outcome || 'INFO',
        detailsStr
      ]);
    } catch (err) {
      Logger.log('AuditService Error: ' + err.message);
    }
  }
};

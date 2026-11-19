/**
 * BALSONS JTRWF GATE ENTRY & SITE ACCESS PORTAL
 * Apps Script Backend API — Master Dispatcher
 * Architecture: BALSONS-SAM-2026 (Locked)
 */

const CONFIG = {
  PROJECT_ID: 'PRJ-JTRWF-SCHULER',
  SYSTEM_NAME: 'BALSONS JTRWF Gate Entry & Site Access Portal',
  VERSION: '1.2.0-auth',
  ENV: 'staging',
  AUTH_HEADER_KEY: 'BALSONS_JTRWF_GATE_PHASE0_DEV_KEY',
  DEFAULT_SPREADSHEET_ID: '1yAuZOXc8WoC2TvTvnEWMrOyLl_50BRuJgDed_pdFT3o',
  
  getSpreadsheetId: function() {
    return PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || this.DEFAULT_SPREADSHEET_ID;
  }
};

/**
 * Handle HTTP GET Requests (Public Health Check & Gateway Info)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'health';
  var response = {
    success: true,
    status: 200,
    system: CONFIG.SYSTEM_NAME,
    version: CONFIG.VERSION,
    action: action,
    serverTimestamp: new Date().toISOString(),
    message: 'BALSONS Apps Script API Gateway is ACTIVE'
  };

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle HTTP POST Requests (Authenticated API Endpoints)
 * Bypasses browser CORS OPTIONS preflight by consuming text/plain JSON payloads
 */
function doPost(e) {
  var startTime = new Date().getTime();
  var rawContent = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
  var request = {};
  
  try {
    request = JSON.parse(rawContent);
  } catch (err) {
    return createJsonResponse({
      success: false,
      status: 400,
      error: { code: 'INVALID_JSON', message: 'Malformed JSON payload: ' + err.message }
    });
  }

  var action = request.action || 'system.ping';
  var requestId = request.requestId || 'req_' + startTime;
  var authToken = request.authToken || '';
  var payload = request.payload || {};

  // Public Actions (No Auth Required)
  var PUBLIC_ACTIONS = ['system.public_ping', 'system.ping', 'auth.login'];
  
  var session = null;
  if (PUBLIC_ACTIONS.indexOf(action) === -1) {
    // Check if token is Phase 0 dev token or an active user session token
    if (authToken === CONFIG.AUTH_HEADER_KEY) {
      session = { userId: 'DEV_CLI', username: 'dev.cli', fullName: 'Phase 0 Test Harness', role: 'Owner' };
    } else {
      session = AuthService.validateSession(authToken);
      if (!session) {
        return createJsonResponse({
          success: false,
          status: 401,
          requestId: requestId,
          action: action,
          error: { code: 'AUTH_REQUIRED', message: 'Session expired or unauthorized. Please log in.' }
        });
      }
    }
  }

  // Action Dispatcher
  var responseData = {};
  try {
    switch (action) {
      case 'system.public_ping':
      case 'system.ping':
        responseData = {
          message: 'Transport Handshake Active.',
          clientTimestamp: request.timestamp || null,
          transportProtocol: 'POST / text/plain (CORS preflight-safe)',
          environment: CONFIG.ENV
        };
        break;

      case 'system.db_probe':
        var ssId = CONFIG.getSpreadsheetId();
        var sheetCount = 0;
        var sheetNames = [];
        var statusMsg = 'Database not linked.';
        if (ssId) {
          try {
            var ss = SpreadsheetApp.openById(ssId);
            var sheets = ss.getSheets();
            sheetCount = sheets.length;
            sheetNames = sheets.map(function(s) { return s.getName(); });
            statusMsg = 'Connected to: ' + ss.getName() + ' (' + sheetCount + ' sheets found)';
          } catch (dbErr) {
            statusMsg = 'Database connection error: ' + dbErr.message;
          }
        }
        responseData = {
          databaseLinked: Boolean(ssId && sheetCount > 0),
          spreadsheetId: ssId,
          sheetCount: sheetCount,
          sheetNames: sheetNames,
          statusMessage: statusMsg
        };
        break;

      // ─── AUTHENTICATION ROUTES ──────────────────────────────────────────
      case 'auth.login':
        responseData = AuthService.login(payload.username, payload.password);
        break;

      case 'auth.validate_session':
        responseData = {
          valid: true,
          user: session
        };
        break;

      case 'auth.logout':
        responseData = AuthService.logout(authToken);
        break;

      case 'auth.seed_users':
        if (session.role !== 'Owner') {
          return createJsonResponse({
            success: false,
            status: 403,
            error: { code: 'ACCESS_DENIED', message: 'Owner permission required.' }
          });
        }
        AuthService.seedDefaultUsersIfEmpty();
        responseData = { message: 'Default accounts seeded if empty.' };
        break;

      default:
        return createJsonResponse({
          success: false,
          status: 404,
          requestId: requestId,
          action: action,
          error: { code: 'UNKNOWN_ACTION', message: 'Action not recognized: ' + action }
        });
    }

    return createJsonResponse({
      success: true,
      status: 200,
      requestId: requestId,
      action: action,
      serverTimestamp: new Date().toISOString(),
      durationMs: (new Date().getTime() - startTime),
      data: responseData
    });

  } catch (execErr) {
    return createJsonResponse({
      success: false,
      status: 500,
      requestId: requestId,
      action: action,
      error: { code: 'SERVER_EXCEPTION', message: execErr.message }
    });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

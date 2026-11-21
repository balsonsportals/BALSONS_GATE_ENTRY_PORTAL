/**
 * BALSONS JTRWF Gate Entry & Site Access Portal
 * SAM-2026 API Client Transport Layer
 * Bypasses CORS Preflight (OPTIONS) by using POST with Content-Type: text/plain
 */

const BalsonsApi = {
  /**
   * Send an authenticated API request
   */
  send: async function(action, payload = {}, customToken = null) {
    const startTime = performance.now();
    const requestId = 'req_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const authToken = customToken !== null ? customToken : APP_CONFIG.DEV_AUTH_TOKEN;

    const requestEnvelope = {
      action: action,
      requestId: requestId,
      authToken: authToken,
      environment: APP_CONFIG.ENVIRONMENT,
      timestamp: new Date().toISOString(),
      payload: payload
    };

    try {
      const response = await fetch(APP_CONFIG.BACKEND_API_URL, {
        method: 'POST',
        // Critical: text/plain prevents the browser from triggering an HTTP OPTIONS preflight
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        redirect: 'follow',
        body: JSON.stringify(requestEnvelope)
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (!response.ok && response.status !== 302) {
        throw new Error(`HTTP Transport Error: ${response.status} ${response.statusText}`);
      }

      let jsonResponse;
      try {
        jsonResponse = await response.json();
      } catch (jsonErr) {
        throw new Error(`Invalid JSON payload from Google Apps Script: ${jsonErr.message}`);
      }
      jsonResponse.clientDurationMs = durationMs;
      return jsonResponse;

    } catch (err) {
      return {
        success: false,
        status: 0,
        requestId: requestId,
        action: action,
        clientDurationMs: Math.round(performance.now() - startTime),
        error: {
          code: 'TRANSPORT_FETCH_ERROR',
          message: err.message || 'Network / CORS Error communicating with Google Apps Script'
        }
      };
    }
  },

  /**
   * Universal Dispatch Call for Gate Entry frontend actions
   * Bridges frontend views calling BalsonsApi.call(...) to send()
   */
  call: async function(action, payload = {}, customToken = null) {
    const token = customToken !== null ? customToken : (typeof BalsonsAuth !== 'undefined' && BalsonsAuth.getToken ? (BalsonsAuth.getToken() || APP_CONFIG.DEV_AUTH_TOKEN) : APP_CONFIG.DEV_AUTH_TOKEN);
    return this.send(action, payload, token);
  },

  /**
   * Public health ping using GET
   */
  healthCheck: async function() {
    try {
      const url = `${APP_CONFIG.BACKEND_API_URL}?action=health`;
      const response = await fetch(url, { redirect: 'follow' });
      return await response.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

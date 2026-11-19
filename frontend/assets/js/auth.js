/**
 * BALSONS JTRWF Gate Entry & Site Access Portal
 * Client Authentication & Session Manager (SAM-2026)
 */

const BalsonsAuth = {
  SESSION_STORAGE_KEY: 'balsons_gate_session',

  /**
   * Get active session from sessionStorage (zero persistence to localStorage for security)
   */
  getSession: function() {
    try {
      const raw = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Check if user is currently logged in
   */
  isLoggedIn: function() {
    const session = this.getSession();
    return Boolean(session && session.sessionToken);
  },

  /**
   * Get active user profile
   */
  getUser: function() {
    const session = this.getSession();
    return session ? session.user : null;
  },

  /**
   * Get active session token
   */
  getToken: function() {
    const session = this.getSession();
    return session ? session.sessionToken : null;
  },

  /**
   * Login user
   */
  login: async function(username, password) {
    const res = await BalsonsApi.send('auth.login', {
      username: username,
      password: password
    });

    if (res.success && res.data && res.data.sessionToken) {
      sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(res.data));
      return { success: true, user: res.data.user };
    } else {
      return {
        success: false,
        message: (res.error && res.error.message) ? res.error.message : 'Invalid credentials or login failed.'
      };
    }
  },

  /**
   * Logout user
   */
  logout: async function() {
    const token = this.getToken();
    if (token) {
      try {
        await BalsonsApi.send('auth.logout', {}, token);
      } catch (e) {
        // Ignore network errors on logout
      }
    }
    sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
    window.location.reload();
  },

  /**
   * Check session validity with the backend
   */
  validateSessionWithServer: async function() {
    const token = this.getToken();
    if (!token) return false;

    const res = await BalsonsApi.send('auth.validate_session', {}, token);
    if (!res.success || res.status === 401) {
      sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
      return false;
    }
    return true;
  }
};

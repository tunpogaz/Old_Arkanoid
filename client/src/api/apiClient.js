// REST API Client for Arkanoid Spring Boot Backend
const API_BASE = 'http://localhost:8080/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('arkanoid_token') || null;
    this.username = localStorage.getItem('arkanoid_user') || null;
  }

  isLoggedIn() {
    return !!this.token;
  }

  getUser() {
    return this.username;
  }

  setSession(token, username) {
    this.token = token;
    this.username = username;
    localStorage.setItem('arkanoid_token', token);
    localStorage.setItem('arkanoid_user', username);
  }

  logout() {
    this.token = null;
    this.username = null;
    localStorage.removeItem('arkanoid_token');
    localStorage.removeItem('arkanoid_user');
  }

  async register(username, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    if (data.token) this.setSession(data.token, data.username);
    return data;
  }

  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    if (data.token) this.setSession(data.token, data.username);
    return data;
  }

  async getLeaderboard(limit = 10) {
    try {
      const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.warn("Backend not reachable for leaderboard:", e);
      return [];
    }
  }

  async submitScore(score, levelReached, maxCombo = 0) {
    if (!this.token) return null;
    try {
      const res = await fetch(`${API_BASE}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ score, levelReached, maxCombo })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn("Failed to submit score:", e);
      return null;
    }
  }
}

export const api = new ApiClient();

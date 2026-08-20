import axios from "axios";

// Change this if your backend runs on a different host/port.
const API_BASE_URL = "https://genhub-1zle.onrender.com";

const client = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("genhub_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function saveSession(token, role) {
  localStorage.setItem("genhub_token", token);
  localStorage.setItem("genhub_role", role);
}

export function clearSession() {
  localStorage.removeItem("genhub_token");
  localStorage.removeItem("genhub_role");
}

export function getRole() {
  return localStorage.getItem("genhub_role");
}

export default client;

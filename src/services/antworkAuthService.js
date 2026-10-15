const TOKEN_KEY = 'ACCESS_TOKEN';
const TOKEN_EXPIRY_KEY = 'TOKEN_EXPIRY';

// Token is minted server-side (api/antwork-token.js) — Azure blocks client_credentials from the browser
const TOKEN_URL = '/api/antwork-token';

export const getStoredToken = async () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const isTokenExpired = async () => {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!expiry) {
    return true;
  }

  return Date.now() >= Number(expiry);
};

export const fetchAccessToken = async () => {
  try {
    const response = await fetch(TOKEN_URL, { method: 'POST' });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || 'Token fetch failed');
    }

    const accessToken = data.access_token;
    const expiresIn = data.expires_in;

    const expiryTime = Date.now() + (expiresIn - 60) * 1000;

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

    return accessToken;
  } catch (error) {
    console.log('Token Error:', error);
    throw error;
  }
};

export const getValidToken = async () => {
  const token = await getStoredToken();
  const expired = await isTokenExpired();

  if (!token || expired) {
    return fetchAccessToken();
  }

  return token;
};

export const clearAuthData = async () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

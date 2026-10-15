// Shared by the Vercel function (api/antwork-token.js) and the Vite dev middleware (vite.config.js).
// Runs server-side only, so the client secret never reaches the browser bundle.

export async function requestAntworkToken(env) {
  const tenantId = env.ANTWORK_TENANT_ID || env.VITE_ANTWORK_TENANT_ID;
  const clientId = env.ANTWORK_CLIENT_ID || env.VITE_ANTWORK_CLIENT_ID;
  const clientSecret = env.ANTWORK_CLIENT_SECRET || env.VITE_ANTWORK_CLIENT_SECRET;
  const scope = env.ANTWORK_SCOPE || env.VITE_ANTWORK_SCOPE;

  if (!tenantId || !clientId || !clientSecret || !scope) {
    return { status: 500, body: { error: 'Antwork credentials are not configured on the server' } };
  }

  const formData = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope,
    grant_type: 'client_credentials',
  });

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      status: response.status,
      body: { error: data?.error_description || data?.error || 'Token fetch failed' },
    };
  }

  return {
    status: 200,
    body: { access_token: data.access_token, expires_in: data.expires_in },
  };
}

// login.js
// Небольшие вспомогательные функции — логин делает простой request к /_matrix/client/r0/login,
// но в этом демо поддержан и режим "ввести access token" вручную.

function loginWithPassword(homeserver, username, password) {
  // Возвращает промис с объектом { access_token, user_id, ... }
  if (!homeserver) homeserver = 'https://matrix.org';
  const url = (homeserver.replace(/\/$/, '') + '/_matrix/client/r0/login');
  const body = {
    type: "m.login.password",
    user: username,
    password: password
  };
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => {
    if (!r.ok) throw new Error('Login failed: ' + r.status);
    return r.json();
  });
}

function validateHomeserver(url) {
  if (!url) return 'https://matrix.org';
  return url;
}

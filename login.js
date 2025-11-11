// ЛОГИН
async function login() {
  this.error = '';
  try {
    const res = await fetch('https://matrix-client.matrix.org/_matrix/client/r0/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'm.login.password',
        user: this.username,
        password: this.password
      })
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Login failed');
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    this.userId = data.user_id;
    await this.fetchRoomsWithNames();
  } catch (e) {
    console.error(e);
    this.error = 'Login error';
  }
}

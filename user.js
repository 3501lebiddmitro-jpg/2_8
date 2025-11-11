// ИНВАЙТЫ и ВСТУПЛЕНИЕ В КОМНАТЫ — перенесено из "sidebar" в "user" компонент

async function inviteUserToRoom() {
  if (!this.accessToken || !this.roomId || !this.inviteUser) return;
  try {
    const res = await fetch(
      `https://matrix-client.matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/invite`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: this.inviteUser })
      }
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Invite failed');
    }
    this.inviteUser = '';
  } catch (e) {
    console.error('inviteUserToRoom error', e);
  }
}

async function joinRoom() {
  if (!this.accessToken || !this.joinRoomId) return;
  try {
    const res = await fetch(
      `https://matrix-client.matrix.org/_matrix/client/r0/join/${encodeURIComponent(this.joinRoomId)}`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Join failed');
    }
    this.joinRoomId = '';
    await this.fetchRoomsWithNames();
  } catch (e) {
    console.error('joinRoom error', e);
  }
}

// Загрузка участников текущей комнаты
async function fetchRoomMembers() {
  if (!this.accessToken || !this.roomId) return;

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/joined_members`,
      { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
    );
    const data = await res.json();

    // data.joined — объект { "@user:matrix.org": { display_name: "...", avatar_url: "..." } }
    this.roomMembers = Object.entries(data.joined || {}).map(([userId, info]) => ({
      userId,
      displayName: info.display_name || userId.split(':')[0].substring(1),
      avatarUrl: info.avatar_url
    }));
  } catch (e) {
    console.error('Error fetching room members:', e);
  }
}

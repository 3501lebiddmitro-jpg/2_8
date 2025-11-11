// РАБОТА С КОМНАТАМИ

async function createRoom() {
  if (!this.accessToken || !this.newRoomName) return;
  try {
    const res = await fetch('https://matrix-client.matrix.org/_matrix/client/r0/createRoom', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: this.newRoomName, visibility: 'private' })
    });
    const data = await res.json();
    this.newRoomId = data.room_id || '';
    this.newRoomName = '';
    await this.fetchRoomsWithNames();
  } catch (e) {
    console.error('createRoom error', e);
  }
}

// Получение списка комнат + имена
async function fetchRoomsWithNames() {
  if (!this.accessToken) return;
  try {
    // Список комнат
    const res = await fetch('https://matrix-client.matrix.org/_matrix/client/r0/joined_rooms', {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    const data = await res.json();
    const ids = data.joined_rooms || [];

    // Имена комнат пакетно (по state/name)
    const enriched = [];
    for (const id of ids) {
      let name = '';
      try {
        const rn = await fetch(
          `https://matrix-client.matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(id)}/state/m.room.name/`,
          { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
        );
        if (rn.ok) {
          const n = await rn.json();
          name = n.name || '';
        }
      } catch (_) {}
      enriched.push({ roomId: id, name });
    }
    this.rooms = enriched;
    // Автовыбор первой комнаты (по желанию)
    if (!this.roomId && this.rooms.length) {
      this.switchRoom(this.rooms[0].roomId);
    }
  } catch (e) {
    console.error('fetchRoomsWithNames error', e);
  }
}

// Переключение комнаты (добавлен вызов fetchRoomMembers)
function switchRoom(roomId) {
  if (roomId) this.roomId = roomId;
  this.messages = [];
  this.lastSyncToken = '';
  this.fetchMessages();
  this.fetchRoomMembers(); // ← Загружаем участников
}

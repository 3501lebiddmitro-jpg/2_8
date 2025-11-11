// ЧАТ: сообщения, отправка, вспомогательные штуки + корневой Alpine store

function getRoomName(id) {
  if (!id) return '';
  const r = this.rooms.find(r => r.roomId === id);
  return r?.name || id;
}

async function fetchMessages() {
  if (!this.accessToken || !this.roomId) return;

  try {
    const url = `https://matrix-client.matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/messages?dir=b&limit=30`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${this.accessToken}` } });
    const data = await res.json();

    // Нормализация в упрощённый формат
    const msgs = (data.chunk || [])
      .filter(e => e.type === 'm.room.message' && e.content?.body)
      .map(e => ({
        event_id: e.event_id,
        sender: e.sender,
        body: e.content.body
      }))
      .reverse();

    this.messages = msgs;
    this.lastSyncToken = data.end || '';
  } catch (e) {
    console.error('fetchMessages error', e);
  }
}

async function sendMessage() {
  if (!this.accessToken || !this.roomId || !this.newMessage.trim()) return;

  try {
    const txnId = Date.now();
    const url = `https://matrix-client.matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/send/m.room.message/${txnId}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        msgtype: 'm.text',
        body: this.newMessage.trim()
      })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || 'Send failed');
    }
    this.newMessage = '';
    await this.fetchMessages();
  } catch (e) {
    console.error('sendMessage error', e);
  }
}

// Загрузка html-парциалов (sidebar.html / user.html) и инициализация стора
function chatApp() {
  return {
    // STATE
    username: '',
    password: '',
    accessToken: '',
    userId: '',
    roomId: '',
    joinRoomId: '',
    newRoomName: '',
    newRoomId: '',
    rooms: [],
    messages: [],
    newMessage: '',
    inviteUser: '',
    error: '',
    lastSyncToken: '',
    roomMembers: [],
    partials: { sidebar: '', user: '' },

    // METHODS
    login,
    createRoom,
    fetchRoomsWithNames,
    joinRoom,
    inviteUserToRoom,
    getRoomName,
    switchRoom,
    sendMessage,
    fetchMessages,
    fetchRoomMembers,

    async init() {
      await this.loadPartials();
    },

    async loadPartials() {
      try {
        const [sb, us] = await Promise.all([
          fetch('./sidebar.html').then(r => r.text()),
          fetch('./user.html').then(r => r.text())
        ]);
        this.partials.sidebar = sb;
        this.partials.user = us;
      } catch (e) {
        console.error('partials load error', e);
      }
    }
  };
}

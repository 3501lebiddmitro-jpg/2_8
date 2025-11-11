// ЕДИНЫЙ Alpine-компонент приложения
function chatApp() {
  return {
    // ===== STATE =====
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

    // ===== LIFECYCLE =====
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
    },

    // ===== METHODS (ВСЕ ВНУТРИ ОБЪЕКТА!) =====
    async login() {
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
    },

    async createRoom() {
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
    },

    async fetchRoomsWithNames() {
      if (!this.accessToken) return;
      try {
        const res = await fetch('https://matrix-client.matrix.org/_matrix/client/r0/joined_rooms', {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        const data = await res.json();
        const ids = data.joined_rooms || [];

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

        if (!this.roomId && this.rooms.length) {
          this.switchRoom(this.rooms[0].roomId);
        }
      } catch (e) {
        console.error('fetchRoomsWithNames error', e);
      }
    },

    switchRoom(roomId) {
      if (roomId) this.roomId = roomId;
      this.messages = [];
      this.lastSyncToken = '';
      this.fetchMessages();
      this.fetchRoomMembers();
    },

    async inviteUserToRoom() {
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
    },

    async joinRoom() {
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
    },

    async fetchRoomMembers() {
      if (!this.accessToken || !this.roomId) return;
      try {
        const res = await fetch(
          `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/joined_members`,
          { headers: { 'Authorization': `Bearer ${this.accessToken}` } }
        );
        const data = await res.json();
        this.roomMembers = Object.entries(data.joined || {}).map(([userId, info]) => ({
          userId,
          displayName: info.display_name || userId.split(':')[0].substring(1),
          avatarUrl: info.avatar_url
        }));
      } catch (e) {
        console.error('Error fetching room members:', e);
      }
    },

    getRoomName(id) {
      if (!id) return '';
      const r = this.rooms.find(r => r.roomId === id);
      return r?.name || id;
    },

    async fetchMessages() {
      if (!this.accessToken || !this.roomId) return;
      try {
        const url = `https://matrix-client.matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/messages?dir=b&limit=30`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${this.accessToken}` } });
        const data = await res.json();

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
    },

    async sendMessage() {
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
          body: JSON.stringify({ msgtype: 'm.text', body: this.newMessage.trim() })
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
  };
}

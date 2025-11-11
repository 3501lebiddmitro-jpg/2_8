// Сделать доступным глобально для Alpine: window.chatApp = function() { ... }
window.chatApp = function () {
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
          fetch('./sidebar.html').then(r => r.ok ? r.text() : ''),
          fetch('./user.html').then(r => r.ok ? r.text() : '')
        ]);
        this.partials.sidebar = sb || `
          <div class="room-list space-y-1 px-4">
            <ul class="sidebar-list">
              <template x-for="room in rooms" :key="room.roomId">
                <li
                  @click="switchRoom(room.roomId)"
                  :class="{ 'active': room.roomId === roomId }"
                  x-text="room.name || room.roomId"
                  class="cursor-pointer rounded-lg"
                ></li>
              </template>
            </ul>
            <div class="mt-4">
              <input x-model="newRoomName" placeholder="New room name" class="border p-2 w-full mb-2 rounded">
              <button @click="createRoom()" class="bg-indigo-500 text-white p-2 w-full rounded hover:bg-indigo-600 transition">Create Room</button>
              <p x-show="newRoomId" class="text-sm text-gray-600 mt-1">Room ID: <span x-text="newRoomId"></span></p>
            </div>
          </div>`;
        this.partials.user = us || `
          <template x-if="accessToken && roomId">
            <div class="mt-6 p-4 bg-gray-100 rounded-lg">
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Учасники кімнати</h3>
              <template x-if="roomMembers.length === 0">
                <p class="text-xs text-gray-500">Завантаження...</p>
              </template>
              <ul class="text-xs space-y-1">
                <template x-for="member in roomMembers" :key="member.userId">
                  <li class="flex items-center space-x-2">
                    <span class="font-medium" x-text="member.displayName"></span>
                    <span class="text-gray-500" x-text="'(' + member.userId.split(':')[0].substring(1) + ')'"></span>
                  </li>
                </template>
              </ul>
            </div>
          </template>
          <div class="space-y-2 mt-4">
            <div>
              <input x-model="inviteUser" placeholder="Invite user (e.g., @user:matrix.org)" class="border p-2 w-full mb-1 rounded">
              <button @click="inviteUserToRoom()" class="bg-purple-500 text-white p-2 w-full rounded hover:bg-purple-600 transition">Invite</button>
            </div>
            <div>
              <input x-model="joinRoomId" placeholder="Room ID to join (e.g., !roomId:matrix.org)" class="border p-2 w-full mb-1 rounded">
              <button @click="joinRoom()" class="bg-yellow-500 text-white p-2 w-full rounded hover:bg-yellow-600 transition">Join Room</button>
            </div>
          </div>`;
      } catch (e) {
        console.error('partials load error', e);
      }
    },

    // ===== METHODS =====
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
};

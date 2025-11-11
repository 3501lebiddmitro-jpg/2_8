// chat.js
// Основной файл приложения. Экспортирует chatApp() — функцию, используемую Alpine.js.

function chatApp() {
  return {
    homeserver: 'https://matrix.org',
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
    showLogin: true,

    // Инициализация - попытаемся подгрузить доступные комнаты (если токен есть)
    async init() {
      if (this.accessToken) {
        await this.fetchRoomsWithNames();
      }
    },

    // Login: если введён токен (в password), используем как access token.
    async login() {
      this.error = '';
      if (!this.username && !this.password) {
        this.error = 'Введите логин/пароль или access token';
        return;
      }
      try {
        // Если password выглядит как токен (просто примем), то используем напрямую.
        if (this.password && this.password.startsWith('eyJ') ) {
          // может быть JWT-like — используем как токен
          this.accessToken = this.password;
          this.userId = this.username || '';
          await this.fetchRoomsWithNames();
          this.showLogin = false;
          return;
        }

        // Иначе пробуем войти через password flow
        const res = await loginWithPassword(this.homeserver, this.username, this.password);
        this.accessToken = res.access_token;
        this.userId = res.user_id || this.username;
        this.showLogin = false;
        await this.fetchRoomsWithNames();
      } catch (e) {
        console.error('Login error', e);
        this.error = 'Login failed: ' + (e.message || e);
      }
    },

    async loginAsGuest() {
      // Минимальная симуляция гостя: не используем access token, но пометим, что залогинены
      this.accessToken = '';
      this.userId = 'guest';
      this.showLogin = false;
      await this.fetchRoomsWithNames();
    },

    logout() {
      this.accessToken = '';
      this.userId = '';
      this.rooms = [];
      this.roomId = '';
      this.messages = [];
      this.roomMembers = [];
      this.showLogin = true;
    },

    async createRoom() {
      if (!this.accessToken) { this.error = 'You must be logged in to create a room.'; return; }
      const name = this.newRoomName || 'New room';
      try {
        const url = this.homeserver.replace(/\/$/, '') + '/_matrix/client/r0/createRoom';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await res.json();
        this.newRoomId = data.room_id || '';
        // Обновим список комнат
        await this.fetchRoomsWithNames();
      } catch (e) {
        console.error('createRoom', e);
        this.error = 'Create room failed';
      }
    },

    async fetchRoomsWithNames() {
      if (!this.accessToken) {
        // без токена — список пуст
        this.rooms = [];
        return;
      }
      const roomIds = await fetchRooms(this.accessToken, this.homeserver);
      const arr = [];
      for (const rid of roomIds) {
        const name = await fetchRoomName(this.accessToken, this.homeserver, rid);
        arr.push({ roomId: rid, name });
      }
      this.rooms = arr;
    },

    async joinRoom() {
      if (!this.accessToken) {
        this.error = 'Login required to join rooms';
        return;
      }
      if (!this.joinRoomId) {
        this.error = 'Provide room ID';
        return;
      }
      try {
        const url = `${this.homeserver.replace(/\/$/, '')}/_matrix/client/r0/rooms/${encodeURIComponent(this.joinRoomId)}/join`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        if (!res.ok) throw new Error('Join failed: ' + res.status);
        await this.fetchRoomsWithNames();
        this.joinRoomId = '';
      } catch (e) {
        console.error('joinRoom', e);
        this.error = 'Join room failed';
      }
    },

    async inviteUserToRoom() {
      if (!this.accessToken || !this.roomId) { this.error = 'You must be in a room to invite users'; return; }
      if (!this.inviteUser) { this.error = 'Provide user id to invite'; return; }
      try {
        const url = `${this.homeserver.replace(/\/$/, '')}/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/invite`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: this.inviteUser })
        });
        if (!res.ok) throw new Error('Invite failed');
        this.inviteUser = '';
        // Обновляем участников
        await this.fetchRoomMembers();
      } catch (e) {
        console.error('inviteUserToRoom', e);
        this.error = 'Invite failed';
      }
    },

    getRoomName(roomId) {
      const r = this.rooms.find(r => r.roomId === roomId);
      return r ? r.name : roomId;
    },

    async switchRoom(roomId) {
      if (!roomId) return;
      this.roomId = roomId;
      this.messages = [];
      this.lastSyncToken = '';
      await this.fetchMessages();
      await this.fetchRoomMembers(); // ← Загружаем участников, как в задании
    },

    async sendMessage() {
      if (!this.newMessage || !this.roomId) return;
      if (!this.accessToken) {
        // просто локально добавим
        this.messages.push({ sender: this.userId || 'me', body: this.newMessage, event_id: Date.now().toString() });
        this.newMessage = '';
        return;
      }
      try {
        const txn = 'm' + Date.now();
        const url = `${this.homeserver.replace(/\/$/, '')}/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/send/m.room.message/${txn}`;
        const body = { msgtype: "m.text", body: this.newMessage };
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('send failed: ' + res.status);
        const data = await res.json();
        // Добавим локально для отображения
        this.messages.push({ sender: this.userId || 'me', body: this.newMessage, event_id: data.event_id || txn });
        this.newMessage = '';
        // автоскрол
        this.$nextTick(() => {
          try { this.$refs.messagesBox.scrollTop = this.$refs.messagesBox.scrollHeight; } catch(e){}
        });
      } catch (e) {
        console.error('sendMessage', e);
        this.error = 'Send failed';
      }
    },

    async fetchMessages() {
      // Простейшая реализация: используем /messages или /sync. Для демо мы попытаемся сделать /sync с limit маленьким.
      if (!this.accessToken || !this.roomId) return;
      try {
        const url = `${this.homeserver.replace(/\/$/, '')}/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/messages?dir=b&limit=20`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${this.accessToken}` } });
        if (!res.ok) { console.warn('fetch messages status', res.status); return; }
        const data = await res.json();
        // data.chunk — массив событий
        const events = data.chunk || [];
        this.messages = events.map(ev => {
          let body = '';
          if (ev.content && ev.content.body) body = ev.content.body;
          else body = JSON.stringify(ev.content || {});
          return { sender: ev.sender || '', body, event_id: ev.event_id };
        }).reverse();
        // scroll to bottom
        this.$nextTick(() => {
          try { this.$refs.messagesBox.scrollTop = this.$refs.messagesBox.scrollHeight; } catch(e){}
        });
      } catch (e) {
        console.error('fetchMessages', e);
      }
    },

    async fetchRoomMembers() {
      if (!this.accessToken || !this.roomId) {
        this.roomMembers = [];
        return;
      }
      try {
        const res = await fetch(
          `${this.homeserver.replace(/\/$/, '')}/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/joined_members`,
          {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
          }
        );
        if (!res.ok) throw new Error('members fetch failed: ' + res.status);
        const data = await res.json();
        // data.joined — object { "@user:matrix.org": { display_name: "...", ... } }
        this.roomMembers = Object.entries(data.joined || {}).map(([userId, info]) => ({
          userId,
          displayName: info.display_name || userId.split(':')[0].substring(1),
          avatarUrl: info.avatar_url
        }));
      } catch (e) {
        console.error('Error fetching room members:', e);
        this.roomMembers = [];
      }
    }
  }
}

// register init for Alpine when DOM is ready
document.addEventListener('alpine:init', () => {
  // nothing to do here because we return the object via x-data="chatApp()"
});

function chatApp() {
  return {
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

    init() {
      const t = localStorage.getItem('matrix_access_token');
      if (t) this.accessToken = t;

      this.rooms = [
        { roomId: '!demoRoom1:matrix.org', name: 'General (demo)' },
        { roomId: '!demoRoom2:matrix.org', name: 'Random (demo)' }
      ];

      if (this.accessToken) this.fetchProfile();
    },

    loginDemo() {
      this.accessToken = 'demo-token';
      this.userId = '@demo:example';
      localStorage.setItem('matrix_access_token', this.accessToken);
    },

    logout() {
      this.accessToken = '';
      this.userId = '';
      localStorage.removeItem('matrix_access_token');
    },

    async fetchProfile() {
      if (!this.accessToken || this.accessToken === 'demo-token') {
        this.userId = '@demo:example';
        return;
      }
      try {
        const res = await fetch('https://matrix.org/_matrix/client/r0/account/whoami', {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        const data = await res.json();
        if (data.user_id) this.userId = data.user_id;
      } catch (e) {
        console.error('fetchProfile error', e);
      }
    },

    getRoomName(roomId) {
      const r = this.rooms.find(x => x.roomId === roomId);
      return r ? (r.name || r.roomId) : roomId;
    },

    async createRoom() {
      if (!this.newRoomName) {
        alert('Enter a room name');
        return;
      }
      const id = `!${Math.random().toString(36).slice(2,9)}:local`;
      this.rooms.push({ roomId: id, name: this.newRoomName });
      this.newRoomId = id;
      this.newRoomName = '';
      this.switchRoom(id);
    },

    switchRoom(roomId) {
      if (roomId) this.roomId = roomId;
      this.fetchMessages();
      this.fetchRoomMembers();
      setTimeout(() => {
        const el = document.getElementById('messages-area');
        if (el) el.scrollTop = el.scrollHeight;
      }, 150);
    },

    async fetchMessages() {
      if (!this.roomId) {
        this.messages = [];
        return;
      }
      this.messages = [
        { event_id: '1', sender: '@alice:example', body: 'Welcome to ' + this.getRoomName(this.roomId) },
        { event_id: '2', sender: '@bob:example', body: 'This is a demo message.' }
      ];
    },

    async fetchRoomMembers() {
      this.roomMembers = [
        { userId: '@alice:example', displayName: 'Alice' },
        { userId: '@bob:example', displayName: 'Bob' }
      ];
    },

    async sendMessage() {
      if (!this.newMessage || !this.roomId) return;
      const evt = { event_id: Math.random().toString(36).slice(2), sender: this.userId || '@me:demo', body: this.newMessage };
      this.messages.push(evt);
      this.newMessage = '';
    }
  };
}

document.addEventListener('alpine:init', () => {
  window.Alpine.data('chatApp', chatApp);
});

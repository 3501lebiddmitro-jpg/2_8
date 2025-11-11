
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
      if (t) {
        this.accessToken = t;
      }
      this.rooms = [
        { roomId: '!demoRoom1:matrix.org', name: 'General (demo)' },
        { roomId: '!demoRoom2:matrix.org', name: 'Random (demo)' }
      ];

      if (this.accessToken) {
        this.fetchProfile();
      }
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
        this.userId = this.userId || '@demo:example';
        return;
      }
      try {
        const res = await fetch('https://matrix.org/_matrix/client/r0/account/whoami', {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.user_id) this.userId = data.user_id;
      } catch (e) {
        console.error('fetchProfile error', e);
      }
    },

    getRoomName(roomId) {
      const r = this.rooms.find(x => x.roomId === roomId);
      return r ? (r.name || r.roomId) : roomId;
    },

    async fetchRoomsWithNames() {
      return;
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

    async joinRoom() {
      if (!this.joinRoomId) {
        alert('Enter a room ID to join');
        return;
      }
      if (this.accessToken && this.accessToken !== 'demo-token') {
        try {
          const res = await fetch(`https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.joinRoomId)}/join`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          });
          if (!res.ok) {
            alert('Join failed: ' + res.status);
            return;
          }
          this.rooms.push({roomId: this.joinRoomId, name: this.joinRoomId});
          this.switchRoom(this.joinRoomId);
          this.joinRoomId = '';
        } catch (e) {
          console.error(e);
          alert('Join error: see console');
        }
      } else {
        this.rooms.push({ roomId: this.joinRoomId, name: this.joinRoomId });
        this.switchRoom(this.joinRoomId);
        this.joinRoomId = '';
      }
    },

    async inviteUserToRoom() {
      if (!this.inviteUser) {
        alert('Enter user to invite');
        return;
      }
      if (!this.roomId) {
        alert('Select a room first');
        return;
      }
      if (this.accessToken && this.accessToken !== 'demo-token') {
        try {
          const res = await fetch(`https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/invite`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: this.inviteUser })
          });
          if (!res.ok) {
            alert('Invite failed: ' + res.status);
          } else {
            alert('Invite sent');
          }
        } catch (e) {
          console.error(e);
          alert('Invite error: see console');
        }
      } else {
        alert('Demo: invite simulated');
      }
      this.inviteUser = '';
    },

    async fetchMessages() {
      if (!this.roomId) {
        this.messages = [];
        return;
      }
      if (this.accessToken && this.accessToken !== 'demo-token') {
        this.messages = [];
      } else {
        this.messages = [
          { event_id: '1', sender: '@alice:example', body: 'Welcome to ' + this.getRoomName(this.roomId) },
          { event_id: '2', sender: '@bob:example', body: 'This is a demo message.' }
        ];
      }
    },

    async fetchRoomMembers() {
      if (!this.accessToken || !this.roomId || this.accessToken === 'demo-token') {
        this.roomMembers = [
          { userId: '@alice:example', displayName: 'Alice' },
          { userId: '@bob:example', displayName: 'Bob' }
        ];
        return;
      }

      try {
        const res = await fetch(
          `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/joined_members`,
          {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
          }
        );
        const data = await res.json();
        this.roomMembers = Object.entries(data.joined || {}).map(([userId, info]) => ({
          userId,
          displayName: info.display_name || userId.split(':')[0].substring(1),
          avatarUrl: info.avatar_url
        }));
      } catch (e) {
        console.error('Error fetching room members:', e);
        this.roomMembers = [];
      }
    },

    switchRoom(roomId) {
      if (roomId) this.roomId = roomId;
      this.messages = [];
      this.lastSyncToken = '';
      this.fetchMessages();
      this.fetchRoomMembers(); // load members
      setTimeout(() => {
        const el = document.getElementById('messages-area');
        if (el) el.scrollTop = el.scrollHeight;
      }, 150);
    },

    async sendMessage() {
      if (!this.newMessage || !this.roomId) {
        return;
      }
      const evt = { event_id: Math.random().toString(36).slice(2), sender: this.userId || '@me:demo', body: this.newMessage };
      this.messages.push(evt);
      this.newMessage = '';

      if (this.accessToken && this.accessToken !== 'demo-token') {
        try {
          const txn = Date.now();
          const res = await fetch(`https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/send/m.room.message/${txn}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ msgtype: 'm.text', body: evt.body })
          });
          if (!res.ok) {
            console.warn('Send failed', res.status);
          }
        } catch (e) {
          console.error('sendMessage error', e);
        }
      }
    }
  };
}

if (window.Alpine) {
  window.Alpine.data('chatApp', chatApp);
}

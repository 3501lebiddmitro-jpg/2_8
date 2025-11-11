// sidebar.js - helper to optionally load fragments (sidebar.html, user.html)
// and to wire basic DOM buttons inside fragments to Alpine app (if present).
window.addEventListener('DOMContentLoaded', async () => {
  // Attempt to fetch sidebar.html and inject into placeholder
  const ph = document.getElementById('sidebar-placeholder');
  if (!ph) return;

  async function tryFetchAndInject(name, placeholder) {
    try {
      const res = await fetch(name);
      if (!res.ok) return;
      const txt = await res.text();
      placeholder.innerHTML = txt;
      return true;
    } catch (e) {
      // ignore
      return false;
    }
  }

  // Try to load sidebar fragment (optional)
  await tryFetchAndInject('sidebar.html', ph);

  // Hook up buttons inside injected fragments to Alpine (if exist)
  setTimeout(() => {
    const createBtn = document.getElementById('sidebar-create-room-btn');
    const newRoomInput = document.getElementById('sidebar-new-room');
    if (createBtn && newRoomInput && window.Alpine) {
      createBtn.addEventListener('click', () => {
        const app = document.querySelector('[x-data]');
        const comp = app ? app.__x.$data : null;
        if (comp) {
          comp.newRoomName = newRoomInput.value;
          comp.createRoom();
        }
      });
    }

    const inviteBtn = document.getElementById('invite-user-btn');
    const inviteInput = document.getElementById('invite-user-input');
    if (inviteBtn && inviteInput) {
      inviteBtn.addEventListener('click', () => {
        const app = document.querySelector('[x-data]');
        const comp = app ? app.__x.$data : null;
        if (comp) {
          comp.inviteUser = inviteInput.value;
          comp.inviteUserToRoom();
        }
      });
    }

    const joinBtn = document.getElementById('join-room-btn');
    const joinInput = document.getElementById('join-room-input');
    if (joinBtn && joinInput) {
      joinBtn.addEventListener('click', () => {
        const app = document.querySelector('[x-data]');
        const comp = app ? app.__x.$data : null;
        if (comp) {
          comp.joinRoomId = joinInput.value;
          comp.joinRoom();
        }
      });
    }
  }, 200);
});

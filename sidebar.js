// sidebar.js
// Содержит логику для работы с комнатами — часть функций вызывается из chat.js.
// Здесь определим вспомогательные функции, которые chat.js использует.

async function fetchRooms(accessToken, homeserver) {
  if (!accessToken) return [];
  homeserver = homeserver || 'https://matrix.org';
  try {
    const res = await fetch(homeserver.replace(/\/$/, '') + '/_matrix/client/r0/joined_rooms', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!res.ok) throw new Error('Failed fetching rooms: ' + res.status);
    const data = await res.json();
    // data.joined_rooms is an array of roomIds
    return data.joined_rooms || [];
  } catch (e) {
    console.warn('fetchRooms error', e);
    return [];
  }
}

async function fetchRoomName(accessToken, homeserver, roomId) {
  // try to get room name via state
  if (!accessToken || !roomId) return roomId;
  homeserver = homeserver || 'https://matrix.org';
  try {
    const url = `${homeserver.replace(/\/$/, '')}/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.name`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    if (!res.ok) return roomId;
    const data = await res.json();
    return data.name || roomId;
  } catch (e) {
    return roomId;
  }
}

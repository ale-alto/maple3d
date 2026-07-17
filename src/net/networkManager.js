// Multiplayer client seam (M06). Everything network flows through here:
// PartySocket in, eventBus emits out. Gated behind ?mp=1 — a plain page
// load never opens a socket, and a failed connection falls back to the
// local sim (Principle 1: single-player always works).

import PartySocket from 'partysocket';

const CONNECT_TIMEOUT_MS = 4000;
const CHAT_SHOW_MS = 4000;
const LEVELUP_SHOW_MS = 2000;

export function createNetwork(eventBus) {
  const params = new URLSearchParams(window.location.search);
  const enabled = params.has('mp');
  const host =
    params.get('mphost') ||
    import.meta.env.VITE_MP_HOST ||
    `${window.location.hostname}:1999`;
  const name = (
    params.get('name') ||
    localStorage.getItem('maple3d-name') ||
    `Hunter${100 + Math.floor(Math.random() * 900)}`
  ).slice(0, 24);
  localStorage.setItem('maple3d-name', name);
  // Optional room-instance suffix (tests use this for isolation; real
  // players share the plain per-map room). Server parses mapId before '~'.
  const roomSuffix = params.get('mproom') || '';

  const net = {
    enabled,
    connected: false,
    failed: false,
    id: null,
    name,
    roomId: null,
    remote: new Map(), // id -> {id, name, x, y, facing, state, level, chat, chatMs}
    snapshot: null, // latest server {mobs, projectiles}, applied by main step
    myChat: null, // {text, ms} own bubble
    remoteStars: [], // cosmetic replicas of party members' throws
    nextRemoteStarId: 1,
    socket: null,

    join(mapId) {
      if (!enabled || net.failed) return;
      net.leave();
      const room = roomSuffix ? `${mapId}~${roomSuffix}` : mapId;
      net.roomId = room;
      const socket = new PartySocket({ host, room, query: { name } });
      net.socket = socket;
      const failTimer = setTimeout(() => {
        if (!net.connected) {
          net.failed = true;
          socket.close();
          eventBus.emit('net:failed', {});
        }
      }, CONNECT_TIMEOUT_MS);

      socket.addEventListener('message', (e) => {
        let m;
        try {
          m = JSON.parse(e.data);
        } catch {
          return;
        }
        if (m.t === 'welcome') {
          clearTimeout(failTimer);
          net.id = m.id;
          net.connected = true;
          net.remote = new Map(
            m.peers.map((p) => [p.id, { ...p, chat: null, chatMs: 0 }]),
          );
          net.snapshot = { mobs: m.mobs, projectiles: m.projectiles };
          eventBus.emit('net:connected', { id: m.id, roomId: mapId });
        } else if (m.t === 'peer') {
          const prev = net.remote.get(m.p.id);
          const entry = { chat: null, chatMs: 0, levelUpMs: 0, ...prev, ...m.p };
          // Presence carries level: a jump up = that player leveled.
          if (prev && m.p.level > (prev.level ?? m.p.level)) entry.levelUpMs = Date.now();
          net.remote.set(m.p.id, entry);
        } else if (m.t === 'peer-left') {
          net.remote.delete(m.id);
        } else if (m.t === 'mobs') {
          net.snapshot = { mobs: m.mobs, projectiles: m.projectiles };
        } else if (m.t === 'mob-hit') {
          // Reuse the local damage-number pipeline for everyone's hits.
          eventBus.emit('mob:hit', { id: m.mobId, x: m.x, y: m.y, amount: m.amount });
        } else if (m.t === 'mob-died') {
          eventBus.emit('net:mob-died', m);
        } else if (m.t === 'loot') {
          eventBus.emit('net:loot', m); // carries ownerId + dropIds
        } else if (m.t === 'loot-picked') {
          eventBus.emit('net:loot-picked', m);
        } else if (m.t === 'throw') {
          net.remoteStars.push({
            id: `r${net.nextRemoteStarId++}`,
            x: m.star.x,
            y: m.star.y,
            vx: m.star.vx,
            vy: 0,
            targetId: m.star.targetId,
            traveled: 0,
          });
        } else if (m.t === 'chat') {
          if (m.id === net.id) {
            net.myChat = { text: m.text, ms: Date.now() };
          } else {
            const peer = net.remote.get(m.id);
            if (peer) {
              peer.chat = m.text;
              peer.chatMs = Date.now();
            }
          }
        }
      });

      socket.addEventListener('close', () => {
        if (net.connected) {
          net.connected = false;
          net.snapshot = null;
          net.remote.clear();
          net.remoteStars = [];
          eventBus.emit('net:disconnected', {});
        }
      });
    },

    leave() {
      if (net.socket) {
        const s = net.socket;
        net.socket = null;
        net.connected = false;
        net.snapshot = null;
        net.remote.clear();
        net.remoteStars = [];
        try {
          s.close();
        } catch {
          /* already closed */
        }
      }
    },

    sendState(p) {
      if (net.connected) net.socket?.send(JSON.stringify({ t: 'state', p }));
    },
    sendHit(mobId, damage) {
      if (net.connected) net.socket?.send(JSON.stringify({ t: 'hit', mobId, damage }));
    },
    sendThrow(star) {
      if (net.connected)
        net.socket?.send(
          JSON.stringify({
            t: 'throw',
            star: { x: star.x, y: star.y, vx: star.vx, targetId: star.targetId },
          }),
        );
    },
    sendChat(text) {
      if (net.connected) net.socket?.send(JSON.stringify({ t: 'chat', text }));
    },
    sendPicked(dropId) {
      if (net.connected) net.socket?.send(JSON.stringify({ t: 'loot-picked', dropId }));
    },

    freshChat(entry) {
      return entry && entry.chat && Date.now() - entry.chatMs < CHAT_SHOW_MS ? entry.chat : null;
    },
    freshLevelUp(entry) {
      return !!entry && !!entry.levelUpMs && Date.now() - entry.levelUpMs < LEVELUP_SHOW_MS;
    },
    remoteList() {
      return [...net.remote.values()];
    },
  };

  return net;
}

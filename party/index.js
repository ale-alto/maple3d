// Room server — one Durable Object per map (server name === mapId).
// Ported from PartyKit to partyserver (Cloudflare's successor) when the
// hosted partykit.dev platform hit its global domain limit; runs in the
// user's own Cloudflare account via wrangler. Same headless mob sim as
// the client (src/sim is pure by rule, which makes this import legal).
// Owns: mob state, presence fanout, per-killer loot rolls, chat relay.

import { Server, routePartykitRequest } from 'partyserver';

import { maps } from '../src/sim/maps/index.js';
import { createMobsState, stepMobs, stepMobProjectiles, damageMob } from '../src/sim/mobs.js';
import { rollDrops } from '../src/sim/loot.js';
import { MOB_TYPES, LOOT_SEED } from '../src/core/constants.js';
import { mulberry32 } from '../src/sim/rng.js';

const TICK_MS = 50; // 20 Hz sim
const SNAPSHOT_EVERY = 2; // mobs snapshot at 10 Hz
const MAX_DAMAGE = 40; // loose validation: > any legit star hit
const MAX_CHAT = 120;
const MAX_MSG_BYTES = 2048;

// Binding name "Main" kebab-cases to URL party "main" — PartySocket's
// default, so client URLs (/parties/main/<room>) are unchanged.
export class Main extends Server {
  onStart() {
    // Server name is "<mapId>" or "<mapId>~<instance>" (tests isolate
    // rooms with a suffix). Unknown map (e.g. the health probe): peers-only.
    this.mapId = this.name.split('~')[0];
    this.map = maps[this.mapId] ?? null;
    this.mobs = this.map ? createMobsState(this.map) : null;
    this.peers = new Map(); // conn.id -> {id, name, x, y, facing, state, level}
    this.rand = mulberry32(LOOT_SEED ^ hashCode(this.name));
    this.nextDropId = 1;
    this.interval = null;
    this.tickCount = 0;
    this.attacker = null; // set around damageMob so the event bus knows the killer
    // Server-side event bus: turns sim events into broadcasts.
    this.bus = {
      emit: (event, payload) => {
        if (event === 'mob:hit') {
          this.send({ t: 'mob-hit', mobId: payload.id, amount: payload.amount, x: payload.x, y: payload.y, attackerId: this.attacker });
        } else if (event === 'mob:died') {
          this.send({ t: 'mob-died', mobId: payload.id, x: payload.x, y: payload.y, type: payload.type, killerId: this.attacker });
          // Classic MS loot rule: EVERYONE sees the drops; only the killer
          // may pick them up. Server-assigned dropIds give every client the
          // same identity, so pickups can be removed everywhere.
          if (this.attacker) {
            const items = rollDrops(this.rand, MOB_TYPES[payload.type]).map((item) => ({
              ...item,
              dropId: `d${this.nextDropId++}`,
            }));
            this.send({ t: 'loot', items, x: payload.x, y: payload.y, ownerId: this.attacker });
          }
        }
      },
    };
  }

  send(obj, excludeIds) {
    this.broadcast(JSON.stringify(obj), excludeIds);
  }

  startTicking() {
    if (this.interval || !this.map) return;
    this.interval = setInterval(() => this.tick(), TICK_MS);
  }

  stopTicking() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  tick() {
    const dt = TICK_MS / 1000;
    const players = [...this.peers.values()];
    stepMobs(this.mobs, players, this.map, dt, this.bus);
    stepMobProjectiles(this.mobs, this.map, dt);
    this.tickCount += 1;
    if (this.tickCount % SNAPSHOT_EVERY === 0) {
      this.send({ t: 'mobs', mobs: this.mobs.mobs, projectiles: this.mobs.projectiles });
    }
    // Ghost-peer prune (1 Hz): hard-killed sockets may never fire onClose.
    if (this.tickCount % 20 === 0) {
      const live = new Set([...this.getConnections()].map((c) => c.id));
      for (const id of this.peers.keys()) {
        if (!live.has(id)) {
          this.peers.delete(id);
          this.send({ t: 'peer-left', id });
        }
      }
      if (this.peers.size === 0) this.onEmpty();
    }
  }

  onConnect(conn, ctx) {
    const url = new URL(ctx.request.url);
    const name = (url.searchParams.get('name') || 'Hunter').slice(0, 24);
    this.peers.set(conn.id, { id: conn.id, name, x: 0, y: 0, facing: 'right', state: 'idle', level: 1 });

    conn.send(
      JSON.stringify({
        t: 'welcome',
        id: conn.id,
        peers: [...this.peers.values()].filter((p) => p.id !== conn.id),
        mobs: this.mobs ? this.mobs.mobs : [],
        projectiles: this.mobs ? this.mobs.projectiles : [],
      }),
    );
    this.send({ t: 'peer', p: this.peers.get(conn.id) }, [conn.id]);
    this.startTicking();
  }

  // partyserver argument order: (connection, message).
  onMessage(sender, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_MSG_BYTES) return;
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const peer = this.peers.get(sender.id);
    if (!peer) return;

    if (msg.t === 'state' && msg.p && typeof msg.p.x === 'number' && typeof msg.p.y === 'number') {
      peer.x = msg.p.x;
      peer.y = msg.p.y;
      peer.facing = msg.p.facing === 'left' ? 'left' : 'right';
      peer.state = String(msg.p.state ?? 'idle').slice(0, 16);
      peer.level = Number(msg.p.level) || 1;
      this.send({ t: 'peer', p: peer }, [sender.id]);
    } else if (msg.t === 'hit' && this.mobs) {
      const mob = this.mobs.mobs.find((m) => m.id === msg.mobId);
      const damage = Math.min(Math.max(1, Number(msg.damage) || 0), MAX_DAMAGE);
      if (mob) {
        this.attacker = sender.id;
        damageMob(this.mobs, mob, damage, this.bus);
        this.attacker = null;
      }
    } else if (msg.t === 'chat') {
      const text = String(msg.text ?? '').slice(0, MAX_CHAT);
      if (text) this.send({ t: 'chat', id: sender.id, text });
    } else if (msg.t === 'loot-picked' && msg.dropId) {
      // Relay removal to everyone else (sender already removed locally).
      this.send({ t: 'loot-picked', dropId: String(msg.dropId) }, [sender.id]);
    } else if (msg.t === 'throw' && msg.star) {
      // Cosmetic relay: everyone sees the throw; damage still arrives
      // only via validated 'hit' messages.
      this.send(
        {
          t: 'throw',
          id: sender.id,
          star: {
            x: Number(msg.star.x) || 0,
            y: Number(msg.star.y) || 0,
            vx: Number(msg.star.vx) || 0,
            targetId: msg.star.targetId ?? null,
          },
        },
        [sender.id],
      );
    }
  }

  onClose(conn) {
    this.peers.delete(conn.id);
    this.send({ t: 'peer-left', id: conn.id });
    if (this.peers.size === 0) this.onEmpty();
  }

  onEmpty() {
    this.stopTicking();
    // Fresh field for the next arrivals (Maple channel behavior).
    if (this.map) this.mobs = createMobsState(this.map);
    this.tickCount = 0;
  }

  // HTTP health check (Playwright webServer readiness probe).
  onRequest() {
    return new Response('ok', { status: 200 });
  }
}

export default {
  fetch(request, env) {
    return routePartykitRequest(request, env) ?? new Response('Not found', { status: 404 });
  },
};

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

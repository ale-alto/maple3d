// PartyKit room server — one room per map (room.id === mapId).
// RED-PHASE STUB: accepts connections and says hello; the authoritative
// mob sim, presence fanout, loot rolls and chat land with the M06
// implementation commit.

export default class MapRoom {
  constructor(room) {
    this.room = room;
  }

  onConnect(conn) {
    conn.send(JSON.stringify({ t: 'welcome', id: conn.id, peers: [], mobs: [], projectiles: [] }));
  }

  // HTTP health check (Playwright webServer readiness probe).
  onRequest() {
    return new Response('ok', { status: 200 });
  }
}

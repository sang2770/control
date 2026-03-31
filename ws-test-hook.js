const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SCENARIOS = {
  scenario3vs1: {
    name: "3-1 room only",
    players: [
      { dn: "system_player_1", sit: 0, C: true, uid: "uid1" },
      { dn: "system_player_2", sit: 1, C: false, uid: "uid2" },
      { dn: "system_player_3", sit: 2, C: false, uid: "uid3" },
      { dn: "guest_player", sit: 3, C: false, uid: "guest_uid" },
    ],
    roomId: "room_test_3vs1",
    sendCards: false,
  },
  scenario3vs1WithCards: {
    name: "3-1 with cards",
    players: [
      { dn: "system_player_1", sit: 0, C: true, uid: "uid1" },
      { dn: "system_player_2", sit: 1, C: false, uid: "uid2" },
      { dn: "system_player_3", sit: 2, C: false, uid: "uid3" },
      { dn: "guest_player", sit: 3, C: false, uid: "guest_uid" },
    ],
    roomId: "room_test_cards",
    sendCards: true,
    cardsBySystemPlayer: {
      system_player_1: Array.from({ length: 13 }, (_, i) => i),
      system_player_2: Array.from({ length: 13 }, (_, i) => i + 13),
      system_player_3: Array.from({ length: 13 }, (_, i) => i + 26),
    },
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    port: null,
    scenario: "scenario3vs1WithCards",
    host: "127.0.0.1",
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if ((arg === "--port" || arg === "-p") && args[i + 1]) {
      parsed.port = Number(args[i + 1]);
      i += 1;
    } else if ((arg === "--scenario" || arg === "-s") && args[i + 1]) {
      parsed.scenario = args[i + 1];
      i += 1;
    } else if ((arg === "--host" || arg === "-h") && args[i + 1]) {
      parsed.host = args[i + 1];
      i += 1;
    }
  }

  if (!parsed.port && process.env.WS_PORT) {
    parsed.port = Number(process.env.WS_PORT);
  }

  return parsed;
}

function readPortFromConfig() {
  const candidates = [
    path.join(__dirname, "sunwin-extension", "port.json"),
    path.join(__dirname, "..", "sunwin-extension", "port.json"),
    path.join(process.cwd(), "sunwin-extension", "port.json"),
  ];

  for (const configPath of candidates) {
    try {
      if (!fs.existsSync(configPath)) {
        continue;
      }
      const raw = fs.readFileSync(configPath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && Number.isFinite(Number(parsed.port))) {
        return Number(parsed.port);
      }
    } catch (error) {
      // Continue trying other paths.
    }
  }

  return null;
}

function buildUpdateSystemKeyMessage(systemKey) {
  return {
    action: "updateSystemKey",
    systemKey,
  };
}

function buildRoomDataMessage(roomId, players) {
  return {
    action: "updateUserStatus",
    userStatus: {
      type: "MAUBINH_MONITOR_ROOMDATA",
      roomId,
      players,
    },
  };
}

function buildCardsMessage(roomId, playerName, cards) {
  return {
    action: "updateUserStatus",
    userStatus: {
      type: "MAUBINH_PLAYER_CARDS_REPORT",
      roomId,
      playerName,
      cards,
    },
  };
}

function buildGameEndMessage(roomId) {
  return {
    action: "updateUserStatus",
    userStatus: {
      type: "MAUBINH_MONITOR_GAME_END",
      roomId,
    },
  };
}

class ExternalWsTestClient {
  constructor({ host, port, scenarioKey }) {
    this.host = host;
    this.port = port;
    this.url = `ws://${host}:${port}`;
    this.scenarioKey = scenarioKey;
    this.scenario = SCENARIOS[scenarioKey];
    this.systemPlayers = this.scenario.players.slice(0, 3).map((p) => p.dn);
    this.clients = new Map();
  }

  async connectPlayer(systemKey) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      let resolved = false;

      ws.on("open", () => {
        this.log(`[${systemKey}] connected`);
        ws.send(JSON.stringify(buildUpdateSystemKeyMessage(systemKey)));
        this.log(`[${systemKey}] sent updateSystemKey`);
        this.clients.set(systemKey, ws);
        resolved = true;
        resolve(ws);
      });

      ws.on("message", (raw) => {
        const text = raw.toString();
        this.log(`[${systemKey}] recv: ${text}`);
      });

      ws.on("error", (error) => {
        this.log(`[${systemKey}] error: ${error.message}`);
        if (!resolved) {
          reject(error);
        }
      });

      ws.on("close", () => {
        this.log(`[${systemKey}] closed`);
      });
    });
  }

  send(systemKey, payload) {
    const ws = this.clients.get(systemKey);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Socket for ${systemKey} is not open`);
    }
    ws.send(JSON.stringify(payload));
  }

  async run() {
    this.log(`Scenario: ${this.scenarioKey} (${this.scenario.name})`);
    this.log(`Connecting to: ${this.url}`);

    for (const systemKey of this.systemPlayers) {
      await this.connectPlayer(systemKey);
      await sleep(200);
    }

    // Give main time to register all clients into its `clients` map.
    await sleep(1000);

    // One system client sends room data with all 4 players.
    this.send(
      this.systemPlayers[0],
      buildRoomDataMessage(this.scenario.roomId, this.scenario.players)
    );
    this.log(`[${this.systemPlayers[0]}] sent MAUBINH_MONITOR_ROOMDATA`);

    await sleep(500);

    if (this.scenario.sendCards) {
      for (const systemKey of this.systemPlayers) {
        const cards = this.scenario.cardsBySystemPlayer[systemKey];
        this.send(systemKey, buildCardsMessage(this.scenario.roomId, systemKey, cards));
        this.log(`[${systemKey}] sent MAUBINH_PLAYER_CARDS_REPORT (${cards.length} cards)`);
        await sleep(300);
      }
    }

    await sleep(1500);

    // End test round.
    this.send(this.systemPlayers[0], buildGameEndMessage(this.scenario.roomId));
    this.log(`[${this.systemPlayers[0]}] sent MAUBINH_MONITOR_GAME_END`);

    await sleep(500);
    this.shutdown();
  }

  shutdown() {
    for (const ws of this.clients.values()) {
      try {
        ws.close();
      } catch (error) {
        // Ignore close failures.
      }
    }
    this.clients.clear();
    this.log("Done.");
  }

  log(message) {
    console.log(`[ws-test-hook] ${message}`);
  }
}

async function main() {
  const args = parseArgs();
  const scenario = SCENARIOS[args.scenario];
  if (!scenario) {
    console.error(`[ws-test-hook] Invalid scenario: ${args.scenario}`);
    console.error(`[ws-test-hook] Available: ${Object.keys(SCENARIOS).join(", ")}`);
    process.exit(1);
  }

  const port = args.port || readPortFromConfig();
  if (!port) {
    console.error("[ws-test-hook] Cannot resolve WebSocket port.");
    console.error("[ws-test-hook] Use --port <number> or set WS_PORT env.");
    process.exit(1);
  }

  const client = new ExternalWsTestClient({
    host: args.host,
    port,
    scenarioKey: args.scenario,
  });

  try {
    await client.run();
  } catch (error) {
    console.error(`[ws-test-hook] Failed: ${error.message}`);
    client.shutdown();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  runExternalTest: main,
  SCENARIOS,
};

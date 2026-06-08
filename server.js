const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, "public")));

// ══════════════════════════════════════════════════════════════════════
// GAME DATA
// ══════════════════════════════════════════════════════════════════════

// Parties and their DNA (home position on each issue axis, 1-5 scale)
const PARTIES = {
  bjp: {
    name: "BJP",
    color: "#FF6B00",
    dna: { economy: 4, identity: 5, welfare: 2, federalism: 2, governance: 3 },
    tagline: "Nationalist right, strong center",
  },
  congress: {
    name: "Congress",
    color: "#00BFFF",
    dna: { economy: 2, identity: 2, welfare: 4, federalism: 3, governance: 3 },
    tagline: "Center-left, secular, welfare",
  },
  aap: {
    name: "AAP",
    color: "#0066CC",
    dna: { economy: 2, identity: 2, welfare: 4, federalism: 3, governance: 5 },
    tagline: "Anti-corruption, populist welfare",
  },
  tmc: {
    name: "TMC",
    color: "#2E8B57",
    dna: { economy: 2, identity: 2, welfare: 5, federalism: 5, governance: 2 },
    tagline: "Regional, populist, federalist",
  },
  dmk: {
    name: "DMK",
    color: "#CC0000",
    dna: { economy: 2, identity: 1, welfare: 4, federalism: 5, governance: 3 },
    tagline: "Dravidian, secular, state autonomy",
  },
  bsp: {
    name: "BSP",
    color: "#4169E1",
    dna: { economy: 2, identity: 1, welfare: 5, federalism: 3, governance: 2 },
    tagline: "Dalit empowerment, social justice",
  },
};

// Voter blocs with preferences on each axis (1-5) and size (% of electorate)
const VOTER_BLOCS = [
  {
    name: "Urban Middle Class",
    size: 12,
    prefs: { economy: 4, identity: 3, welfare: 2, federalism: 3, governance: 5 },
    hardFloor: { governance: 3 }, // won't vote for party below 3 on governance
  },
  {
    name: "Rural Landowners",
    size: 10,
    prefs: { economy: 3, identity: 3, welfare: 3, federalism: 4, governance: 3 },
    hardFloor: { federalism: 3 },
  },
  {
    name: "Rural Laborers",
    size: 15,
    prefs: { economy: 1, identity: 2, welfare: 5, federalism: 3, governance: 2 },
    hardFloor: { welfare: 3 },
  },
  {
    name: "OBC",
    size: 14,
    prefs: { economy: 2, identity: 3, welfare: 4, federalism: 3, governance: 3 },
    hardFloor: {},
  },
  {
    name: "Upper Caste Hindu",
    size: 10,
    prefs: { economy: 4, identity: 5, welfare: 2, federalism: 2, governance: 3 },
    hardFloor: { identity: 3 },
  },
  {
    name: "Muslim Minority",
    size: 12,
    prefs: { economy: 2, identity: 1, welfare: 4, federalism: 4, governance: 3 },
    hardFloor: { identity: 1 }, // actually: won't vote for identity > 4
    hardCeiling: { identity: 3 }, // won't vote for party with identity > 3
  },
  {
    name: "Dalit",
    size: 10,
    prefs: { economy: 1, identity: 1, welfare: 5, federalism: 3, governance: 3 },
    hardFloor: { welfare: 3 },
  },
  {
    name: "Business & Traders",
    size: 5,
    prefs: { economy: 5, identity: 3, welfare: 1, federalism: 2, governance: 4 },
    hardFloor: { economy: 3 },
  },
  {
    name: "Youth (18-30)",
    size: 8,
    prefs: { economy: 3, identity: 2, welfare: 3, federalism: 3, governance: 5 },
    hardFloor: { governance: 3 },
  },
  {
    name: "Women (swing)",
    size: 4,
    prefs: { economy: 2, identity: 2, welfare: 5, federalism: 3, governance: 4 },
    hardFloor: {},
  },
];

// Issues pool — each round picks one
const ISSUES = [
  {
    id: "fuel",
    title: "Fuel prices hit ₹120/litre",
    axis: "economy",
    positions: [
      "Full subsidy — government bears all cost",
      "Cap prices + cash transfer to poor",
      "Gradual deregulation with safety net",
      "Free market — reduce taxes instead",
      "Privatize oil companies fully",
    ],
  },
  {
    id: "temple",
    title: "Supreme Court rules on religious site dispute",
    axis: "identity",
    positions: [
      "Secular state — no government involvement",
      "Respect all faiths equally, mediate",
      "Balanced approach, maintain status quo",
      "Support majority sentiment democratically",
      "Government should actively restore heritage",
    ],
  },
  {
    id: "farm",
    title: "Farmer protests over MSP guarantee",
    axis: "welfare",
    positions: [
      "Legal guarantee MSP for all crops",
      "MSP + crop insurance expansion",
      "Case-by-case support, no blanket guarantee",
      "Market reforms will help farmers long-term",
      "End subsidies, push agri-tech modernization",
    ],
  },
  {
    id: "states",
    title: "States demand greater GST share",
    axis: "federalism",
    positions: [
      "Full centralized tax — center knows best",
      "Modest increase in center's share for defense",
      "Current formula is balanced",
      "States deserve larger share of revenue",
      "Complete fiscal autonomy for states",
    ],
  },
  {
    id: "corruption",
    title: "Major scam exposed — ₹50,000 Cr siphoned",
    axis: "governance",
    positions: [
      "These things happen, focus on development",
      "Internal party inquiry is sufficient",
      "Independent investigation, judicial process",
      "Fast-track courts + asset seizure",
      "Death penalty for corruption, citizen oversight",
    ],
  },
  {
    id: "jobs",
    title: "Unemployment hits 8% — youth protests erupt",
    axis: "economy",
    positions: [
      "Government job guarantee for all graduates",
      "Massive public works + skill programs",
      "Startup incentives + ease of business",
      "Cut regulations, let private sector lead",
      "SEZs with zero labor law restrictions",
    ],
  },
  {
    id: "conversion",
    title: "Anti-conversion bill proposed in Parliament",
    axis: "identity",
    positions: [
      "Freedom of religion is absolute — no bill",
      "Protect vulnerable but don't restrict choice",
      "Regulate only fraudulent conversions",
      "Strict anti-conversion law needed",
      "Mandatory reconversion programs",
    ],
  },
  {
    id: "floods",
    title: "Devastating floods in 3 states — relief debate",
    axis: "welfare",
    positions: [
      "₹1 lakh per family + free rebuilding",
      "Generous relief + long-term flood infrastructure",
      "Standard NDRF norms, no special packages",
      "States should manage their own disasters",
      "Insurance-based model, reduce state dependency",
    ],
  },
  {
    id: "china",
    title: "China incursion at LAC — 20 km inside Indian territory",
    axis: "identity", // using identity as proxy for nationalism
    positions: [
      "Diplomatic channels only, avoid escalation",
      "Strong diplomatic note + economic pressure",
      "Military buildup + international coalition",
      "Immediate military response, retake territory",
      "Full war footing, mobilize all forces",
    ],
  },
  {
    id: "reservation",
    title: "Demand for expanding reservation to 75%",
    axis: "welfare",
    positions: [
      "Expand to 75% — social justice demands it",
      "Expand moderately + add economic criteria",
      "Current levels adequate, improve implementation",
      "Reduce reservation, shift to economic basis only",
      "End reservation entirely — merit only",
    ],
  },
];

// Events that can shift voter mood (triggered every 3rd round)
const EVENTS = [
  { text: "GDP growth hits 8% — business confidence soars", shift: { axis: "economy", direction: 1, blocs: ["Business & Traders", "Urban Middle Class"] } },
  { text: "Communal riots in 3 cities — secularism in crisis", shift: { axis: "identity", direction: -1, blocs: ["Muslim Minority", "Youth (18-30)"] } },
  { text: "Drought hits 5 states — rural distress peaks", shift: { axis: "welfare", direction: 1, blocs: ["Rural Laborers", "Rural Landowners"] } },
  { text: "State government collapses — horse-trading scandal", shift: { axis: "governance", direction: 1, blocs: ["Urban Middle Class", "Youth (18-30)"] } },
  { text: "Border tensions escalate — patriotic mood rises", shift: { axis: "identity", direction: 1, blocs: ["Upper Caste Hindu", "OBC"] } },
  { text: "Tech layoffs — 2 lakh jobs lost in IT sector", shift: { axis: "economy", direction: -1, blocs: ["Urban Middle Class", "Youth (18-30)"] } },
];

// ══════════════════════════════════════════════════════════════════════
// GAME ENGINE
// ══════════════════════════════════════════════════════════════════════

const rooms = new Map();

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createGameState() {
  const issuePool = shuffle([...ISSUES]).slice(0, 10);
  return {
    issues: issuePool,
    currentRound: -1,
    totalRounds: 10,
    voterBlocs: JSON.parse(JSON.stringify(VOTER_BLOCS)), // deep copy — prefs can shift
    positions: {}, // { roundIndex: { partyKey: positionValue (1-5) } }
    voteShare: {}, // { partyKey: totalVoteShare }
    credibility: {}, // { partyKey: number }
    roundResults: [], // history of each round's results
  };
}

// Calculate vote share for a single round
function calculateRoundVotes(game, roundIndex, players) {
  const issue = game.issues[roundIndex];
  const axis = issue.axis;
  const roundPositions = game.positions[roundIndex] || {};

  // Get active party keys
  const partyKeys = Object.keys(roundPositions);

  const blocResults = [];
  const partyVotes = {};
  partyKeys.forEach(pk => { partyVotes[pk] = 0; });

  for (const bloc of game.voterBlocs) {
    const blocPref = bloc.prefs[axis]; // what this bloc wants on the live axis (1-5)
    const scores = {};

    for (const pk of partyKeys) {
      const position = roundPositions[pk];
      const party = PARTIES[pk];

      // 1. Alignment score: how close is position to bloc preference (0-1)
      const distance = Math.abs(position - blocPref);
      let alignment = Math.max(0, 1 - distance / 4); // 0 distance = 1.0, 4 distance = 0.0

      // 2. Hard floor check: if bloc has a minimum, party must meet it
      if (bloc.hardFloor && bloc.hardFloor[axis] !== undefined) {
        if (position < bloc.hardFloor[axis]) alignment *= 0.1; // near-zero
      }
      // Hard ceiling check (e.g., Muslim bloc won't vote for high identity)
      if (bloc.hardCeiling && bloc.hardCeiling[axis] !== undefined) {
        if (position > bloc.hardCeiling[axis]) alignment *= 0.1;
      }

      // 3. Credibility modifier
      const cred = game.credibility[pk] || 10;
      const credMod = 0.5 + 0.5 * (cred / 10); // ranges from 0.5 to 1.0

      scores[pk] = alignment * credMod;
    }

    // 4. Crowding penalty: if two parties have same position, split effectiveness
    const positionCounts = {};
    partyKeys.forEach(pk => {
      const pos = roundPositions[pk];
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });
    for (const pk of partyKeys) {
      const pos = roundPositions[pk];
      if (positionCounts[pos] > 1) {
        scores[pk] *= (1 / positionCounts[pos]); // split equally
      }
    }

    // 5. Distribute bloc votes proportionally by score
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const blocVoteDistribution = {};
    if (totalScore > 0) {
      for (const pk of partyKeys) {
        const share = (scores[pk] / totalScore) * bloc.size;
        partyVotes[pk] += share;
        blocVoteDistribution[pk] = Math.round((scores[pk] / totalScore) * 100);
      }
    }

    blocResults.push({
      name: bloc.name,
      size: bloc.size,
      pref: blocPref,
      distribution: blocVoteDistribution,
    });
  }

  return { partyVotes, blocResults };
}

// Update credibility based on how far from DNA
function updateCredibility(game, roundIndex) {
  const issue = game.issues[roundIndex];
  const axis = issue.axis;
  const roundPositions = game.positions[roundIndex] || {};

  for (const pk of Object.keys(roundPositions)) {
    const position = roundPositions[pk];
    const dna = PARTIES[pk].dna[axis];
    const drift = Math.abs(position - dna);

    // Free zone: 1 step. Beyond that: penalty
    if (drift <= 1) {
      // Staying close: recover 0.5 credibility (up to 10)
      game.credibility[pk] = Math.min(10, (game.credibility[pk] || 10) + 0.5);
    } else {
      // Penalty: (drift - 1)^1.5 — moderate to large
      const penalty = Math.pow(drift - 1, 1.5);
      game.credibility[pk] = Math.max(0, (game.credibility[pk] || 10) - penalty);
    }
  }
}

// Apply event shift to voter bloc preferences
function applyEvent(game, event) {
  for (const bloc of game.voterBlocs) {
    if (event.shift.blocs.includes(bloc.name)) {
      const axis = event.shift.axis;
      bloc.prefs[axis] = Math.max(1, Math.min(5, bloc.prefs[axis] + event.shift.direction));
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// NETWORKING
// ══════════════════════════════════════════════════════════════════════

function broadcast(room, msg) {
  const data = JSON.stringify(msg);
  for (const p of room.players.values()) {
    if (p.ws.readyState === 1) p.ws.send(data);
  }
}

function sendToPlayer(room, playerId, msg) {
  const p = room.players.get(playerId);
  if (p && p.ws.readyState === 1) p.ws.send(JSON.stringify(msg));
}

app.get("/debug", (req, res) => {
  const roomList = [...rooms.entries()].map(([code, room]) => ({
    code,
    state: room.state,
    players: [...room.players.values()].map(p => ({ name: p.name, party: p.party })),
    round: room.game?.currentRound,
  }));
  res.json({ rooms: roomList, uptime: process.uptime() });
});

wss.on("connection", (ws) => {
  console.log("[WS] New connection");
  let playerId = null;
  let roomCode = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "createRoom") {
      const code = generateCode();
      const room = {
        code,
        players: new Map(),
        state: "lobby", // lobby, picking, playing, finished
        game: null,
        hostId: null,
        timerHandle: null,
        availableParties: new Set(Object.keys(PARTIES)),
      };
      rooms.set(code, room);
      roomCode = code;
      playerId = Math.random().toString(36).slice(2, 10);
      room.hostId = playerId;
      room.players.set(playerId, { id: playerId, name: msg.name || "Host", ws, party: null, ready: false });
      console.log(`[ROOM] Created: ${code}`);
      ws.send(JSON.stringify({ type: "roomCreated", code, playerId }));
      broadcastLobby(room);
    }

    if (msg.type === "joinRoom") {
      const tryCode = msg.code?.toUpperCase();
      const room = rooms.get(tryCode);
      if (!room) return ws.send(JSON.stringify({ type: "error", msg: "Room not found" }));
      if (room.state !== "lobby" && room.state !== "picking") return ws.send(JSON.stringify({ type: "error", msg: "Game already started" }));
      if (room.players.size >= 6) return ws.send(JSON.stringify({ type: "error", msg: "Room full (max 6)" }));
      playerId = Math.random().toString(36).slice(2, 10);
      roomCode = room.code;
      room.players.set(playerId, { id: playerId, name: msg.name || "Anon", ws, party: null, ready: false });
      ws.send(JSON.stringify({ type: "joined", playerId, code: room.code }));
      broadcastLobby(room);
    }

    if (msg.type === "pickParty") {
      const room = rooms.get(roomCode);
      if (!room || !playerId) return;
      const partyKey = msg.party;
      if (!PARTIES[partyKey]) return;
      if (!room.availableParties.has(partyKey)) return ws.send(JSON.stringify({ type: "error", msg: "Party already taken" }));
      // Release previous pick
      const player = room.players.get(playerId);
      if (player.party) room.availableParties.add(player.party);
      player.party = partyKey;
      room.availableParties.delete(partyKey);
      broadcastLobby(room);
    }

    if (msg.type === "startGame") {
      const room = rooms.get(roomCode);
      if (!room || playerId !== room.hostId) return;
      // Check all players have a party
      for (const p of room.players.values()) {
        if (!p.party) return ws.send(JSON.stringify({ type: "error", msg: `${p.name} hasn't picked a party` }));
      }
      if (room.players.size < 2) return ws.send(JSON.stringify({ type: "error", msg: "Need at least 2 players" }));
      startGamePlay(room);
    }

    if (msg.type === "submitPosition") {
      const room = rooms.get(roomCode);
      if (!room || room.state !== "playing" || !playerId) return;
      const position = msg.position; // 1-5
      if (position < 1 || position > 5) return;
      const player = room.players.get(playerId);
      if (!player || !player.party) return;
      const roundIdx = room.game.currentRound;
      if (!room.game.positions[roundIdx]) room.game.positions[roundIdx] = {};
      room.game.positions[roundIdx][player.party] = position;

      // Acknowledge
      ws.send(JSON.stringify({ type: "positionAck" }));

      // Broadcast guess count
      const submitted = Object.keys(room.game.positions[roundIdx]).length;
      broadcast(room, { type: "submitCount", count: submitted, total: room.players.size });

      // If all submitted, end round early
      if (submitted >= room.players.size) {
        clearTimeout(room.timerHandle);
        endRound(room);
      }
    }
  });

  ws.on("close", () => {
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        room.players.delete(playerId);
        if (room.players.size === 0) {
          clearTimeout(room.timerHandle);
          rooms.delete(roomCode);
        } else {
          broadcastLobby(room);
        }
      }
    }
  });
});

function broadcastLobby(room) {
  const players = [...room.players.values()].map(p => ({
    id: p.id,
    name: p.name,
    party: p.party,
    isHost: p.id === room.hostId,
  }));
  const available = [...room.availableParties];
  broadcast(room, {
    type: "lobbyUpdate",
    players,
    availableParties: available,
    parties: PARTIES,
    voterBlocs: room.game ? room.game.voterBlocs : VOTER_BLOCS,
  });
}

function startGamePlay(room) {
  room.state = "playing";
  room.game = createGameState();
  // Init credibility and vote share
  for (const p of room.players.values()) {
    room.game.credibility[p.party] = 10;
    room.game.voteShare[p.party] = 0;
  }
  // Send game start
  broadcast(room, {
    type: "gameStart",
    parties: PARTIES,
    voterBlocs: room.game.voterBlocs,
    totalRounds: room.game.totalRounds,
  });
  // Start first round
  setTimeout(() => nextRound(room), 1500);
}

function nextRound(room) {
  room.game.currentRound++;
  const roundIdx = room.game.currentRound;

  if (roundIdx >= room.game.totalRounds) {
    endGame(room);
    return;
  }

  // Every 3rd round (rounds 3, 6, 9): apply an event before the issue
  let event = null;
  if (roundIdx > 0 && roundIdx % 3 === 0) {
    event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    applyEvent(room.game, event);
  }

  const issue = room.game.issues[roundIdx];
  room.game.positions[roundIdx] = {};

  // Build per-player info (their DNA position on this axis)
  const playerInfo = {};
  for (const p of room.players.values()) {
    playerInfo[p.party] = {
      dna: PARTIES[p.party].dna[issue.axis],
      credibility: Math.round((room.game.credibility[p.party] || 10) * 10) / 10,
    };
  }

  broadcast(room, {
    type: "newRound",
    round: roundIdx + 1,
    total: room.game.totalRounds,
    issue: {
      id: issue.id,
      title: issue.title,
      axis: issue.axis,
      positions: issue.positions,
    },
    event: event ? { text: event.text } : null,
    voterBlocs: room.game.voterBlocs,
    playerInfo,
    timeLimit: 15,
  });

  // Timer
  room.timerHandle = setTimeout(() => {
    // Auto-submit DNA position for anyone who didn't submit
    for (const p of room.players.values()) {
      if (!room.game.positions[roundIdx][p.party]) {
        room.game.positions[roundIdx][p.party] = PARTIES[p.party].dna[issue.axis];
      }
    }
    endRound(room);
  }, 16000);
}

function endRound(room) {
  const roundIdx = room.game.currentRound;

  // Calculate votes
  const { partyVotes, blocResults } = calculateRoundVotes(room.game, roundIdx, room.players);

  // Update cumulative vote share (running average)
  for (const pk of Object.keys(partyVotes)) {
    const prevTotal = room.game.voteShare[pk] || 0;
    const roundsCompleted = roundIdx + 1;
    room.game.voteShare[pk] = ((prevTotal * roundIdx) + partyVotes[pk]) / roundsCompleted;
  }

  // Update credibility
  updateCredibility(room.game, roundIdx);

  // Store round results
  const roundResult = {
    issue: room.game.issues[roundIdx],
    positions: { ...room.game.positions[roundIdx] },
    partyVotes,
    blocResults,
    credibility: { ...room.game.credibility },
    cumulativeVoteShare: { ...room.game.voteShare },
  };
  room.game.roundResults.push(roundResult);

  // Broadcast results
  const leaderboard = Object.entries(room.game.voteShare)
    .map(([pk, share]) => ({ party: pk, name: PARTIES[pk].name, color: PARTIES[pk].color, share: Math.round(share * 10) / 10 }))
    .sort((a, b) => b.share - a.share);

  broadcast(room, {
    type: "roundResults",
    round: roundIdx + 1,
    total: room.game.totalRounds,
    positions: room.game.positions[roundIdx],
    roundVotes: partyVotes,
    blocResults,
    credibility: Object.fromEntries(
      Object.entries(room.game.credibility).map(([k, v]) => [k, Math.round(v * 10) / 10])
    ),
    leaderboard,
    issue: room.game.issues[roundIdx],
  });

  // Next round after delay
  room.timerHandle = setTimeout(() => nextRound(room), 8000);
}

function endGame(room) {
  room.state = "finished";
  const leaderboard = Object.entries(room.game.voteShare)
    .map(([pk, share]) => ({ party: pk, name: PARTIES[pk].name, color: PARTIES[pk].color, share: Math.round(share * 10) / 10 }))
    .sort((a, b) => b.share - a.share);

  broadcast(room, {
    type: "gameOver",
    leaderboard,
    roundHistory: room.game.roundResults.map(r => ({
      issue: r.issue.title,
      positions: r.positions,
      votes: r.partyVotes,
    })),
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n  🗳️  Election Game running at http://localhost:${PORT}\n`);
});

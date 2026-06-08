
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

const PARTIES = {
  bjp: {
    name: "BJP",
    fullName: "Bharatiya Janata Party",
    color: "#FF6B00",
    dna: { economy: 4, identity: 5, welfare: 2, federalism: 2, governance: 3 },
    tagline: "Nationalist right, strong center",
    baseBlocs: ["Upper Caste Hindu", "Business & Traders"],
  },
  congress: {
    name: "Congress",
    fullName: "Indian National Congress",
    color: "#00BFFF",
    dna: { economy: 2, identity: 2, welfare: 4, federalism: 3, governance: 3 },
    tagline: "Center-left, secular, welfare",
    baseBlocs: ["Muslim Minority", "Rural Laborers"],
  },
  aap: {
    name: "AAP",
    fullName: "Aam Aadmi Party",
    color: "#0066CC",
    dna: { economy: 2, identity: 2, welfare: 4, federalism: 3, governance: 5 },
    tagline: "Anti-corruption, populist welfare",
    baseBlocs: ["Urban Middle Class", "Youth (18-30)"],
  },
  tmc: {
    name: "TMC",
    fullName: "All India Trinamool Congress",
    color: "#2E8B57",
    dna: { economy: 2, identity: 2, welfare: 5, federalism: 5, governance: 2 },
    tagline: "Regional, populist, federalist",
    baseBlocs: ["Rural Laborers", "Women (swing)"],
  },
  dmk: {
    name: "DMK",
    fullName: "Dravida Munnetra Kazhagam",
    color: "#CC0000",
    dna: { economy: 2, identity: 1, welfare: 4, federalism: 5, governance: 3 },
    tagline: "Dravidian, secular, state autonomy",
    baseBlocs: ["OBC (Other Backward Classes)", "Rural Landowners"],
  },
  bsp: {
    name: "BSP",
    fullName: "Bahujan Samaj Party",
    color: "#4169E1",
    dna: { economy: 2, identity: 1, welfare: 5, federalism: 3, governance: 2 },
    tagline: "Dalit empowerment, social justice",
    baseBlocs: ["Dalit", "OBC (Other Backward Classes)"],
  },
};

const VOTER_BLOCS = [
  {
    name: "Urban Middle Class",
    size: 12,
    prefs: { economy: 4, identity: 3, welfare: 2, federalism: 3, governance: 5 },
    hardFloor: { governance: 3 },
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
    name: "OBC (Other Backward Classes)",
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
    hardFloor: { identity: 1 },
    hardCeiling: { identity: 3 },
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
    title: "Farmer protests over MSP (Minimum Support Price) guarantee",
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
    title: "States demand greater GST (Goods & Services Tax) share",
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
      "SEZs (Special Economic Zones) with zero labor law restrictions",
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
      "Standard NDRF (National Disaster Response Force) norms, no special packages",
      "States should manage their own disasters",
      "Insurance-based model, reduce state dependency",
    ],
  },
  {
    id: "china",
    title: "China incursion at LAC (Line of Actual Control) — 20 km inside Indian territory",
    axis: "identity",
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

const EVENTS = [
  { text: "GDP growth hits 8% — business confidence soars", shift: { axis: "economy", direction: 1, blocs: ["Business & Traders", "Urban Middle Class"] } },
  { text: "Communal riots in 3 cities — secularism in crisis", shift: { axis: "identity", direction: -1, blocs: ["Muslim Minority", "Youth (18-30)"] } },
  { text: "Drought hits 5 states — rural distress peaks", shift: { axis: "welfare", direction: 1, blocs: ["Rural Laborers", "Rural Landowners"] } },
  { text: "State government collapses — horse-trading scandal", shift: { axis: "governance", direction: 1, blocs: ["Urban Middle Class", "Youth (18-30)"] } },
  { text: "Border tensions escalate — patriotic mood rises", shift: { axis: "identity", direction: 1, blocs: ["Upper Caste Hindu", "OBC (Other Backward Classes)"] } },
  { text: "Tech layoffs — 2 lakh jobs lost in IT sector", shift: { axis: "economy", direction: -1, blocs: ["Urban Middle Class", "Youth (18-30)"] } },
];

// ══════════════════════════════════════════════════════════════════════
// AI BOT — spoiler third party
// ══════════════════════════════════════════════════════════════════════

// Bot picks a position: mostly DNA, occasionally 1 step toward voter center
function chooseBotPosition(partyKey, axis, voterBlocs, credibility) {
  const dna = PARTIES[partyKey].dna[axis];
  const cred = credibility[partyKey] || 10;

  // Find the weighted center of gravity of voter blocs on this axis
  let totalWeight = 0, weightedSum = 0;
  for (const bloc of voterBlocs) {
    totalWeight += bloc.size;
    weightedSum += bloc.prefs[axis] * bloc.size;
  }
  const voterCenter = totalWeight > 0 ? weightedSum / totalWeight : 3;

  // If credibility is low, always play DNA to recover
  if (cred < 5) return dna;

  // 60% DNA, 30% step toward voter center, 10% wild card
  const roll = Math.random();
  if (roll < 0.6) {
    return dna;
  } else if (roll < 0.9) {
    if (voterCenter > dna && dna < 5) return dna + 1;
    if (voterCenter < dna && dna > 1) return dna - 1;
    return dna;
  } else {
    if (voterCenter > dna && dna > 1) return dna - 1;
    if (voterCenter < dna && dna < 5) return dna + 1;
    return dna;
  }
}

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
  const issuePool = shuffle([...ISSUES]).slice(0, 5);
  return {
    issues: issuePool,
    currentRound: -1,
    totalRounds: 5,
    voterBlocs: JSON.parse(JSON.stringify(VOTER_BLOCS)),
    positions: {},
    voteShare: {},
    credibility: {},
    roundResults: [],
    bots: [], // array of { partyKey } for AI-controlled parties
  };
}

// Calculate vote share for a single round
function calculateRoundVotes(game, roundIndex, players) {
  const issue = game.issues[roundIndex];
  const axis = issue.axis;
  const roundPositions = game.positions[roundIndex] || {};
  const partyKeys = Object.keys(roundPositions);

  const blocResults = [];
  const partyVotes = {};
  partyKeys.forEach(pk => { partyVotes[pk] = 0; });

  for (const bloc of game.voterBlocs) {
    const blocPref = bloc.prefs[axis];
    const scores = {};

    for (const pk of partyKeys) {
      const position = roundPositions[pk];

      // 1. Alignment score
      const distance = Math.abs(position - blocPref);
      let alignment = Math.max(0, 1 - distance / 4);

      // 2. Hard floor/ceiling checks
      if (bloc.hardFloor && bloc.hardFloor[axis] !== undefined) {
        if (position < bloc.hardFloor[axis]) alignment *= 0.1;
      }
      if (bloc.hardCeiling && bloc.hardCeiling[axis] !== undefined) {
        if (position > bloc.hardCeiling[axis]) alignment *= 0.1;
      }

      // 3. Credibility modifier
      const cred = game.credibility[pk] || 10;
      const credMod = 0.5 + 0.5 * (cred / 10);

      // 4. Base loyalty bonus — your base blocs give you a 25% score bonus
      // This means even if another party matches the bloc's preference equally,
      // the "home" party still has an edge with its base voters.
      // But it's not a guaranteed lock — a big alignment gap can still override it.
      const party = PARTIES[pk];
      const isBase = party.baseBlocs && party.baseBlocs.includes(bloc.name);
      const loyaltyBonus = isBase ? 1.25 : 1.0;

      scores[pk] = alignment * credMod * loyaltyBonus;
    }

    // 5. Crowding penalty
    const positionCounts = {};
    partyKeys.forEach(pk => {
      const pos = roundPositions[pk];
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });
    for (const pk of partyKeys) {
      const pos = roundPositions[pk];
      if (positionCounts[pos] > 1) {
        scores[pk] *= (1 / positionCounts[pos]);
      }
    }

    // 6. Distribute bloc votes proportionally
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

function updateCredibility(game, roundIndex) {
  const issue = game.issues[roundIndex];
  const axis = issue.axis;
  const roundPositions = game.positions[roundIndex] || {};

  for (const pk of Object.keys(roundPositions)) {
    const position = roundPositions[pk];
    const dna = PARTIES[pk].dna[axis];
    const drift = Math.abs(position - dna);

    if (drift <= 1) {
      game.credibility[pk] = Math.min(10, (game.credibility[pk] || 10) + 0.5);
    } else {
      const penalty = Math.pow(drift - 1, 1.5);
      game.credibility[pk] = Math.max(0, (game.credibility[pk] || 10) - penalty);
    }
  }
}

function applyEvent(game, event) {
  for (const bloc of game.voterBlocs) {
    if (event.shift.blocs.includes(bloc.name)) {
      const axis = event.shift.axis;
      bloc.prefs[axis] = Math.max(1, Math.min(5, bloc.prefs[axis] + event.shift.direction));
    }
  }
}

// Count total parties in the game (humans + bots)
function getTotalPartyCount(room) {
  return room.players.size + (room.game ? room.game.bots.length : 0);
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
    bots: room.game?.bots || [],
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
        state: "lobby",
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
      const player = room.players.get(playerId);
      if (player.party) room.availableParties.add(player.party);
      player.party = partyKey;
      room.availableParties.delete(partyKey);
      broadcastLobby(room);
    }

    if (msg.type === "startGame") {
      const room = rooms.get(roomCode);
      if (!room || playerId !== room.hostId) return;
      for (const p of room.players.values()) {
        if (!p.party) return ws.send(JSON.stringify({ type: "error", msg: `${p.name} hasn't picked a party` }));
      }
      if (room.players.size < 2) return ws.send(JSON.stringify({ type: "error", msg: "Need at least 2 players" }));
      startGamePlay(room);
    }

    if (msg.type === "submitPosition") {
      const room = rooms.get(roomCode);
      if (!room || room.state !== "playing" || !playerId) return;
      const position = msg.position;
      if (position < 1 || position > 5) return;
      const player = room.players.get(playerId);
      if (!player || !player.party) return;
      const roundIdx = room.game.currentRound;
      if (!room.game.positions[roundIdx]) room.game.positions[roundIdx] = {};
      room.game.positions[roundIdx][player.party] = position;

      ws.send(JSON.stringify({ type: "positionAck" }));

      // Count human submissions only for the display
      const humanSubmitted = [...room.players.values()].filter(p => room.game.positions[roundIdx][p.party] !== undefined).length;
      broadcast(room, { type: "submitCount", count: humanSubmitted, total: room.players.size });

      // If all humans submitted, end round early (bots already submitted)
      if (humanSubmitted >= room.players.size) {
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

  // Init credibility and vote share for human players
  for (const p of room.players.values()) {
    room.game.credibility[p.party] = 10;
    room.game.voteShare[p.party] = 0;
  }

  // If only 2 human players, add a random AI bot as spoiler
  if (room.players.size === 2) {
    const humanPartyKeys = [...room.players.values()].map(p => p.party);
    const botPartyKey = [...room.availableParties][Math.floor(Math.random() * room.availableParties.size)];
    if (botPartyKey) {
      room.game.bots.push({ partyKey: botPartyKey });
      room.game.credibility[botPartyKey] = 10;
      room.game.voteShare[botPartyKey] = 0;
      room.availableParties.delete(botPartyKey);
      console.log(`[BOT] Added ${PARTIES[botPartyKey].name} as AI spoiler`);
    }
  }

  broadcast(room, {
    type: "gameStart",
    parties: PARTIES,
    voterBlocs: room.game.voterBlocs,
    totalRounds: room.game.totalRounds,
    bots: room.game.bots.map(b => ({
      partyKey: b.partyKey,
      name: PARTIES[b.partyKey].name,
      fullName: PARTIES[b.partyKey].fullName,
      color: PARTIES[b.partyKey].color,
    })),
  });

  setTimeout(() => nextRound(room), 1500);
}

function nextRound(room) {
  room.game.currentRound++;
  const roundIdx = room.game.currentRound;

  if (roundIdx >= room.game.totalRounds) {
    endGame(room);
    return;
  }

  // Every 3rd round: apply event
  let event = null;
  if (roundIdx > 0 && roundIdx % 3 === 0) {
    event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    applyEvent(room.game, event);
  }

  const issue = room.game.issues[roundIdx];
  room.game.positions[roundIdx] = {};

  // Bot auto-submits immediately
  for (const bot of room.game.bots) {
    const botPos = chooseBotPosition(bot.partyKey, issue.axis, room.game.voterBlocs, room.game.credibility);
    room.game.positions[roundIdx][bot.partyKey] = botPos;
  }

  // Build per-player info (humans + bots)
  const playerInfo = {};
  for (const p of room.players.values()) {
    playerInfo[p.party] = {
      dna: PARTIES[p.party].dna[issue.axis],
      credibility: Math.round((room.game.credibility[p.party] || 10) * 10) / 10,
    };
  }
  for (const bot of room.game.bots) {
    playerInfo[bot.partyKey] = {
      dna: PARTIES[bot.partyKey].dna[issue.axis],
      credibility: Math.round((room.game.credibility[bot.partyKey] || 10) * 10) / 10,
      isBot: true,
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
    timeLimit: 60,
  });

  // Timer — auto-submit DNA for humans who don't submit
  room.timerHandle = setTimeout(() => {
    for (const p of room.players.values()) {
      if (!room.game.positions[roundIdx][p.party]) {
        room.game.positions[roundIdx][p.party] = PARTIES[p.party].dna[issue.axis];
      }
    }
    endRound(room);
  }, 61000);
}

function endRound(room) {
  const roundIdx = room.game.currentRound;

  const { partyVotes, blocResults } = calculateRoundVotes(room.game, roundIdx, room.players);

  // Update cumulative vote share (running average)
  for (const pk of Object.keys(partyVotes)) {
    const prevTotal = room.game.voteShare[pk] || 0;
    const roundsCompleted = roundIdx + 1;
    room.game.voteShare[pk] = ((prevTotal * roundIdx) + partyVotes[pk]) / roundsCompleted;
  }

  updateCredibility(room.game, roundIdx);

  const roundResult = {
    issue: room.game.issues[roundIdx],
    positions: { ...room.game.positions[roundIdx] },
    partyVotes,
    blocResults,
    credibility: { ...room.game.credibility },
    cumulativeVoteShare: { ...room.game.voteShare },
  };
  room.game.roundResults.push(roundResult);

  // Build leaderboard including bots
  const botKeys = room.game.bots.map(b => b.partyKey);
  const leaderboard = Object.entries(room.game.voteShare)
    .map(([pk, share]) => ({
      party: pk,
      name: PARTIES[pk].name,
      color: PARTIES[pk].color,
      share: Math.round(share * 10) / 10,
      isBot: botKeys.includes(pk),
    }))
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
    botParties: botKeys,
  });

  room.timerHandle = setTimeout(() => nextRound(room), 8000);
}

function endGame(room) {
  room.state = "finished";
  const botKeys = room.game.bots.map(b => b.partyKey);
  const leaderboard = Object.entries(room.game.voteShare)
    .map(([pk, share]) => ({
      party: pk,
      name: PARTIES[pk].name,
      color: PARTIES[pk].color,
      share: Math.round(share * 10) / 10,
      isBot: botKeys.includes(pk),
    }))
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

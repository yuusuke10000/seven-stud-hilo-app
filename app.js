/**
 * Seven Card Stud Hi-Lo (8 or Better) — 学習用クライアント
 *
 * 複数CPU・設定・戦績・履歴・デバッグ・PWA対応版。
 * bestHighFromSeven / bestLowFromSeven 等の7枚→最強5枚の判定は従来ロジックを維持。
 */

(function () {
  "use strict";

  const PLAYER = 0;
  const MAX_CPU = 5;

  const STATS_KEY = "studHiloLearn_stats_v3";
  const SETTINGS_KEY = "studHiloLearn_settings_v1";
  const HISTORY_KEY = "studHiloLearn_history_v1";
  const LEGACY_STATS_KEY = "studHiloLearn_stats_v2";

  const SUIT_CHARS = ["♠", "♥", "♦", "♣"];

  const PHASE = {
    ANTE: "Ante",
    THIRD_STREET: "Third Street",
    BETTING_1: "Betting Round 1",
    FOURTH_STREET: "Fourth Street",
    BETTING_2: "Betting Round 2",
    FIFTH_STREET: "Fifth Street",
    BETTING_3: "Betting Round 3",
    SIXTH_STREET: "Sixth Street",
    BETTING_4: "Betting Round 4",
    SEVENTH_STREET: "Seventh Street",
    BETTING_5: "Betting Round 5",
    SHOWDOWN: "Showdown",
    RESULT: "Result",
  };

  const BETTING_PHASES = new Set([
    PHASE.BETTING_1,
    PHASE.BETTING_2,
    PHASE.BETTING_3,
    PHASE.BETTING_4,
    PHASE.BETTING_5,
  ]);

  const PHASE_ORDER = [
    PHASE.ANTE,
    PHASE.THIRD_STREET,
    PHASE.BETTING_1,
    PHASE.FOURTH_STREET,
    PHASE.BETTING_2,
    PHASE.FIFTH_STREET,
    PHASE.BETTING_3,
    PHASE.SIXTH_STREET,
    PHASE.BETTING_4,
    PHASE.SEVENTH_STREET,
    PHASE.BETTING_5,
    PHASE.SHOWDOWN,
    PHASE.RESULT,
  ];

  function defaultSettings() {
    return {
      cpuCount: 1,
      startChips: 1000,
      ante: 10,
      betUnit: 20,
      difficulty: "normal",
      playSpeed: "normal",
      animations: true,
      sound: false,
      foldConfirm: true,
      blindsOn: true,
      smallBlind: 10,
      bigBlind: 20,
    };
  }

  function normalizeBlinds(sb, bb, d) {
    const smallBlind = [5, 10, 20].includes(Number(sb)) ? Number(sb) : d.smallBlind;
    let bigBlind = [10, 20, 50].includes(Number(bb)) ? Number(bb) : d.bigBlind;
    if (bigBlind < smallBlind) {
      const opts = [10, 20, 50];
      bigBlind = opts.find((x) => x >= smallBlind) || opts[opts.length - 1];
    }
    return { smallBlind, bigBlind };
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return defaultSettings();
      const o = JSON.parse(raw);
      const d = defaultSettings();
      const cpuCount = Math.min(MAX_CPU, Math.max(1, Number(o.cpuCount) || d.cpuCount));
      const startChips = [500, 1000, 2000].includes(Number(o.startChips)) ? Number(o.startChips) : d.startChips;
      const ante = [5, 10, 20].includes(Number(o.ante)) ? Number(o.ante) : d.ante;
      const betUnit = [10, 20, 50].includes(Number(o.betUnit)) ? Number(o.betUnit) : d.betUnit;
      const difficulty = ["easy", "normal", "hard"].includes(o.difficulty) ? o.difficulty : d.difficulty;
      const playSpeed = ["slow", "normal", "fast"].includes(o.playSpeed) ? o.playSpeed : d.playSpeed;
      const animations = o.animations === false ? false : o.animations === true ? true : d.animations;
      const sound = o.sound === true ? true : o.sound === false ? false : d.sound;
      const foldConfirm = o.foldConfirm === false ? false : o.foldConfirm === true ? true : d.foldConfirm;
      const blindsOn = o.blindsOn === false ? false : o.blindsOn === true ? true : d.blindsOn;
      const { smallBlind, bigBlind } = normalizeBlinds(o.smallBlind, o.bigBlind, d);
      return {
        cpuCount,
        startChips,
        ante,
        betUnit,
        difficulty,
        playSpeed,
        animations,
        sound,
        foldConfirm,
        blindsOn,
        smallBlind,
        bigBlind,
      };
    } catch {
      return defaultSettings();
    }
  }

  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  let settings = loadSettings();

  const PHASE_LABEL_JA = {
    [PHASE.ANTE]: "アンティ",
    [PHASE.THIRD_STREET]: "サードストリート",
    [PHASE.BETTING_1]: "ベットラウンド 1",
    [PHASE.FOURTH_STREET]: "フォースストリート",
    [PHASE.BETTING_2]: "ベットラウンド 2",
    [PHASE.FIFTH_STREET]: "フィフスストリート",
    [PHASE.BETTING_3]: "ベットラウンド 3",
    [PHASE.SIXTH_STREET]: "シックスストリート",
    [PHASE.BETTING_4]: "ベットラウンド 4",
    [PHASE.SEVENTH_STREET]: "セブンスストリート",
    [PHASE.BETTING_5]: "ベットラウンド 5",
    [PHASE.SHOWDOWN]: "ショーダウン",
    [PHASE.RESULT]: "結果",
  };

  function phaseLabelJa(ph) {
    return PHASE_LABEL_JA[ph] || ph;
  }

  function playerResultLabelJa(code) {
    const m = { Win: "勝ち", Lose: "負け", Split: "分け", Fold: "フォールド" };
    return m[code] || code;
  }

  function numPlayers() {
    return 1 + settings.cpuCount;
  }

  function seatLabel(seat) {
    if (seat === PLAYER) return "あなた";
    return "CPU " + seat;
  }

  function potLogLabelJa(label) {
    if (label === "Main Pot") return "メインポット";
    const m = /^Side Pot (\d+)$/.exec(label);
    if (m) return `サイドポット ${m[1]}`;
    return label;
  }

  function playSpeedMs() {
    if (settings.playSpeed === "slow") return 520;
    if (settings.playSpeed === "fast") return 70;
    return 260;
  }

  function dealAnimMs() {
    if (!settings.animations) return 0;
    if (settings.playSpeed === "slow") return 520;
    if (settings.playSpeed === "fast") return 120;
    return 280;
  }

  let audioCtx = null;
  function playTone(freq, start, dur, vol) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, start);
    o.connect(g);
    g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.02);
    g.gain.linearRampToValueAtTime(0.0001, start + dur);
    o.start(start);
    o.stop(start + dur);
  }

  function playSound(kind) {
    if (!settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;
      const v = 0.06;
      if (kind === "deal") playTone(660, now, 0.07, v * 0.9);
      else if (kind === "button") playTone(440, now, 0.05, v * 0.55);
      else if (kind === "bet") {
        playTone(523, now, 0.06, v);
        playTone(659, now + 0.05, 0.07, v * 0.75);
      } else if (kind === "fold") playTone(200, now, 0.11, v);
      else if (kind === "showdown") {
        playTone(392, now, 0.09, v);
        playTone(523, now + 0.08, 0.1, v * 0.85);
      } else if (kind === "win") {
        playTone(523, now, 0.08, v);
        playTone(659, now + 0.09, 0.08, v);
        playTone(784, now + 0.18, 0.12, v);
      }
    } catch {
      /* ignore */
    }
  }

  function scheduleClearDealPulse() {
    const ms = dealAnimMs();
    if (!game.dealPulse || !game.dealPulse.length) {
      game.dealPulse = null;
      return;
    }
    if (ms <= 0) {
      game.dealPulse = null;
      return;
    }
    setTimeout(() => {
      game.dealPulse = null;
      renderAll();
    }, ms);
  }

  function setDealPulseThird() {
    const n = numPlayers();
    const pairs = [];
    for (let s = 0; s < n; s++) {
      for (let slot = 0; slot < 3; slot++) pairs.push({ seat: s, slot });
    }
    game.dealPulse = pairs;
    playSound("deal");
    scheduleClearDealPulse();
  }

  function setDealPulseLastPerSeat() {
    const n = numPlayers();
    const pairs = [];
    for (let s = 0; s < n; s++) {
      const h = game.hands[s];
      if (h && h.length) pairs.push({ seat: s, slot: h.length - 1 });
    }
    game.dealPulse = pairs;
    playSound("deal");
    scheduleClearDealPulse();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openConfirmModal(message, primaryLabel, onPrimary) {
    const root = document.getElementById("modalRoot");
    const text = document.getElementById("modalText");
    const btnP = document.getElementById("modalPrimary");
    const btnC = document.getElementById("modalCancel");
    if (!root || !text || !btnP || !btnC) {
      if (onPrimary) onPrimary();
      return;
    }
    text.textContent = message;
    btnP.textContent = primaryLabel;
    root.hidden = false;
    function closeBoth() {
      root.hidden = true;
      btnP.removeEventListener("click", onOk);
      btnC.removeEventListener("click", onCancel);
    }
    function onOk() {
      closeBoth();
      if (onPrimary) onPrimary();
    }
    function onCancel() {
      closeBoth();
    }
    btnP.addEventListener("click", onOk);
    btnC.addEventListener("click", onCancel);
  }

  function needsNewGameConfirm() {
    if (game.phase === PHASE.RESULT) return false;
    if (!game.inProgress && (!game.hands[0] || game.hands[0].length === 0)) return false;
    return game.inProgress || (game.hands[0] && game.hands[0].length > 0) || game.phase === PHASE.SHOWDOWN;
  }

  const SCREEN_IDS = {
    top: "screenTop",
    preGame: "screenPreGame",
    game: "screenGame",
    rules: "screenRules",
    stats: "screenStats",
    history: "screenHistory",
  };

  let currentView = "top";
  const navReturn = { rules: "top", stats: "top", history: "top" };

  const CHIP_REFILL_TARGET = 1000;

  function showView(name) {
    currentView = name;
    Object.entries(SCREEN_IDS).forEach(([k, id]) => {
      const el = document.getElementById(id);
      if (el) el.hidden = k !== name;
    });
    document.body.dataset.screen = name;
    if (name === "top") renderTopChips();
    if (name === "preGame") fillSettingsForm();
    if (name === "game") renderAll();
    if (name === "stats") {
      renderStats();
      renderTopChips();
    }
    if (name === "history") renderHistory();
  }

  function renderTopChips() {
    const el = document.getElementById("topChipCount");
    if (!el) return;
    el.textContent = String(game.stats?.playerChips ?? "—");
  }

  function renderGameHudBar() {
    const left = document.getElementById("gameHudAnteBlind");
    const meta = document.getElementById("gameHudMeta");
    settings = loadSettings();
    const ante = settings.ante ?? 0;
    if (left) {
      if (settings.blindsOn) {
        left.innerHTML = `<span>アンティ：${ante}</span><span class="hud-sep">·</span><span>SB/BB：${settings.smallBlind} / ${settings.bigBlind}</span>`;
      } else {
        left.innerHTML = `<span>アンティ：${ante}</span><span class="hud-sep">·</span><span>ブラインド：OFF</span>`;
      }
    }
    if (meta) meta.textContent = `CPU ${settings.cpuCount}人`;
  }

  function rankLabel(r) {
    if (r >= 2 && r <= 10) return String(r);
    if (r === 11) return "J";
    if (r === 12) return "Q";
    if (r === 13) return "K";
    if (r === 14) return "A";
    return "?";
  }

  function makeDeck() {
    const deck = [];
    for (let s = 0; s < 4; s++) {
      for (let r = 2; r <= 14; r++) {
        deck.push({ r, s });
      }
    }
    return deck;
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function combinations5(arr) {
    const out = [];
    const n = arr.length;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        for (let c = b + 1; c < n; c++) {
          for (let d = c + 1; d < n; d++) {
            for (let e = d + 1; e < n; e++) {
              out.push([arr[a], arr[b], arr[c], arr[d], arr[e]]);
            }
          }
        }
      }
    }
    return out;
  }

  function compareKeysHigh(a, b) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const va = a[i] ?? 0;
      const vb = b[i] ?? 0;
      if (va !== vb) return va - vb;
    }
    return 0;
  }

  function straightHighFromFiveCards(cards) {
    const ranks = cards.map((c) => c.r);
    const u = [...new Set(ranks)];
    if (u.length !== 5) return null;
    u.sort((x, y) => x - y);
    if (u[0] === 2 && u[1] === 3 && u[2] === 4 && u[3] === 5 && u[4] === 14) {
      return 5;
    }
    for (let i = 0; i < 4; i++) {
      if (u[i + 1] !== u[i] + 1) return null;
    }
    return u[4];
  }

  function evaluateFiveHigh(cards) {
    const ranks = cards.map((c) => c.r);
    const sortedDesc = [...ranks].sort((a, b) => b - a);
    const byRank = {};
    for (const r of ranks) {
      byRank[r] = (byRank[r] || 0) + 1;
    }
    const entries = Object.keys(byRank).map((k) => Number(k));
    const countsList = entries.map((r) => ({ r, n: byRank[r] }));
    countsList.sort((a, b) => {
      if (b.n !== a.n) return b.n - a.n;
      return b.r - a.r;
    });

    const isFlush = cards.every((c) => c.s === cards[0].s);
    const straightTop = straightHighFromFiveCards(cards);

    if (isFlush && straightTop !== null) {
      return {
        key: [8, straightTop],
        category: "straight_flush",
        nameJa: "ストレートフラッシュ",
        detailJa: `トップ ${rankLabel(straightTop)}`,
        cards,
      };
    }

    if (countsList[0].n === 4) {
      const quad = countsList[0].r;
      const kicker = countsList.find((x) => x.n === 1).r;
      return {
        key: [7, quad, kicker],
        category: "four_kind",
        nameJa: "フォーカード",
        detailJa: `${rankLabel(quad)} ×4 · キッカー ${rankLabel(kicker)}`,
        cards,
      };
    }

    if (countsList[0].n === 3 && countsList[1].n === 2) {
      const trips = countsList[0].r;
      const pair = countsList[1].r;
      return {
        key: [6, trips, pair],
        category: "full_house",
        nameJa: "フルハウス",
        detailJa: `${rankLabel(trips)} のスリーカード & ${rankLabel(pair)} のペア`,
        cards,
      };
    }

    if (isFlush) {
      const hi = sortedDesc;
      return {
        key: [5, ...hi],
        category: "flush",
        nameJa: "フラッシュ",
        detailJa: sortedDesc.map(rankLabel).join(" "),
        cards,
      };
    }

    if (straightTop !== null) {
      return {
        key: [4, straightTop],
        category: "straight",
        nameJa: "ストレート",
        detailJa: `トップ ${rankLabel(straightTop)}`,
        cards,
      };
    }

    if (countsList[0].n === 3) {
      const t = countsList[0].r;
      const kickers = countsList.filter((x) => x.n === 1).map((x) => x.r).sort((a, b) => b - a);
      return {
        key: [3, t, ...kickers],
        category: "three_kind",
        nameJa: "スリーカード",
        detailJa: `${rankLabel(t)} ×3 · ${kickers.map(rankLabel).join(" ")}`,
        cards,
      };
    }

    if (countsList[0].n === 2 && countsList[1].n === 2) {
      const p1 = Math.max(countsList[0].r, countsList[1].r);
      const p2 = Math.min(countsList[0].r, countsList[1].r);
      const kicker = countsList[2].r;
      return {
        key: [2, p1, p2, kicker],
        category: "two_pair",
        nameJa: "ツーペア",
        detailJa: `${rankLabel(p1)} & ${rankLabel(p2)} · キッカー ${rankLabel(kicker)}`,
        cards,
      };
    }

    if (countsList[0].n === 2) {
      const p = countsList[0].r;
      const kickers = countsList.filter((x) => x.n === 1).map((x) => x.r).sort((a, b) => b - a);
      return {
        key: [1, p, ...kickers],
        category: "one_pair",
        nameJa: "ワンペア",
        detailJa: `${rankLabel(p)} のペア · ${kickers.map(rankLabel).join(" ")}`,
        cards,
      };
    }

    return {
      key: [0, ...sortedDesc],
      category: "high_card",
      nameJa: "ハイカード",
      detailJa: sortedDesc.map(rankLabel).join(" "),
      cards,
    };
  }

  function bestHighFromSeven(cards7) {
    const combos = combinations5(cards7);
    let best = null;
    for (const c5 of combos) {
      const ev = evaluateFiveHigh(c5);
      if (!best || compareKeysHigh(ev.key, best.key) > 0) {
        best = ev;
      }
    }
    return best;
  }

  function lowRanksFromFive(cards) {
    const mapped = cards.map((c) => {
      if (c.r === 14) return 1;
      if (c.r >= 2 && c.r <= 8) return c.r;
      return null;
    });
    if (mapped.some((x) => x === null)) return null;
    const set = new Set(mapped);
    if (set.size !== 5) return null;
    return [...set].sort((a, b) => a - b);
  }

  function compareLowKeys(a, b) {
    for (let i = 4; i >= 0; i--) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  }

  function formatLowKeyJa(key) {
    const order = [...key].sort((a, b) => b - a);
    const labels = order.map((n) => (n === 1 ? "A" : String(n)));
    return labels.join("-");
  }

  function bestLowFromSeven(cards7) {
    const combos = combinations5(cards7);
    let bestKey = null;
    let bestCards = null;
    for (const c5 of combos) {
      const key = lowRanksFromFive(c5);
      if (!key) continue;
      if (!bestKey || compareLowKeys(key, bestKey) < 0) {
        bestKey = key;
        bestCards = c5;
      }
    }
    if (!bestKey) return null;
    return {
      key: bestKey,
      labelJa: formatLowKeyJa(bestKey),
      cards: bestCards,
    };
  }

  function defaultStats() {
    const sc = typeof settings !== "undefined" && settings.startChips ? settings.startChips : 1000;
    return {
      totalGames: 0,
      totalHands: 0,
      playerWins: 0,
      cpuWins: 0,
      playerHighWins: 0,
      playerLowWins: 0,
      playerScoops: 0,
      maxPotWon: 0,
      playerChips: sc,
      cpuStacks: Array(MAX_CPU).fill(sc),
      totalChipsWon: 0,
      totalChipsLost: 0,
      maxChipsReached: sc,
      minChipsReached: sc,
      playerFolds: 0,
      showdownsReached: 0,
      handsByCpuCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      virtualChipRefills: 0,
    };
  }

  function loadStats() {
    try {
      let raw = localStorage.getItem(STATS_KEY);
      if (!raw) {
        raw = localStorage.getItem(LEGACY_STATS_KEY);
      }
      if (!raw) return defaultStats();
      const o = JSON.parse(raw);
      const d = defaultStats();
      const playerChips =
        o.playerChips !== undefined ? Math.max(0, Number(o.playerChips)) : d.playerChips;
      let cpuStacks = Array.isArray(o.cpuStacks)
        ? o.cpuStacks.map((x) => Math.max(0, Number(x) || 0))
        : null;
      if (!cpuStacks && o.cpuChips !== undefined) {
        cpuStacks = [Math.max(0, Number(o.cpuChips)), d.cpuStacks[1], d.cpuStacks[2]];
      }
      if (!cpuStacks) cpuStacks = [...d.cpuStacks];
      while (cpuStacks.length < MAX_CPU) cpuStacks.push(d.cpuStacks[cpuStacks.length] ?? settings.startChips);
      cpuStacks = cpuStacks.slice(0, MAX_CPU);

      const hbc = o.handsByCpuCount || {};
      return {
        totalGames: Number(o.totalGames) || 0,
        totalHands: Number(o.totalHands) || Number(o.totalGames) || 0,
        playerWins: Number(o.playerWins) || 0,
        cpuWins: Number(o.cpuWins) || 0,
        playerHighWins: Number(o.playerHighWins) || 0,
        playerLowWins: Number(o.playerLowWins) || 0,
        playerScoops: Number(o.playerScoops) || 0,
        maxPotWon: Number(o.maxPotWon) || 0,
        playerChips: Number.isFinite(playerChips) ? playerChips : d.playerChips,
        cpuStacks,
        totalChipsWon: Number(o.totalChipsWon) || 0,
        totalChipsLost: Number(o.totalChipsLost) || 0,
        maxChipsReached: Number(o.maxChipsReached) || playerChips || d.maxChipsReached,
        minChipsReached:
          o.minChipsReached !== undefined ? Number(o.minChipsReached) : playerChips || d.minChipsReached,
        playerFolds: Number(o.playerFolds) || 0,
        showdownsReached: Number(o.showdownsReached) || 0,
        handsByCpuCount: {
          1: Number(hbc[1]) || 0,
          2: Number(hbc[2]) || 0,
          3: Number(hbc[3]) || 0,
          4: Number(hbc[4]) || 0,
          5: Number(hbc[5]) || 0,
        },
        virtualChipRefills: Number(o.virtualChipRefills) || 0,
      };
    } catch {
      return defaultStats();
    }
  }

  function saveStats(s) {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
    try {
      localStorage.removeItem(LEGACY_STATS_KEY);
    } catch {
      /* ignore */
    }
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const a = JSON.parse(raw);
      return Array.isArray(a) ? a.slice(0, 10) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(entries) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 10)));
  }

  function pushHistory(entry) {
    const h = loadHistory();
    h.unshift(entry);
    saveHistory(h);
  }

  const game = {
    stats: loadStats(),
    phase: PHASE.ANTE,
    deck: [],
    hands: [],
    stacks: [],
    folded: [],
    betting: null,
    lastResult: null,
    messages: [],
    inProgress: false,
    playerFoldedThisHand: false,
    cpuChainGen: 0,
    autoProgressGen: 0,
    debugEvalCache: null,
    dealPulse: null,
    showdownRevealT: 0,
    blindRotateIndex: 0,
    handSbSeat: -1,
    handBbSeat: -1,
    handSbPaid: 0,
    handBbPaid: 0,
    handBlindsPosted: false,
    gameTab: "play",
    _didAutoResultTab: false,
    _lastLogGuideKey: "",
    totalCommitted: [],
    allIn: [],
    seatLastPayLine: [],
    dockMiniLog: [],
    handStartStacks: null,
  };

  const DOCK_MINI_MAX = 160;

  function pushDockMiniLog(line) {
    if (line !== "__SEP__") {
      if (!line || !String(line).trim()) return;
    }
    if (!game.dockMiniLog) game.dockMiniLog = [];
    game.dockMiniLog.push(line === "__SEP__" ? "__SEP__" : String(line).trim());
    while (game.dockMiniLog.length > DOCK_MINI_MAX) game.dockMiniLog.shift();
  }

  /**
   * 下部ドック：ハンド終了時のチップ増減のみ（プレイ内容は各席カード下で表示）。
   */
  function addResultDeltaLog() {
    const hn = (game.stats.totalHands || 0) + 1;
    const n = numPlayers();
    const start = game.handStartStacks;
    if (!start || !start.length || start.length < n) return;
    if (game.dockMiniLog && game.dockMiniLog.length > 0) pushDockMiniLog("__SEP__");
    pushDockMiniLog(`第${hn}ハンド結果`);
    for (let i = 0; i < n; i++) {
      const d = (game.stacks[i] ?? 0) - (start[i] ?? 0);
      if (d !== 0) pushDockMiniLog(`${seatLabel(i)}：${d > 0 ? "+" : ""}${d}`);
    }
  }

  function ensureSeatLastPay(n) {
    n = n ?? numPlayers();
    if (!game.seatLastPayLine || game.seatLastPayLine.length !== n) {
      game.seatLastPayLine = Array(n).fill("");
    }
  }

  function flushMessageLog() {
    const el = document.getElementById("messageLog");
    if (!el) return;
    const lines = game.messages.slice(-64);
    el.innerHTML = lines
      .map((t, i) => {
        const isLatest = i === lines.length - 1;
        const isPhase = /^---/.test(t) || /^\[デバッグ\]/.test(t);
        let cls = "log-line";
        if (isLatest) cls += " log-line-latest";
        if (isPhase) cls += " log-line-phase";
        return `<div class="${cls}">${escapeHtml(t)}</div>`;
      })
      .join("");
    el.scrollTop = el.scrollHeight;
  }

  function logLine(text, opts) {
    opts = opts || {};
    if (!opts.detailOnly) {
      game.messages.push(text);
      if (game.messages.length > 120) game.messages.shift();
      flushMessageLog();
    }
  }

  /** ログタブ用の全文ログ。下部ドック（チップ増減）には出さない。 */
  function addDetailLog(text, opts) {
    logLine(text, opts);
  }

  function activeSeatIndices() {
    const n = numPlayers();
    const out = [];
    for (let i = 0; i < n; i++) {
      if (!game.folded[i]) out.push(i);
    }
    return out;
  }

  function isInProgress() {
    return !!game.inProgress && game.phase !== PHASE.RESULT && game.phase !== PHASE.ANTE;
  }

  function syncStacksFromStats() {
    const n = numPlayers();
    game.stacks = [];
    game.stacks[PLAYER] = game.stats.playerChips;
    for (let i = 1; i < n; i++) {
      game.stacks[i] = game.stats.cpuStacks[i - 1] ?? settings.startChips;
    }
  }

  function writeStacksToStats() {
    game.stats.playerChips = Math.max(0, game.stacks[PLAYER] ?? 0);
    for (let i = 1; i < numPlayers(); i++) {
      if (!game.stats.cpuStacks[i - 1]) game.stats.cpuStacks[i - 1] = settings.startChips;
      game.stats.cpuStacks[i - 1] = Math.max(0, game.stacks[i] ?? 0);
    }
    const cr = game.stats.playerChips;
    if (cr > game.stats.maxChipsReached) game.stats.maxChipsReached = cr;
    if (cr < game.stats.minChipsReached) game.stats.minChipsReached = cr;
    saveStats(game.stats);
  }

  function clampStacks() {
    for (let i = 0; i < numPlayers(); i++) {
      game.stacks[i] = Math.max(0, game.stacks[i] ?? 0);
    }
    writeStacksToStats();
  }

  function betUnit() {
    return settings.betUnit;
  }

  function raiseUnit() {
    return settings.betUnit;
  }

  /** ダブル/トリプル到達目標：target===0 なら mult×ベット単位、それ以外は mult×現在の target */
  function multBetTargetLevel(mult) {
    const b = game.betting;
    const u = betUnit();
    const t = b && !b.closed ? b.target : 0;
    if (t === 0) return mult * u;
    return mult * t;
  }

  function playerExtraForMult(mult) {
    const b = game.betting;
    if (!b) return 0;
    return Math.max(0, multBetTargetLevel(mult) - b.invested[PLAYER]);
  }

  function seatExtraForMultSeat(seat, mult) {
    const b = game.betting;
    if (!b) return 0;
    const u = betUnit();
    const t = b.target;
    const goal = t === 0 ? mult * u : mult * t;
    return Math.max(0, goal - b.invested[seat]);
  }

  function anteAmt() {
    return settings.ante;
  }

  function minStacksForNewHand() {
    const n = numPlayers();
    const ante = anteAmt();
    const sb = settings.blindsOn ? settings.smallBlind : 0;
    const bb = settings.blindsOn ? settings.bigBlind : 0;
    const idx = (game.blindRotateIndex || 0) % n;
    const sbSeat = idx;
    const bbSeat = (idx + 1) % n;
    for (let i = 0; i < n; i++) {
      let need = ante;
      if (settings.blindsOn) {
        if (i === sbSeat) need += sb;
        if (i === bbSeat) need += bb;
      }
      if ((game.stacks[i] ?? 0) < need) return false;
    }
    return true;
  }

  function topUpCpuStacksForNewHandIfNeeded() {
    const n = numPlayers();
    const ante = anteAmt();
    const sb = settings.blindsOn ? settings.smallBlind : 0;
    const bb = settings.blindsOn ? settings.bigBlind : 0;
    const idx = (game.blindRotateIndex || 0) % n;
    const sbSeat = idx;
    const bbSeat = (idx + 1) % n;
    let changed = false;
    for (let i = 1; i < n; i++) {
      let need = ante;
      if (settings.blindsOn) {
        if (i === sbSeat) need += sb;
        if (i === bbSeat) need += bb;
      }
      if ((game.stacks[i] ?? 0) < need) {
        game.stacks[i] = settings.startChips;
        if (game.stats.cpuStacks) game.stats.cpuStacks[i - 1] = settings.startChips;
        changed = true;
      }
    }
    if (changed) {
      saveStats(game.stats);
      logLine("[仮想チップ] CPUのチップがアンティ等に不足していたため、初期チップに戻しました。");
    }
  }

  function refillBlockedMidHand() {
    return currentView === "game" && game.inProgress && game.phase !== PHASE.RESULT;
  }

  function tryRefillVirtualChips() {
    settings = loadSettings();
    game.stats = loadStats();
    const cur = game.stats.playerChips ?? 0;
    if (cur >= CHIP_REFILL_TARGET) {
      alert(`すでにチップが${CHIP_REFILL_TARGET}以上です。`);
      return;
    }
    if (refillBlockedMidHand()) {
      alert(
        "ハンド進行中は補充できません。\nハンド終了後、またはトップ／対戦設定／戦績からお試しください。"
      );
      return;
    }
    openConfirmModal(
      "仮想チップを補充しますか？\n（換金・課金ではありません）",
      "補充する",
      () => {
        settings = loadSettings();
        game.stats = loadStats();
        const before = game.stats.playerChips ?? 0;
        if (before >= CHIP_REFILL_TARGET) return;
        if (refillBlockedMidHand()) {
          alert("ハンドが開始されたため補充を中止しました。");
          return;
        }
        game.stats.playerChips = CHIP_REFILL_TARGET;
        game.stats.maxChipsReached = Math.max(
          game.stats.maxChipsReached ?? 0,
          CHIP_REFILL_TARGET
        );
        game.stats.virtualChipRefills = (Number(game.stats.virtualChipRefills) || 0) + 1;
        saveStats(game.stats);
        syncStacksFromStats();
        logLine(`[仮想チップ] 補充しました（${before} → ${CHIP_REFILL_TARGET}）。`);
        renderTopChips();
        renderGameHudBar();
        if (currentView === "stats") renderStats();
        renderAll();
      }
    );
  }

  function postBlindsForHand() {
    if (!settings.blindsOn) {
      game.handBlindsPosted = false;
      game.handSbSeat = -1;
      game.handBbSeat = -1;
      game.handSbPaid = 0;
      game.handBbPaid = 0;
      return;
    }
    const n = numPlayers();
    const idx = (game.blindRotateIndex || 0) % n;
    const sbS = idx;
    const bbS = (idx + 1) % n;
    game.handSbSeat = sbS;
    game.handBbSeat = bbS;
    const sbA = settings.smallBlind;
    const bbA = settings.bigBlind;
    game.handSbPaid = pay(sbS, sbA, "スモールブラインド");
    game.handBbPaid = pay(bbS, bbA, "ビッグブラインド");
    game.handBlindsPosted = true;
    logLine(`${seatLabel(sbS)} がスモールブラインド ${game.handSbPaid} を支払いました。`);
    logLine(`${seatLabel(bbS)} がビッグブラインド ${game.handBbPaid} を支払いました。`);
  }

  function advanceBlindButtonForNextHand() {
    if (!settings.blindsOn) return;
    const n = numPlayers();
    game.blindRotateIndex = ((game.blindRotateIndex || 0) + 1) % n;
  }

  function streetTransitionMs() {
    return Math.max(dealAnimMs(), playSpeedMs());
  }

  function nextSeatFrom(seat) {
    const n = numPlayers();
    for (let k = 1; k <= n; k++) {
      const j = (seat + k) % n;
      if (!game.folded[j]) return j;
    }
    return seat;
  }

  function shouldSkipBettingActor(seat) {
    const b = game.betting;
    if (!b || b.closed) return false;
    if (game.folded[seat]) return false;
    if (game.allIn[seat]) return true;
    return game.stacks[seat] === 0 && bettingToCall(seat) === 0;
  }

  function allContestingAllIn() {
    const act = activeSeatIndices();
    if (act.length <= 1) return false;
    return act.every((i) => game.allIn[i]);
  }

  function nextBettingActorFrom(seat) {
    const n = numPlayers();
    for (let k = 1; k <= n; k++) {
      const j = (seat + k) % n;
      if (game.folded[j]) continue;
      if (shouldSkipBettingActor(j)) continue;
      return j;
    }
    return seat;
  }

  function firstEligibleActorFrom(startSeat) {
    const n = numPlayers();
    for (let k = 0; k < n; k++) {
      const j = (startSeat + k) % n;
      if (game.folded[j]) continue;
      if (shouldSkipBettingActor(j)) continue;
      return j;
    }
    return startSeat;
  }

  function bettingToCall(seat) {
    const b = game.betting;
    if (!b) return 0;
    return Math.max(0, b.target - b.invested[seat]);
  }

  function bettingRoundComplete() {
    const b = game.betting;
    if (!b) return true;
    const act = activeSeatIndices();
    if (act.length <= 1) return true;
    const t = b.target;
    if (t === 0) {
      const needAct = act.filter((i) => !game.allIn[i]);
      return b.passCount >= needAct.length;
    }
    return act.every((i) => {
      if (game.allIn[i]) return true;
      return b.invested[i] === t;
    });
  }

  function resetBettingRound() {
    const n = numPlayers();
    const b = {
      invested: Array(n).fill(0),
      target: 0,
      toAct: PLAYER,
      raisesThisRound: 0,
      maxRaises: 8,
      closed: false,
      passCount: 0,
    };
    game.betting = b;
    const blindFirst =
      settings.blindsOn && game.handBlindsPosted && game.phase === PHASE.BETTING_1;
    if (blindFirst) {
      b.invested = Array(n).fill(0);
      b.invested[game.handSbSeat] = game.handSbPaid;
      b.invested[game.handBbSeat] = game.handBbPaid;
      b.target = Math.max.apply(null, b.invested);
      b.toAct = firstEligibleActorFrom(nextSeatFrom(game.handBbSeat));
      return;
    }
    let first = PLAYER;
    if (game.folded[PLAYER]) first = nextSeatFrom(PLAYER);
    b.toAct = firstEligibleActorFrom(first);
  }

  function closeBettingIfDone() {
    const b = game.betting;
    if (!b || b.closed) return;
    if (bettingRoundComplete()) {
      b.closed = true;
    }
  }

  function pay(seat, amt, lastActionJa) {
    const payAmt = Math.min(amt, game.stacks[seat] ?? 0);
    game.stacks[seat] -= payAmt;
    game.pot += payAmt;
    if (!game.totalCommitted || !game.totalCommitted.length) {
      game.totalCommitted = Array(numPlayers()).fill(0);
    }
    game.totalCommitted[seat] = (game.totalCommitted[seat] ?? 0) + payAmt;
    if (payAmt > 0 && lastActionJa) {
      ensureSeatLastPay();
      game.seatLastPayLine[seat] = `${lastActionJa} ${payAmt}`;
    }
    return payAmt;
  }

  function markAllInIfBroke(seat) {
    if ((game.stacks[seat] ?? 0) <= 0) game.allIn[seat] = true;
  }

  function canPlayerCheck() {
    const b = game.betting;
    if (!b || b.closed || b.toAct !== PLAYER || game.folded[PLAYER] || game.allIn[PLAYER]) return false;
    return bettingToCall(PLAYER) === 0;
  }

  function canPlayerBet() {
    const b = game.betting;
    if (!b || b.closed || b.toAct !== PLAYER || game.folded[PLAYER] || game.allIn[PLAYER]) return false;
    if (b.target !== 0 || b.invested[PLAYER] !== 0) return false;
    return game.stacks[PLAYER] >= betUnit();
  }

  function canPlayerCall() {
    const b = game.betting;
    if (!b || b.closed || b.toAct !== PLAYER || game.folded[PLAYER] || game.allIn[PLAYER]) return false;
    const need = bettingToCall(PLAYER);
    if (need <= 0) return false;
    return game.stacks[PLAYER] > 0;
  }

  function canPlayerRaise() {
    return canPlayerRaiseMult(2);
  }

  function canPlayerRaiseMult(mult) {
    const b = game.betting;
    if (!b || b.closed || b.toAct !== PLAYER || game.folded[PLAYER] || game.allIn[PLAYER]) return false;
    if (b.raisesThisRound >= b.maxRaises) return false;
    const extra = playerExtraForMult(mult);
    if (extra <= 0) return false;
    const stack = game.stacks[PLAYER] ?? 0;
    if (stack <= 0) return false;
    const pay = Math.min(stack, extra);
    const newInv = b.invested[PLAYER] + pay;
    return newInv > b.target;
  }

  function canPlayerAllIn() {
    const b = game.betting;
    if (!b || b.closed || b.toAct !== PLAYER || game.folded[PLAYER] || game.allIn[PLAYER]) return false;
    return game.stacks[PLAYER] > 0;
  }

  function canPlayerFold() {
    const b = game.betting;
    return !!(b && !b.closed && !game.folded[PLAYER] && !game.allIn[PLAYER] && b.toAct === PLAYER);
  }

  function canSeatPay(seat, amt) {
    return (game.stacks[seat] ?? 0) >= amt;
  }

  function canSeatRaise(seat) {
    const b = game.betting;
    if (!b || b.raisesThisRound >= b.maxRaises) return false;
    const extra = seatExtraForMultSeat(seat, 2);
    if (extra <= 0) return false;
    const stack = game.stacks[seat] ?? 0;
    if (stack <= 0) return false;
    const pay = Math.min(stack, extra);
    return b.invested[seat] + pay > b.target;
  }

  function advanceActor() {
    const b = game.betting;
    if (!b) return;
    b.toAct = nextBettingActorFrom(b.toAct);
  }

  function applyFold(seat, reasonExtra) {
    if (game.folded[seat]) return;
    game.folded[seat] = true;
    playSound("fold");
    const name = seatLabel(seat);
    ensureSeatLastPay();
    game.seatLastPayLine[seat] = "フォールド";
    logLine(`${name} がフォールドしました。${reasonExtra ? reasonExtra : ""}`);
    if (seat === PLAYER) {
      game.playerFoldedThisHand = true;
      game.stats.playerFolds += 1;
    }
    const act = activeSeatIndices();
    if (act.length === 1) {
      endHandSingleWinner(act[0]);
    }
  }

  function endHandSingleWinner(winnerSeat) {
    const payAmt = game.pot;
    game.stacks[winnerSeat] += payAmt;
    game.pot = 0;
    game.betting = null;
    game.phase = PHASE.RESULT;
    game.inProgress = false;
    const awards = Array(numPlayers()).fill(0);
    awards[winnerSeat] = payAmt;
    game.lastResult = {
      kind: "fold_survivor",
      winner: winnerSeat,
      potStart: payAmt,
      awards,
    };
    logLine(
      `フォールドで決着 — 勝者: ${seatLabel(winnerSeat)} · ポット ${payAmt} · 分配: ${awards
        .map((a, i) => `${seatLabel(i)} +${a}`)
        .join(" · ")}`
    );
    if (winnerSeat === PLAYER) playSound("win");
    addResultDeltaLog();
    finalizeFoldStats(winnerSeat, payAmt, awards);
    recordHistoryFromResult();
    advanceBlindButtonForNextHand();
    clampStacks();
    attachResultMeta();
  }

  function attachResultMeta() {
    const r = game.lastResult;
    if (!r) return;
    const n = numPlayers();
    r.meta = {
      folded: game.folded.map((f, i) => (f ? seatLabel(i) : null)).filter(Boolean),
      finalStacks: game.stacks.slice(0, n).map((s, i) => `${seatLabel(i)}: ${s}`),
      ante: anteAmt(),
      blindsOn: settings.blindsOn,
      smallBlind: settings.blindsOn ? settings.smallBlind : null,
      bigBlind: settings.blindsOn ? settings.bigBlind : null,
      sbSeat: game.handSbSeat >= 0 ? seatLabel(game.handSbSeat) : null,
      bbSeat: game.handBbSeat >= 0 ? seatLabel(game.handBbSeat) : null,
      sbPaid: game.handSbPaid,
      bbPaid: game.handBbPaid,
    };
  }

  function finalizeFoldStats(winnerSeat, potAmt, awards) {
    game.stats.totalGames += 1;
    game.stats.totalHands += 1;
    const cc = settings.cpuCount;
    game.stats.handsByCpuCount[cc] = (Number(game.stats.handsByCpuCount[cc]) || 0) + 1;

    const pAward = awards[PLAYER];
    if (pAward > 0) {
      game.stats.totalChipsWon += pAward;
      if (pAward > game.stats.maxPotWon) game.stats.maxPotWon = pAward;
    }
    if (winnerSeat !== PLAYER && game.playerFoldedThisHand && pAward === 0) {
      game.stats.totalChipsLost += 1;
    }

    if (winnerSeat === PLAYER) {
      game.stats.playerWins += 1;
    } else {
      game.stats.cpuWins += 1;
    }
    writeStacksToStats();
  }

  function splitEvenlyAmong(awards, indices, amount) {
    if (!indices.length || amount <= 0) return;
    const share = Math.floor(amount / indices.length);
    let spent = 0;
    for (const idx of indices) {
      awards[idx] += share;
      spent += share;
    }
    const rem = amount - spent;
    if (rem > 0) awards[indices[0]] += rem;
  }

  function splitPotAmounts(total, highWinners, lowWinners, lowOk, numP) {
    const awards = Array(numP).fill(0);
    if (!lowOk) {
      splitEvenlyAmong(awards, highWinners, total);
      return awards;
    }
    const scoop =
      highWinners.length === 1 &&
      lowWinners.length === 1 &&
      highWinners[0] === lowWinners[0];
    if (scoop) {
      awards[highWinners[0]] += total;
      return awards;
    }
    const highPool = Math.ceil(total / 2);
    const lowPool = total - highPool;
    splitEvenlyAmong(awards, highWinners, highPool);
    splitEvenlyAmong(awards, lowWinners, lowPool);
    return awards;
  }

  function collectVisibleForSeat(seat) {
    const h = game.hands[seat] || [];
    return h.filter((_, i) => {
      if (seat === PLAYER) return true;
      return i >= 2 && i <= 5;
    });
  }

  function collectAllVisibleExceptSeat(heroSeat) {
    const cards = [];
    for (let s = 0; s < numPlayers(); s++) {
      if (s === heroSeat) continue;
      cards.push(...collectVisibleForSeat(s));
    }
    return cards;
  }

  function partialStrength(cards) {
    if (cards.length >= 5) {
      const hi = bestHighFromSeven(cards);
      const lo = bestLowFromSeven(cards);
      return {
        highKey: hi.key,
        hasLow: !!lo,
        lowKey: lo ? lo.key : null,
      };
    }
    const ranks = cards.map((c) => c.r).sort((a, b) => b - a);
    const uniq = {};
    for (const r of ranks) uniq[r] = (uniq[r] || 0) + 1;
    const pairs = Object.values(uniq).filter((n) => n >= 2).length;
    const high = ranks[0] || 0;
    let lowScore = 0;
    for (const c of cards) {
      const v = c.r === 14 ? 1 : c.r;
      if (v >= 1 && v <= 8) lowScore += 1;
    }
    const pseudo = [pairs * 5 + Math.min(4, cards.length), high, lowScore];
    return { highKey: pseudo, hasLow: lowScore >= 3, lowKey: null };
  }

  const SUPPORT_AI_CAT_ORDER = {
    high_card: 0,
    one_pair: 1,
    two_pair: 2,
    three_kind: 3,
    straight: 4,
    flush: 5,
    full_house: 6,
    four_kind: 7,
    straight_flush: 8,
  };

  function lowBucketSupportAi(lo) {
    if (!lo) return "no";
    if (isWheelLowKey(lo.key)) return "5";
    const mx = Math.max.apply(null, lo.key);
    if (mx >= 8) return "8";
    if (mx === 7) return "7";
    if (mx === 6) return "6";
    if (mx === 5) return "5";
    return "no";
  }

  /** 伏せ・未配分カードからランダムに埋めた7枚での候補役の出現率（試行サンプル） */
  function computeSupportAiDrawOdds() {
    const hand = game.hands[PLAYER] || [];
    if (!hand.length) return null;
    const deck = game.deck && game.deck.length ? game.deck : [];
    const need = Math.max(0, 7 - hand.length);
    if (need > 0 && deck.length < need) return null;
    const sampleN = need === 0 ? 1 : Math.min(100, Math.max(48, 72));
    let gePair = 0;
    let geStraight = 0;
    let geFlush = 0;
    let geTwoPair = 0;
    let c8 = 0;
    let c7 = 0;
    let c6 = 0;
    let c5 = 0;
    let cNo = 0;
    for (let s = 0; s < sampleN; s++) {
      const h = hand.slice();
      if (need > 0) {
        const pool = shuffleInPlace(deck.slice());
        for (let i = 0; i < need; i++) h.push(pool[i]);
      }
      const hi = bestHighFromSeven(h);
      const r = SUPPORT_AI_CAT_ORDER[hi.category] ?? 0;
      if (r >= 1) gePair++;
      if (r >= 2) geTwoPair++;
      if (r >= 4) geStraight++;
      if (r >= 5) geFlush++;
      const bk = lowBucketSupportAi(bestLowFromSeven(h));
      if (bk === "8") c8++;
      else if (bk === "7") c7++;
      else if (bk === "6") c6++;
      else if (bk === "5") c5++;
      else cNo++;
    }
    const n = sampleN;
    const hiRows = [
      { label: "フラッシュ以上", pct: Math.round((geFlush / n) * 100) },
      { label: "ストレート以上", pct: Math.round((geStraight / n) * 100) },
      { label: "ツーペア以上", pct: Math.round((geTwoPair / n) * 100) },
      { label: "ワンペア以上", pct: Math.round((gePair / n) * 100) },
    ];
    const loRows = [
      { label: "8 TOP", pct: Math.round((c8 / n) * 100) },
      { label: "7 TOP", pct: Math.round((c7 / n) * 100) },
      { label: "6 TOP", pct: Math.round((c6 / n) * 100) },
      { label: "5 TOP", pct: Math.round((c5 / n) * 100) },
      { label: "ローなし", pct: Math.round((cNo / n) * 100) },
    ];
    return { hiRows, loRows, sampleN: n };
  }

  function cpuDecide(seat) {
    const mine = game.hands[seat] || [];
    const myVis = collectVisibleForSeat(seat);
    const oppVis =
      settings.difficulty === "hard"
        ? collectAllVisibleExceptSeat(seat)
        : collectVisibleForSeat(PLAYER);

    const st = partialStrength(mine);
    const oppSt = partialStrength(oppVis.length ? oppVis : mine.slice(0, 1));

    let highCmp = compareKeysHigh(st.highKey, oppSt.highKey);
    let noise = (Math.random() - 0.5) * (settings.difficulty === "easy" ? 0.55 : 0.28);
    if (settings.difficulty === "hard") {
      noise *= 0.45;
    }

    let aggress = highCmp > 0 ? 0.62 : highCmp === 0 ? 0.48 : 0.28;
    if (st.hasLow) aggress -= settings.difficulty === "hard" ? 0.06 : 0.12;
    aggress += noise;

    if (settings.difficulty === "easy") {
      aggress += (Math.random() - 0.5) * 0.25;
      if (Math.random() < 0.2) aggress -= 0.2;
      if (Math.random() < 0.18) aggress += 0.15;
    }

    const weak = aggress < 0.34;
    const strong = aggress > 0.58;

    const b = game.betting;
    const toCall = bettingToCall(seat);
    let reason = "";

    if (toCall === 0) {
      if (b.target > 0) {
        if (
          strong &&
          canSeatRaise(seat) &&
          b.raisesThisRound < b.maxRaises &&
          Math.random() < (settings.difficulty === "hard" ? 0.38 : 0.2)
        ) {
          reason = "ポジションからレイズ。";
          return { action: "raise", reason };
        }
        reason = "チェック。";
        return { action: "check", reason };
      }
      if (settings.difficulty === "easy" && Math.random() < 0.35) {
        reason = "イージー：雰囲気で手が揺れる。";
        return { action: strong && Math.random() < 0.5 ? "bet" : "check", reason };
      }
      if (weak && Math.random() < (settings.difficulty === "hard" ? 0.55 : 0.72)) {
        reason =
          settings.difficulty === "hard"
            ? "見えている範囲では弱めなのでチェック。"
            : "慎重にオープンせずチェック。";
        return { action: "check", reason };
      }
      if (strong && canSeatPay(seat, betUnit()) && Math.random() < (settings.difficulty === "hard" ? 0.75 : 0.55)) {
        reason = st.hasLow ? "ハイが強くローの芽もあるのでベット。" : "手が強そうなのでベット。";
        return { action: "bet", reason };
      }
      if (canSeatPay(seat, betUnit()) && Math.random() < 0.18) {
        reason = "様子見のプローブベット。";
        return { action: "bet", reason };
      }
      reason = "強くオープンできないのでチェック。";
      return { action: "check", reason };
    }

    if (toCall > 0) {
      if (!canSeatPay(seat, toCall)) {
        if ((game.stacks[seat] ?? 0) > 0) {
          reason = "チップ不足のためオールインでコール。";
          return { action: "call", reason };
        }
        reason = "コールに必要なチップが足りない。";
        return { action: "fold", reason };
      }
      if (settings.difficulty === "easy" && weak && Math.random() < 0.35) {
        reason = "イージー：弱めでもコールしてみる。";
        return { action: "call", reason };
      }
      if (settings.difficulty === "hard" && weak && Math.random() < 0.55) {
        reason = "見えているカードが弱くフォールド。";
        return { action: "fold", reason };
      }
      if (weak && Math.random() < 0.4) {
        reason = "弱そうなのでフォールド。";
        return { action: "fold", reason };
      }
      if (st.hasLow && !strong && Math.random() < 0.72) {
        reason = "ローが見込めるのでコール。";
        return { action: "call", reason };
      }
      if (strong && canSeatRaise(seat) && Math.random() < (settings.difficulty === "hard" ? 0.62 : 0.48)) {
        reason = "有利を広げるためにレイズ。";
        return { action: "raise", reason };
      }
      reason = "ポットに合わせてコール。";
      return { action: "call", reason };
    }

    reason = "チェック。";
    return { action: "check", reason };
  }

  function applySeatAction(seat, action, logPrefix) {
    const b = game.betting;
    const name = seatLabel(seat);
    if (action === "fold") {
      applyFold(seat, "");
      return;
    }
    if (action === "check") {
      if (bettingToCall(seat) > 0) {
        applySeatAction(seat, (game.stacks[seat] ?? 0) > 0 ? "call" : "fold", logPrefix);
        return;
      }
      ensureSeatLastPay();
      game.seatLastPayLine[seat] = "チェック";
      b.passCount += 1;
      closeBettingIfDone();
      if (!b.closed) advanceActor();
      return;
    }
    if (action === "bet") {
      if (b.target !== 0 || b.invested[seat] !== 0) {
        applySeatAction(seat, "call", logPrefix);
        return;
      }
      const stack = game.stacks[seat] ?? 0;
      if (stack <= 0) {
        applySeatAction(seat, "check", logPrefix);
        return;
      }
      if (stack < betUnit()) {
        b.passCount = 0;
        const paid = pay(seat, stack, "オールイン");
        b.invested[seat] += paid;
        game.allIn[seat] = true;
        b.target = Math.max(b.target, b.invested[seat]);
        logLine(`${name}：オールイン ${paid}（シングル相当）。`);
        closeBettingIfDone();
        if (!b.closed) advanceActor();
        return;
      }
      b.passCount = 0;
      const paid = pay(seat, betUnit(), "シングル");
      b.invested[seat] += paid;
      b.target = b.invested[seat];
      markAllInIfBroke(seat);
      if (game.allIn[seat]) {
        logLine(`${name}：オールイン ${paid}（シングル）。`);
      } else {
        if (seat === PLAYER) logLine(`あなた：シングル ${paid}。`);
      }
      closeBettingIfDone();
      if (!b.closed) advanceActor();
      return;
    }
    if (action === "call") {
      const need = bettingToCall(seat);
      if (need <= 0) {
        applySeatAction(seat, "check", logPrefix);
        return;
      }
      const stack = game.stacks[seat] ?? 0;
      if (stack <= 0) {
        applySeatAction(seat, "check", logPrefix);
        return;
      }
      const payNow = Math.min(stack, need);
      const shortCall = payNow < need;
      const paid = pay(seat, payNow, shortCall ? "オールイン" : "コール");
      b.invested[seat] += paid;
      if (shortCall) {
        game.allIn[seat] = true;
        logLine(`${name}：オールイン ${paid}（コール）。`);
      } else {
        markAllInIfBroke(seat);
        if (game.allIn[seat]) {
          logLine(`${name}：オールイン ${paid}（コール）。`);
        } else {
          if (seat === PLAYER) logLine(`あなた：コール ${paid}。`);
        }
      }
      if (b.invested[seat] > b.target) {
        b.target = b.invested[seat];
        b.raisesThisRound += 1;
      }
      closeBettingIfDone();
      if (!b.closed) advanceActor();
      return;
    }
    if (action === "raise") {
      const goal = b.target === 0 ? 2 * betUnit() : 2 * b.target;
      const needFull = goal - b.invested[seat];
      const stack = game.stacks[seat] ?? 0;
      if (needFull <= 0) {
        applySeatAction(seat, "check", logPrefix);
        return;
      }
      if (stack <= 0) {
        applyFold(seat, "");
        return;
      }
      if (stack < needFull) {
        b.passCount = 0;
        const paid = pay(seat, stack, "オールイン");
        b.invested[seat] += paid;
        game.allIn[seat] = true;
        if (b.invested[seat] > b.target) {
          b.target = b.invested[seat];
          b.raisesThisRound += 1;
        }
        logLine(`${name}：オールイン ${paid}（ダブル目標 ${goal}）。`);
        closeBettingIfDone();
        if (!b.closed) advanceActor();
        return;
      }
      b.passCount = 0;
      const paid = pay(seat, needFull, "ダブル");
      b.invested[seat] += paid;
      b.target = b.invested[seat];
      b.raisesThisRound += 1;
      markAllInIfBroke(seat);
      if (game.allIn[seat]) {
        logLine(`${name}：オールイン ${paid}（ダブル）。`);
      } else {
        if (seat === PLAYER) logLine(`あなた：ダブル ${paid}（追加投入）。`);
      }
      closeBettingIfDone();
      if (!b.closed) advanceActor();
      return;
    }
  }

  function applyCpuStep(seat) {
    const b = game.betting;
    if (!b || b.closed || game.phase !== PHASE.RESULT) {
      /* ok */
    }
    if (!b || b.closed) return;
    if (shouldSkipBettingActor(seat)) {
      if (b.target === 0 && bettingToCall(seat) === 0) {
        b.passCount += 1;
        closeBettingIfDone();
        if (!b.closed) advanceActor();
      } else {
        if (!b.closed) advanceActor();
      }
      return;
    }
    if (game.folded[seat]) {
      advanceActor();
      return;
    }
    let { action, reason } = cpuDecide(seat);
    let guard = 0;
    while (guard++ < 10) {
      if (action === "raise" && !canSeatRaise(seat)) action = "call";
      if (action === "bet" && (b.target !== 0 || b.invested[seat] !== 0)) action = "call";
      if (action === "call" && bettingToCall(seat) === 0) action = "check";
      if (action === "check" && bettingToCall(seat) > 0) {
        action = (game.stacks[seat] ?? 0) > 0 ? "call" : "fold";
      }
      if (action === "fold" && bettingToCall(seat) === 0 && b.target === 0) action = "check";
      break;
    }
    const nm = seatLabel(seat);
    if (action === "check") {
      logLine(`${nm} がチェック。`);
      logLine(`　理由: ${reason}`, { detailOnly: true });
      applySeatAction(seat, "check", "");
    } else if (action === "fold") {
      logLine(`${nm} がフォールド。`);
      logLine(`　理由: ${reason}`, { detailOnly: true });
      applySeatAction(seat, "fold", "");
    } else if (action === "bet") {
      const paidPreview = Math.min(betUnit(), game.stacks[seat] ?? 0);
      logLine(`${nm}：シングル ${paidPreview}。`);
      logLine(`　理由: ${reason}`, { detailOnly: true });
      applySeatAction(seat, "bet", "");
    } else if (action === "call") {
      const c0 = bettingToCall(seat);
      logLine(`${nm}：コール ${c0}。`);
      logLine(`　理由: ${reason}`, { detailOnly: true });
      applySeatAction(seat, "call", "");
    } else if (action === "raise") {
      const bb = game.betting;
      const goal = bb && bb.target === 0 ? 2 * betUnit() : 2 * (bb ? bb.target : 0);
      const add = bb ? Math.max(0, goal - bb.invested[seat]) : 0;
      const paidPreview = Math.min(add, game.stacks[seat] ?? 0);
      logLine(`${nm}：ダブル +${paidPreview}（目標 ${goal}）。`);
      logLine(`　理由: ${reason}`, { detailOnly: true });
      applySeatAction(seat, "raise", "");
    }
  }

  function scheduleCpuChain() {
    const myGen = ++game.cpuChainGen;
    const tick = () => {
      if (myGen !== game.cpuChainGen) return;
      const b = game.betting;
      if (!b || b.closed || !BETTING_PHASES.has(game.phase)) {
        maybeAdvanceBetting();
        renderAll();
        return;
      }
      const act = activeSeatIndices();
      if (act.length <= 1) {
        maybeAdvanceBetting();
        renderAll();
        return;
      }
      if (b.toAct === PLAYER && !game.folded[PLAYER]) {
        if (shouldSkipBettingActor(PLAYER)) {
          if (b.target === 0 && bettingToCall(PLAYER) === 0) {
            b.passCount += 1;
            closeBettingIfDone();
            if (!b.closed) advanceActor();
          } else if (!b.closed) {
            advanceActor();
          }
          clampStacks();
          setTimeout(tick, playSpeedMs());
          return;
        }
        renderAll();
        return;
      }
      if (game.folded[b.toAct]) {
        advanceActor();
        setTimeout(tick, playSpeedMs());
        return;
      }
      applyCpuStep(b.toAct);
      clampStacks();
      renderAll();
      if (!game.betting || game.betting.closed || game.phase === PHASE.RESULT) {
        maybeAdvanceBetting();
        renderAll();
        return;
      }
      setTimeout(tick, playSpeedMs());
    };
    setTimeout(tick, playSpeedMs());
  }

  function applyPlayerAction(kind) {
    game.cpuChainGen++;
    const b = game.betting;
    if (!b || b.closed || b.toAct !== PLAYER || game.folded[PLAYER]) return;
    if (game.allIn[PLAYER]) return;

    if (kind === "fold") {
      logLine("あなたがフォールドしました。");
      applyFold(PLAYER, "");
      clampStacks();
      if (game.phase !== PHASE.RESULT) scheduleCpuChain();
      return;
    }
    if (kind === "check") {
      if (!canPlayerCheck()) return;
      playSound("button");
      ensureSeatLastPay();
      game.seatLastPayLine[PLAYER] = "チェック";
      logLine("あなたがチェック。");
      b.passCount += 1;
      closeBettingIfDone();
      if (!b.closed) advanceActor();
      clampStacks();
      scheduleCpuChain();
      return;
    }
    if (kind === "bet") {
      if (!canPlayerBet()) return;
      playSound("bet");
      applySeatAction(PLAYER, "bet", "");
      clampStacks();
      scheduleCpuChain();
      return;
    }
    if (kind === "call") {
      if (!canPlayerCall()) return;
      playSound("button");
      applySeatAction(PLAYER, "call", "");
      clampStacks();
      scheduleCpuChain();
      return;
    }
    if (kind === "raise") {
      if (!canPlayerRaise()) return;
      playSound("bet");
      applySeatAction(PLAYER, "raise", "");
      clampStacks();
      scheduleCpuChain();
      return;
    }
    if (kind === "double" || kind === "triple") {
      const mult = kind === "double" ? 2 : 3;
      if (!canPlayerRaiseMult(mult)) return;
      playSound("bet");
      b.passCount = 0;
      const extra = playerExtraForMult(mult);
      const stack = game.stacks[PLAYER] ?? 0;
      const payAmt = Math.min(stack, extra);
      const paid = pay(PLAYER, payAmt, kind === "double" ? "ダブル" : "トリプル");
      b.invested[PLAYER] += paid;
      if (paid < extra) game.allIn[PLAYER] = true;
      markAllInIfBroke(PLAYER);
      if (b.invested[PLAYER] > b.target) {
        b.target = b.invested[PLAYER];
        b.raisesThisRound += 1;
      }
      if (game.allIn[PLAYER]) {
        logLine(`あなた：オールイン ${paid}（${kind === "double" ? "ダブル" : "トリプル"}）。`);
      } else {
        logLine(`あなた：${kind === "double" ? "ダブル" : "トリプル"} ${paid}（追加投入）。`);
      }
      closeBettingIfDone();
      if (!b.closed) advanceActor();
      clampStacks();
      scheduleCpuChain();
      return;
    }
    if (kind === "allin") {
      if (!canPlayerAllIn()) return;
      playSound("bet");
      b.passCount = 0;
      const paid = pay(PLAYER, game.stacks[PLAYER], "オールイン");
      b.invested[PLAYER] += paid;
      game.allIn[PLAYER] = true;
      if (b.invested[PLAYER] > b.target) {
        b.target = b.invested[PLAYER];
        b.raisesThisRound += 1;
      }
      logLine(`あなた：オールイン ${paid}。`);
      closeBettingIfDone();
      if (!b.closed) advanceActor();
      clampStacks();
      scheduleCpuChain();
      return;
    }
  }

  function startBettingIfNeeded() {
    resetBettingRound();
    logLine(`--- ${phaseLabelJa(game.phase)} ---`);
    scheduleCpuChain();
  }

  function scheduleThirdToBetting1() {
    const gen = game.autoProgressGen;
    const t = streetTransitionMs();
    setTimeout(() => {
      if (gen !== game.autoProgressGen) return;
      game.phase = PHASE.BETTING_1;
      startBettingIfNeeded();
      renderAll();
    }, t);
  }

  function dealThirdStreet() {
    const n = numPlayers();
    for (let r = 0; r < 2; r++) {
      for (let s = 0; s < n; s++) {
        game.hands[s].push(game.deck.pop());
      }
    }
    for (let s = 0; s < n; s++) {
      game.hands[s].push(game.deck.pop());
    }
  }

  function dealUpStreet() {
    const n = numPlayers();
    for (let s = 0; s < n; s++) {
      game.hands[s].push(game.deck.pop());
    }
  }

  function dealSeventh() {
    const n = numPlayers();
    for (let s = 0; s < n; s++) {
      game.hands[s].push(game.deck.pop());
    }
  }

  function buildSidePotsFromTotals(totalCommitted, folded, n) {
    const totals = Array.from({ length: n }, (_, i) => totalCommitted[i] ?? 0);
    const levels = [...new Set(totals.filter((x) => x > 0))].sort((a, b) => a - b);
    const pots = [];
    let prev = 0;
    let idx = 0;
    for (const level of levels) {
      const w = level - prev;
      if (w <= 0) {
        prev = level;
        continue;
      }
      let amount = 0;
      for (let i = 0; i < n; i++) {
        const c = totals[i];
        amount += Math.min(c, level) - Math.min(c, prev);
      }
      const eligible = [];
      for (let i = 0; i < n; i++) {
        if (!folded[i] && totals[i] >= level) eligible.push(i);
      }
      const label = idx === 0 ? "Main Pot" : `Side Pot ${idx}`;
      pots.push({ amount, eligible, eligiblePlayers: eligible, label, level });
      idx += 1;
      prev = level;
    }
    return pots;
  }

  function runSidePotTests() {
    const out = [];
    function pushCase(name, ok, detail) {
      out.push({ name, ok, detail: detail || "" });
    }
    try {
      const n = 3;
      const tc = [50, 100, 100];
      const folded = [false, false, false];
      const p1 = buildSidePotsFromTotals(tc, folded, n);
      const ok1 =
        p1.length === 2 &&
        p1[0].amount === 150 &&
        p1[1].amount === 100 &&
        p1[0].eligible.length === 3 &&
        p1[1].eligible.join(",") === "1,2";
      pushCase("Player 50 all-in vs 100/100: Main 150, Side 100, eligible", ok1, JSON.stringify(p1));

      const tc2 = [40, 80, 120, 120];
      const p2 = buildSidePotsFromTotals(tc2, [false, false, false, false], 4);
      const ok2 =
        p2.length === 3 &&
        p2[0].amount === 160 &&
        p2[1].amount === 120 &&
        p2[2].amount === 80 &&
        p2[0].eligible.length === 4 &&
        p2[1].eligible.sort((a, b) => a - b).join(",") === "1,2,3" &&
        p2[2].eligible.sort((a, b) => a - b).join(",") === "2,3";
      pushCase("40/80/120/120: three pots 160+120+80", ok2, JSON.stringify(p2));

      const p3 = buildSidePotsFromTotals([50, 100, 100], [true, false, false], 3);
      const sum3 = p3.reduce((a, x) => a + x.amount, 0);
      const ok3 = sum3 === 250 && !p3.some((x) => x.eligible.includes(0));
      pushCase("Folded short stack: pot total kept, seat0 not eligible", ok3, JSON.stringify(p3));

      const p4 = buildSidePotsFromTotals([50, 100, 100], [false, false, false], 3);
      const ok4 = p4[1].eligible.includes(0) === false && p4[0].eligible.includes(0) === true;
      pushCase("All-in short only in main: not in side eligible", ok4, "");
    } catch (e) {
      pushCase("exception", false, String(e));
    }
    return out;
  }

  function showdownAndPayout() {
    const n = numPlayers();
    const tc = game.totalCommitted && game.totalCommitted.length ? game.totalCommitted : Array(n).fill(0);
    const folded = game.folded;
    const potSum = tc.reduce((a, b) => a + (b ?? 0), 0);
    if (potSum !== game.pot) {
      logLine(`[警告] totalCommitted 合計 ${potSum} と pot ${game.pot} が一致しません。`);
    }
    const sidePotDefs = buildSidePotsFromTotals(tc, folded, n);
    for (const p of sidePotDefs) {
      logLine(
        `${potLogLabelJa(p.label)} 作成：${p.amount}（対象：${
          p.eligiblePlayers.map(seatLabel).join("、") || "—"
        }）`
      );
    }

    const awards = Array(n).fill(0);
    const potDetails = [];
    const hiEvalsFull = [];
    const loEvalsFull = [];

    let pHiAny = false;
    let pLoAny = false;
    let pScAny = false;

    for (const sp of sidePotDefs) {
      const elig = sp.eligiblePlayers.filter((i) => !folded[i]);
      if (!elig.length) continue;

      for (const i of elig) {
        if (hiEvalsFull[i] == null) hiEvalsFull[i] = bestHighFromSeven(game.hands[i]);
        if (loEvalsFull[i] === undefined) loEvalsFull[i] = bestLowFromSeven(game.hands[i]);
      }

      let bestHiKey = null;
      for (const i of elig) {
        const hi = hiEvalsFull[i];
        if (!bestHiKey || compareKeysHigh(hi.key, bestHiKey) > 0) bestHiKey = hi.key;
      }
      const highWinners = elig.filter((i) => compareKeysHigh(hiEvalsFull[i].key, bestHiKey) === 0);

      const qual = [];
      for (const i of elig) {
        const lo = loEvalsFull[i];
        if (lo) qual.push({ i, low: lo });
      }
      let lowWinners = [];
      let lowOk = false;
      if (qual.length) {
        lowOk = true;
        let bestK = qual[0].low.key;
        for (const q of qual) {
          if (compareLowKeys(q.low.key, bestK) < 0) bestK = q.low.key;
        }
        lowWinners = qual.filter((q) => compareLowKeys(q.low.key, bestK) === 0).map((q) => q.i);
      }

      const subAwards = splitPotAmounts(sp.amount, highWinners, lowWinners, lowOk, n);
      for (let i = 0; i < n; i++) awards[i] += subAwards[i] ?? 0;

      const scoop =
        lowOk &&
        highWinners.length === 1 &&
        lowWinners.length === 1 &&
        highWinners[0] === lowWinners[0];

      if (scoop) {
        logLine(`${potLogLabelJa(sp.label)}：${seatLabel(highWinners[0])} がスクープ`);
      } else {
        logLine(
          `${potLogLabelJa(sp.label)} — ハイ勝者: ${highWinners.map(seatLabel).join("、")} · ロー: ${
            lowOk ? lowWinners.map(seatLabel).join("、") : "不成立"
          }`
        );
      }

      if (highWinners.includes(PLAYER)) pHiAny = true;
      if (lowOk && lowWinners.includes(PLAYER)) pLoAny = true;
      if (scoop && highWinners[0] === PLAYER) pScAny = true;

      potDetails.push({
        label: sp.label,
        amount: sp.amount,
        eligiblePlayers: sp.eligiblePlayers.map(seatLabel),
        eligibleIndices: sp.eligiblePlayers.slice(),
        highWinners: highWinners.map(seatLabel),
        highWinnerSeats: highWinners.slice(),
        lowWinners: lowWinners.map(seatLabel),
        lowWinnerSeats: lowWinners.slice(),
        lowOk,
        scoop,
        scoopSeat: scoop ? highWinners[0] : null,
        distribution: subAwards
          .map((a, i) => ({ seat: seatLabel(i), amount: a }))
          .filter((x) => x.amount > 0),
      });
    }

    for (let i = 0; i < n; i++) {
      game.stacks[i] += awards[i] ?? 0;
    }
    const p = game.pot;
    game.pot = 0;

    const alive = activeSeatIndices();
    let bestHiKeyG = null;
    for (const i of alive) {
      const hi = hiEvalsFull[i] || bestHighFromSeven(game.hands[i]);
      hiEvalsFull[i] = hi;
      if (!bestHiKeyG || compareKeysHigh(hi.key, bestHiKeyG) > 0) bestHiKeyG = hi.key;
    }
    const highWinnersGlobal = alive.filter((i) => compareKeysHigh(hiEvalsFull[i].key, bestHiKeyG) === 0);

    const qualG = [];
    for (const i of alive) {
      const lo = loEvalsFull[i] !== undefined ? loEvalsFull[i] : bestLowFromSeven(game.hands[i]);
      loEvalsFull[i] = lo;
      if (lo) qualG.push({ i, low: lo });
    }
    let lowWinnersGlobal = [];
    let lowOkGlobal = false;
    if (qualG.length) {
      lowOkGlobal = true;
      let bestK = qualG[0].low.key;
      for (const q of qualG) {
        if (compareLowKeys(q.low.key, bestK) < 0) bestK = q.low.key;
      }
      lowWinnersGlobal = qualG.filter((q) => compareLowKeys(q.low.key, bestK) === 0).map((q) => q.i);
    }

    const scoopGlobal =
      lowOkGlobal &&
      highWinnersGlobal.length === 1 &&
      lowWinnersGlobal.length === 1 &&
      highWinnersGlobal[0] === lowWinnersGlobal[0];

    game.lastResult = {
      kind: "showdown",
      potStart: p,
      potDetails,
      sidePots: potDetails,
      highWinners: highWinnersGlobal,
      lowWinners: lowWinnersGlobal,
      lowOk: lowOkGlobal,
      hiEvals: hiEvalsFull,
      loEvals: loEvalsFull,
      scoop: scoopGlobal,
      awards,
      noQualLowText: "ロー不成立（8オアベターの条件を満たすプレイヤーがいません）",
      noQualLowEn: "No qualifying low hand",
      alive,
      hasSidePots: potDetails.length > 1,
    };

    const hiWLog = highWinnersGlobal.map((i) => seatLabel(i)).join("、");
    const loWLog = lowOkGlobal ? lowWinnersGlobal.map((i) => seatLabel(i)).join("、") : "ロー不成立";
    logLine(
      `ショーダウン結果（合計） — ハイ: ${hiWLog} · ロー: ${loWLog} · 分配: ${awards
        .map((a, i) => `${seatLabel(i)} +${a}`)
        .join(" · ")}`
    );

    addResultDeltaLog();

    game.stats.totalGames += 1;
    game.stats.totalHands += 1;
    game.stats.showdownsReached += 1;
    const cc = settings.cpuCount;
    game.stats.handsByCpuCount[cc] = (Number(game.stats.handsByCpuCount[cc]) || 0) + 1;

    const pAward = awards[PLAYER];
    const maxA = Math.max(...awards);
    if (pAward === maxA && maxA > 0) game.stats.playerWins += 1;
    if (pAward < maxA && maxA > 0) game.stats.cpuWins += 1;

    if (pHiAny) game.stats.playerHighWins += 1;
    if (pLoAny) game.stats.playerLowWins += 1;
    if (pScAny) game.stats.playerScoops += 1;

    if (pAward > 0) game.stats.totalChipsWon += pAward;

    if (pAward > game.stats.maxPotWon) game.stats.maxPotWon = pAward;

    if (pAward > 0 && pAward === maxA) playSound("win");

    writeStacksToStats();
    recordHistoryFromResult();
    clampStacks();
    attachResultMeta();
  }

  function recordHistoryFromResult() {
    const r = game.lastResult;
    if (!r) return;
    const cpuCount = settings.cpuCount;
    let playerResult = "Lose";
    const pA = r.awards[PLAYER];
    if (game.playerFoldedThisHand) playerResult = "Fold";
    else if (r.kind === "showdown") {
      const maxAward = Math.max(...r.awards);
      if (pA === 0) playerResult = "Lose";
      else if (pA === maxAward && maxAward > 0) {
        const cnt = r.awards.filter((x) => x === maxAward).length;
        playerResult = cnt === 1 ? "Win" : "Split";
      } else playerResult = "Lose";
    } else if (r.kind === "fold_survivor") {
      playerResult = r.winner === PLAYER ? "Win" : "Lose";
    }

    const hiP = r.kind === "showdown" && r.hiEvals ? r.hiEvals[PLAYER] : null;
    const loP = r.kind === "showdown" && r.loEvals ? r.loEvals[PLAYER] : null;
    const potLayers =
      r.kind === "showdown" && Array.isArray(r.potDetails)
        ? r.potDetails.length
        : 1;
    pushHistory({
      at: new Date().toISOString(),
      cpuCount,
      pot: r.potStart,
      highWinners:
        r.kind === "fold_survivor"
          ? seatLabel(r.winner)
          : (r.highWinners || []).map(seatLabel).join(", "),
      lowWinners:
        r.kind === "showdown" && r.lowOk ? r.lowWinners.map(seatLabel).join(", ") : "—",
      scoop: !!(r.kind === "showdown" && r.scoop),
      playerResult,
      playerHigh: hiP ? `${hiP.nameJa} (${hiP.detailJa})` : "—",
      playerLowOk: !!loP,
      blindsOn: !!settings.blindsOn,
      smallBlind: settings.blindsOn ? settings.smallBlind : null,
      bigBlind: settings.blindsOn ? settings.bigBlind : null,
      sbSeat:
        settings.blindsOn && game.handSbSeat >= 0 ? seatLabel(game.handSbSeat) : null,
      bbSeat:
        settings.blindsOn && game.handBbSeat >= 0 ? seatLabel(game.handBbSeat) : null,
      hasSidePots: potLayers > 1,
      sidePotCount: potLayers,
    });
  }

  function fastForwardDealsToShowdown() {
    const gen = game.autoProgressGen;
    const t = streetTransitionMs();
    function tick() {
      if (gen !== game.autoProgressGen) return;
      const h0 = game.hands[0] || [];
      if (h0.length >= 7) {
        goShowdownFromBetting();
        return;
      }
      const len = h0.length;
      if (len === 3) {
        dealUpStreet();
        logLine("フォースストリート：公開カードが1枚追加（全員オールイン・ベット省略）。");
        setDealPulseLastPerSeat();
        game.phase = PHASE.FOURTH_STREET;
      } else if (len === 4) {
        dealUpStreet();
        logLine("フィフスストリート：公開カードが1枚追加（全員オールイン・ベット省略）。");
        setDealPulseLastPerSeat();
        game.phase = PHASE.FIFTH_STREET;
      } else if (len === 5) {
        dealUpStreet();
        logLine("シックスストリート：公開カードが1枚追加（全員オールイン・ベット省略）。");
        setDealPulseLastPerSeat();
        game.phase = PHASE.SIXTH_STREET;
      } else if (len === 6) {
        dealSeventh();
        logLine("セブンスストリート：最後のホール配布（全員オールイン・ベット省略）。");
        setDealPulseLastPerSeat();
        game.phase = PHASE.SEVENTH_STREET;
      }
      clampStacks();
      renderAll();
      setTimeout(tick, t);
    }
    setTimeout(tick, t);
  }

  function goShowdownFromBetting() {
    logLine("--- ショーダウン ---");
    logLine("CPUの伏せカードを含め、全カードを公開します。");
    game.betting = null;
    game.phase = PHASE.SHOWDOWN;
    game.showdownRevealT = Date.now();
    playSound("showdown");
    const gen = game.autoProgressGen;
    const dReveal = Math.max(900, dealAnimMs() + playSpeedMs());
    setTimeout(() => {
      if (gen !== game.autoProgressGen) return;
      renderAll();
      setTimeout(() => {
        if (gen !== game.autoProgressGen) return;
        showdownAndPayout();
        game.phase = PHASE.RESULT;
        game.inProgress = false;
        advanceBlindButtonForNextHand();
        renderAll();
      }, Math.max(380, playSpeedMs() * 2));
    }, dReveal);
  }

  function afterBettingRoundClosed() {
    const ph = game.phase;
    if (ph === PHASE.BETTING_5) {
      goShowdownFromBetting();
      return;
    }
    const gen = game.autoProgressGen;
    const t = streetTransitionMs();
    game.betting = null;
    clampStacks();

    if (allContestingAllIn()) {
      logLine("[オールイン] 残りストリートはベットなしで配布し、ショーダウンへ進みます。");
      fastForwardDealsToShowdown();
      return;
    }

    if (ph === PHASE.BETTING_1) {
      dealUpStreet();
      logLine("フォースストリート：公開カードが1枚追加されました。");
      setDealPulseLastPerSeat();
      game.phase = PHASE.FOURTH_STREET;
      renderAll();
      setTimeout(() => {
        if (gen !== game.autoProgressGen) return;
        game.phase = PHASE.BETTING_2;
        startBettingIfNeeded();
        renderAll();
      }, t);
      return;
    }
    if (ph === PHASE.BETTING_2) {
      dealUpStreet();
      logLine("フィフスストリート：公開カードが1枚追加されました。");
      setDealPulseLastPerSeat();
      game.phase = PHASE.FIFTH_STREET;
      renderAll();
      setTimeout(() => {
        if (gen !== game.autoProgressGen) return;
        game.phase = PHASE.BETTING_3;
        startBettingIfNeeded();
        renderAll();
      }, t);
      return;
    }
    if (ph === PHASE.BETTING_3) {
      dealUpStreet();
      logLine("シックスストリート：公開カードが1枚追加されました。");
      setDealPulseLastPerSeat();
      game.phase = PHASE.SIXTH_STREET;
      renderAll();
      setTimeout(() => {
        if (gen !== game.autoProgressGen) return;
        game.phase = PHASE.BETTING_4;
        startBettingIfNeeded();
        renderAll();
      }, t);
      return;
    }
    if (ph === PHASE.BETTING_4) {
      dealSeventh();
      logLine("セブンスストリート：最後のホールカードが配られました。");
      setDealPulseLastPerSeat();
      game.phase = PHASE.SEVENTH_STREET;
      renderAll();
      setTimeout(() => {
        if (gen !== game.autoProgressGen) return;
        game.phase = PHASE.BETTING_5;
        startBettingIfNeeded();
        renderAll();
      }, t);
      return;
    }
  }

  function maybeAdvanceBetting() {
    const b = game.betting;
    if (!b || !b.closed) return;
    if (!PHASE_ORDER.includes(game.phase)) return;
    afterBettingRoundClosed();
  }

  function cardClass(card) {
    return card.s === 1 || card.s === 2 ? "card red" : "card black";
  }

  function cardKey(card) {
    return card.r + "-" + card.s;
  }

  function renderFaceCard(card, hl, slotIndex, seat, flipPhase) {
    const span = document.createElement("span");
    span.className = cardClass(card);
    const k = cardKey(card);
    if (
      seat !== PLAYER &&
      flipPhase &&
      game.showdownRevealT &&
      Date.now() - game.showdownRevealT < 900 &&
      (slotIndex === 0 || slotIndex === 1 || slotIndex === 6)
    ) {
      span.classList.add("card-showdown-flip");
    }
    if (hl && game.phase === PHASE.RESULT && game.lastResult && game.lastResult.kind === "showdown") {
      const inH = hl.high.has(k);
      const inL = hl.low.has(k);
      if (inH && inL) span.classList.add("card-win-highlow");
      else if (inH) span.classList.add("card-win-high");
      else if (inL) span.classList.add("card-win-low");
    }
    let badges = "";
    if (hl && game.phase === PHASE.RESULT && game.lastResult && game.lastResult.kind === "showdown") {
      const inH = hl.high.has(k);
      const inL = hl.low.has(k);
      if (inH && inL) badges = '<span class="hl-badge hl-both">H+L</span>';
      else if (inH) badges = '<span class="hl-badge hl-h">H</span>';
      else if (inL) badges = '<span class="hl-badge hl-l">L</span>';
    }
    span.innerHTML = `<span class="rank">${rankLabel(card.r)}</span><span class="suit">${SUIT_CHARS[card.s]}</span>${badges}`;
    const pulse = game.dealPulse && game.dealPulse.some((p) => p.seat === seat && p.slot === slotIndex);
    if (pulse && settings.animations) span.classList.add("card-deal-in");
    return span;
  }

  function renderHiddenCard() {
    const span = document.createElement("span");
    span.className = "card card-back";
    span.innerHTML = '<span class="back-pattern" aria-hidden="true"></span>';
    span.setAttribute("aria-label", "伏せカード");
    return span;
  }

  function isCpuCardHidden(slotIndex, showdown) {
    if (showdown) return false;
    return slotIndex === 0 || slotIndex === 1 || slotIndex === 6;
  }

  function winningHlKeysForSeat(seat) {
    const high = new Set();
    const low = new Set();
    if (game.phase !== PHASE.RESULT || !game.lastResult) return { high, low };
    const r = game.lastResult;
    if (r.kind !== "showdown" || game.folded[seat]) return { high, low };
    const hi = r.hiEvals[seat];
    const lo = r.loEvals[seat];
    if (r.highWinners.includes(seat) && hi && hi.cards) {
      hi.cards.forEach((c) => high.add(cardKey(c)));
    }
    if (r.lowOk && r.lowWinners.includes(seat) && lo && lo.cards) {
      lo.cards.forEach((c) => low.add(cardKey(c)));
    }
    return { high, low };
  }

  function seatIsResultWinner(seat) {
    if (game.phase !== PHASE.RESULT || !game.lastResult) return false;
    const r = game.lastResult;
    if (r.kind === "fold_survivor") return r.winner === seat;
    return (r.awards[seat] ?? 0) > 0;
  }

  function renderHandForSeat(hand, seat, showdownVisual, hl) {
    const wrap = document.createElement("div");
    wrap.className = "hand hand-scroll";
    const flipPhase = game.phase === PHASE.SHOWDOWN;
    (hand || []).forEach((card, slotIndex) => {
      if (seat === PLAYER) {
        wrap.appendChild(renderFaceCard(card, hl, slotIndex, seat, flipPhase));
        return;
      }
      if (isCpuCardHidden(slotIndex, showdownVisual)) {
        wrap.appendChild(renderHiddenCard());
      } else {
        wrap.appendChild(renderFaceCard(card, hl, slotIndex, seat, flipPhase));
      }
    });
    return wrap;
  }

  function lastPayAmountFromLine(line) {
    if (!line) return 0;
    const s = String(line).trim();
    if (s === "フォールド" || s === "チェック") return 0;
    const m = /(\d+)\s*$/.exec(s);
    return m ? Number(m[1]) : 0;
  }

  function lowLadderShortJa(lo) {
    if (!lo) return "ローなし";
    if (isWheelLowKey(lo.key)) return "5 TOP";
    const mx = Math.max.apply(null, lo.key);
    if (mx >= 8) return "8 TOP";
    if (mx === 7) return "7 TOP";
    if (mx === 6) return "6 TOP";
    if (mx <= 5) return "5 TOP";
    return "ローなし";
  }

  function seatCardFootLine1Html(seat) {
    const t = (game.seatLastPayLine[seat] || "").trim();
    return t ? escapeHtml(t) : "";
  }

  function seatCardFootLine2Html(seat, showdown) {
    const folded = !!game.folded[seat];
    const tcTot =
      game.totalCommitted && game.totalCommitted[seat] != null ? game.totalCommitted[seat] : 0;
    const lp = lastPayAmountFromLine(game.seatLastPayLine[seat] || "");
    const stats = `累計 ${tcTot} / 直近 ${lp}`;
    if (folded) return escapeHtml(stats);
    const hand = game.hands[seat] || [];
    const allInSeat = !!(game.allIn && game.allIn[seat]);
    let role = "";
    if (seat === PLAYER) {
      if (hand.length >= 5) {
        const hi = bestHighFromSeven(hand);
        const lo = bestLowFromSeven(hand);
        role = `ハイ：${hi.nameJa} / ロー：${lowLadderShortJa(lo)}`;
        if (allInSeat) role = `オールイン · ${role}`;
      } else if (allInSeat) {
        role = "オールイン";
      }
    } else {
      const canShowCpu =
        (game.phase === PHASE.SHOWDOWN || game.phase === PHASE.RESULT) &&
        showdown &&
        !folded &&
        hand.length === 7;
      if (canShowCpu) {
        const hi = bestHighFromSeven(hand);
        const lo = bestLowFromSeven(hand);
        role = `ハイ：${hi.nameJa} / ロー：${lowLadderShortJa(lo)}`;
        if (allInSeat) role = `オールイン · ${role}`;
      }
    }
    const full = role ? `${stats} · ${role}` : stats;
    return escapeHtml(full);
  }

  function buildSeatPanel(seat, showdown) {
    const won = seatIsResultWinner(seat);
    const wonBig = seat === PLAYER && won && game.phase === PHASE.RESULT;
    const folded = !!game.folded[seat];
    const wrap = document.createElement("div");
    const allInSeat = !!(game.allIn && game.allIn[seat] && !folded);
    wrap.className =
      "seat-panel" +
      (seat === PLAYER ? " seat-human" : "") +
      (folded ? " is-folded" : "") +
      (allInSeat ? " is-allin" : "") +
      (won ? " is-winner" : "") +
      (wonBig ? " seat-won-player" : "");

    const head = document.createElement("div");
    head.className = "seat-head";
    ensureSeatLastPay();
    let headHtml = `<span class="seat-name">${seatLabel(seat)}</span>`;
    if (settings.blindsOn && game.handBlindsPosted && game.handSbSeat === seat) {
      headHtml += `<span class="blind-badge blind-sb">SB</span>`;
    }
    if (settings.blindsOn && game.handBlindsPosted && game.handBbSeat === seat) {
      headHtml += `<span class="blind-badge blind-bb">BB</span>`;
    }
    headHtml += `<span class="seat-chips">${game.stacks[seat] ?? 0} チップ</span>`;
    if (allInSeat) headHtml += `<span class="seat-allin-badge">オールイン</span>`;
    if (folded) headHtml += `<span class="seat-fold-badge seat-fold-badge-lg">フォールド</span>`;
    head.innerHTML = headHtml;
    wrap.appendChild(head);

    const hk = winningHlKeysForSeat(seat);
    wrap.appendChild(renderHandForSeat(game.hands[seat], seat, showdown, hk));

    const foot = document.createElement("div");
    foot.className = "seat-card-foot";
    const l1 = document.createElement("div");
    l1.className = "seat-foot-line seat-foot-line1";
    l1.innerHTML = seatCardFootLine1Html(seat);
    const l2 = document.createElement("div");
    l2.className = "seat-foot-line seat-foot-line2";
    l2.innerHTML = seatCardFootLine2Html(seat, showdown);
    foot.appendChild(l1);
    foot.appendChild(l2);
    wrap.appendChild(foot);

    return wrap;
  }

  const SEAT_GRID_IDS = {
    TL: "seatTL",
    TC: "seatTC",
    TR: "seatTR",
    ML: "seatML",
    MR: "seatMR",
    BL: "seatBL",
    BR: "seatBR",
    PLAYER: "seatBottom",
  };

  const CPU_LAYOUT = {
    1: { TC: 1 },
    2: { TL: 1, TR: 2 },
    3: { TL: 1, TC: 2, TR: 3 },
    4: { TL: 1, TC: 2, TR: 3, BR: 4 },
    5: { TL: 1, TC: 2, TR: 3, BR: 4, BL: 5 },
  };

  const HAND_HIGH_LADDER = [
    { id: "four_plus", label: "フォーカード以上" },
    { id: "full_house", label: "フルハウス" },
    { id: "flush", label: "フラッシュ" },
    { id: "straight", label: "ストレート" },
    { id: "three_kind", label: "スリーカード" },
    { id: "two_pair", label: "ツーペア" },
    { id: "one_pair", label: "ワンペア" },
    { id: "high_card", label: "ハイカード" },
  ];

  const HAND_LOW_LADDER = [
    { id: "five_wheel", label: "5 TOP" },
    { id: "6", label: "6 TOP" },
    { id: "7", label: "7 TOP" },
    { id: "8", label: "8 TOP" },
    { id: "none", label: "ローなし" },
  ];

  function isWheelLowKey(key) {
    if (!key || key.length !== 5) return false;
    const sorted = [...key].sort((a, b) => a - b);
    return sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3 && sorted[3] === 4 && sorted[4] === 5;
  }

  function currentLowLadderRowId(lo) {
    if (!lo) return "none";
    if (isWheelLowKey(lo.key)) return "five_wheel";
    const mx = Math.max.apply(null, lo.key);
    if (mx >= 8) return "8";
    if (mx === 7) return "7";
    if (mx === 6) return "6";
    if (mx === 5) return "five_wheel";
    return "none";
  }

  function highLadderHighlightId(hiEv) {
    if (!hiEv) return null;
    const c = hiEv.category;
    if (c === "four_kind" || c === "straight_flush") return "four_plus";
    return c;
  }

  function renderHandRankPanel() {
    const metaEl = document.getElementById("handRankMeta");
    const hiEl = document.getElementById("handRankHighWrap");
    const loEl = document.getElementById("handRankLowWrap");
    if (!metaEl || !hiEl || !loEl) return;

    const folded = !!game.folded[PLAYER];
    const allInPl = !!(game.allIn && game.allIn[PLAYER]);

    const hand = game.hands[PLAYER] || [];
    const n = hand.length;
    let hiEv = null;
    let loEv = null;
    let prov = false;
    let hiHiId = null;
    let loRowId = null;

    if (game.phase === PHASE.RESULT && game.lastResult && game.lastResult.kind === "showdown") {
      hiEv = game.lastResult.hiEvals[PLAYER];
      loEv = game.lastResult.loEvals[PLAYER];
      hiHiId = highLadderHighlightId(hiEv);
      loRowId = loEv ? currentLowLadderRowId(loEv) : "none";
    } else if (!folded && n >= 5) {
      hiEv = bestHighFromSeven(hand);
      loEv = bestLowFromSeven(hand);
      hiHiId = highLadderHighlightId(hiEv);
      loRowId = loEv ? currentLowLadderRowId(loEv) : "none";
      prov = true;
    }

    const dimFold = folded;
    const hiRows = HAND_HIGH_LADDER.map((row) => {
      const on = !dimFold && hiHiId !== null && hiHiId === row.id;
      const cls =
        "hr-row" +
        (on ? " is-current" : "") +
        (on && prov ? " is-provisional" : "") +
        (dimFold ? " is-muted" : "");
      return `<div class="${cls}">${escapeHtml(row.label)}</div>`;
    }).join("");

    const lowRows = HAND_LOW_LADDER.map((row) => {
      let on = false;
      if (!dimFold && loRowId != null) {
        if (row.id === "none") on = loRowId === "none";
        else on = loRowId === row.id;
      }
      const provLow = on && prov && row.id !== "none";
      const cls =
        "hr-row" +
        (on ? " is-current" : "") +
        (provLow ? " is-provisional" : "") +
        (dimFold ? " is-muted" : "");
      return `<div class="${cls}">${escapeHtml(row.label)}</div>`;
    }).join("");

    const statusLines = [];
    if (allInPl && !folded) {
      statusLines.push(
        '<p class="hr-status hr-allin">オールイン — ショーダウンまで残ります（追加アクション不可）</p>'
      );
    }

    const wrapCls =
      "hr-wrap hr-wrap-dock" +
      (dimFold ? " is-folded" : "") +
      (allInPl && !folded ? " is-allin-panel" : "");
    metaEl.innerHTML = `<div class="${wrapCls}">${statusLines.join("")}</div>`;
    hiEl.innerHTML = `<div class="hr-col hr-col-high">${hiRows}</div>`;
    loEl.innerHTML = `<div class="hr-col hr-col-low">${lowRows}</div>`;
    const dockRoot = metaEl.closest(".hand-rank-dock-root");
    if (dockRoot) dockRoot.classList.toggle("is-folded", dimFold);
  }

  function renderDockMiniLog() {
    const el = document.getElementById("dockMiniLog");
    if (!el) return;
    const lines = game.dockMiniLog && game.dockMiniLog.length ? game.dockMiniLog : [];
    if (!lines.length) {
      el.innerHTML = '<span class="dock-mini-placeholder">—</span>';
      el.scrollTop = 0;
      return;
    }
    el.innerHTML = lines
      .map((t) => {
        if (t === "__SEP__") return '<div class="dock-mini-sep" role="presentation"></div>';
        return `<div class="dock-mini-line">${escapeHtml(t)}</div>`;
      })
      .join("");
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }

  function renderSupportAi() {
    const el = document.getElementById("dockSupportAi");
    if (!el) return;
    if (game.folded[PLAYER]) {
      el.innerHTML = '<div class="support-ai-static">フォールド済み</div>';
      return;
    }
    if (game.allIn[PLAYER]) {
      el.innerHTML = '<div class="support-ai-static">オールイン中</div>';
      return;
    }
    if (game.phase === PHASE.SHOWDOWN || game.phase === PHASE.RESULT) {
      el.innerHTML =
        '<div class="support-ai-static">結果はログまたは結果タブで確認できます</div>';
      return;
    }
    const odds = computeSupportAiDrawOdds();
    if (!odds) {
      el.innerHTML = '<div class="support-ai-static">—</div>';
      return;
    }
    const hiList = odds.hiRows
      .map(
        (r) =>
          `<li><span class="support-ai-li-lbl">${escapeHtml(r.label)}</span><span class="support-ai-li-pct">${r.pct}%</span></li>`
      )
      .join("");
    const loList = odds.loRows
      .map(
        (r) =>
          `<li><span class="support-ai-li-lbl">${escapeHtml(r.label)}</span><span class="support-ai-li-pct">${r.pct}%</span></li>`
      )
      .join("");
    el.innerHTML = `
      <div class="support-ai-cols">
        <div class="support-ai-col">
          <div class="support-ai-h">ハイ候補</div>
          <ul class="support-ai-list">${hiList}</ul>
        </div>
        <div class="support-ai-col">
          <div class="support-ai-h">ロー候補</div>
          <ul class="support-ai-list">${loList}</ul>
        </div>
      </div>`;
  }

  function renderStatus() {
    const potEl = document.getElementById("potLabel");
    if (potEl) potEl.textContent = String(game.pot);
  }

  function renderStats() {
    settings = loadSettings();
    const s = game.stats;
    const box = document.getElementById("statsContent");
    if (!box) return;
    const cc = settings.cpuCount;
    box.innerHTML = `
      <div class="stats-grid">
        <div class="stats-block">
          <h4>基本戦績</h4>
          <p>総プレイハンド: <strong>${s.totalHands}</strong></p>
          <p>総ゲーム記録: <strong>${s.totalGames}</strong></p>
        </div>
        <div class="stats-block">
          <h4>勝敗</h4>
          <p>プレイヤー勝利: <strong>${s.playerWins}</strong> / CPU側: <strong>${s.cpuWins}</strong></p>
          <p>ハイ獲得: <strong>${s.playerHighWins}</strong> · ロー獲得: <strong>${s.playerLowWins}</strong> · スクープ: <strong>${s.playerScoops}</strong></p>
        </div>
        <div class="stats-block">
          <h4>チップ</h4>
          <p>総獲得: <strong>${s.totalChipsWon}</strong> · 総損失計上: <strong>${s.totalChipsLost}</strong></p>
          <p>最大到達: <strong>${s.maxChipsReached}</strong> · 最小到達: <strong>${s.minChipsReached}</strong></p>
          <p>最大1ハンド獲得: <strong>${s.maxPotWon}</strong></p>
          <p class="stats-chips">現在 — あなた: <strong>${s.playerChips}</strong> · CPU: <strong>${s.cpuStacks.slice(0, cc).join(", ")}</strong></p>
          <p>仮想チップ補充（累計回数）: <strong>${s.virtualChipRefills ?? 0}</strong></p>
        </div>
        <div class="stats-block">
          <h4>プレイ傾向</h4>
          <p>フォールド: <strong>${s.playerFolds}</strong> · ショーダウン到達: <strong>${s.showdownsReached}</strong></p>
        </div>
        <div class="stats-block">
          <h4>CPU人数別プレイ回数</h4>
          <p>1人 <strong>${s.handsByCpuCount[1] ?? 0}</strong> · 2人 <strong>${s.handsByCpuCount[2] ?? 0}</strong> · 3人 <strong>${s.handsByCpuCount[3] ?? 0}</strong> · 4人 <strong>${s.handsByCpuCount[4] ?? 0}</strong> · 5人 <strong>${s.handsByCpuCount[5] ?? 0}</strong></p>
        </div>
      </div>
    `;
  }

  function renderHistory() {
    const el = document.getElementById("historyContent");
    if (!el) return;
    const h = loadHistory();
    if (!h.length) {
      el.innerHTML = "<p class=\"note history-empty\">履歴はまだありません。</p>";
      return;
    }
    el.innerHTML =
      '<div class="history-cards">' +
      h
        .map(
          (e) =>
            `<div class="history-card">
            <div class="history-card-head"><time class="history-time">${escapeHtml(e.at)}</time>
            <span class="hist-res hist-res-${e.playerResult}">${playerResultLabelJa(e.playerResult)}</span></div>
            <ul class="history-card-rows">
              <li><span class="hck">CPU人数</span><span class="hcv">${e.cpuCount}人</span></li>
              <li><span class="hck">ポット</span><span class="hcv">${e.pot}</span></li>
              ${
                e.blindsOn === true
                  ? `<li><span class="hck">Blind</span><span class="hcv">ON（SB ${e.smallBlind} / BB ${e.bigBlind}）</span></li>
              <li><span class="hck">SB</span><span class="hcv">${escapeHtml(String(e.sbSeat || "—"))}</span></li>
              <li><span class="hck">BB</span><span class="hcv">${escapeHtml(String(e.bbSeat || "—"))}</span></li>`
                  : e.blindsOn === false
                    ? `<li><span class="hck">Blind</span><span class="hcv">OFF</span></li>`
                    : ""
              }
              <li><span class="hck">ハイ勝者</span><span class="hcv">${escapeHtml(String(e.highWinners))}</span></li>
              <li><span class="hck">ロー勝者</span><span class="hcv">${escapeHtml(String(e.lowWinners))}</span></li>
              <li><span class="hck">スクープ</span><span class="hcv">${e.scoop ? "あり" : "なし"}</span></li>
              <li><span class="hck">ポット層</span><span class="hcv">${(e.sidePotCount ?? 1) > 1 ? `メイン＋サイド ${(e.sidePotCount ?? 1) - 1}` : "メインのみ"}</span></li>
              <li><span class="hck">あなたのハイ</span><span class="hcv">${escapeHtml(String(e.playerHigh))}</span></li>
              <li><span class="hck">ロー成立</span><span class="hcv">${e.playerLowOk ? "あり" : "なし"}</span></li>
            </ul>
          </div>`
        )
        .join("") +
      "</div>";
  }

  function formatResultMetaHtml(m) {
    if (!m) return "";
    const fd = m.folded.length ? m.folded.join("、") : "なし";
    const stacks = (m.finalStacks || []).map((s) => escapeHtml(s)).join("<br/>");
    const blind =
      m.blindsOn === true
        ? `ON — SB ${escapeHtml(String(m.sbSeat))} (${m.sbPaid}) / BB ${escapeHtml(String(m.bbSeat))} (${m.bbPaid}) · 設定 SB ${m.smallBlind} / BB ${m.bigBlind}`
        : "OFF";
    return `
      <div class="result-mini-card">
        <span class="rc-lbl">Ante / Blind</span>
        <span class="rc-val">Ante 各 ${m.ante} · Blind ${blind}</span>
      </div>
      <div class="result-mini-card">
        <span class="rc-lbl">Fold した席</span>
        <span class="rc-val">${escapeHtml(fd)}</span>
      </div>
      <div class="result-mini-card">
        <span class="rc-lbl">最終チップ</span>
        <span class="rc-val">${stacks}</span>
      </div>`;
  }

  function renderResultsPanel() {
    const el = document.getElementById("resultsContent");
    if (!el) return;

    if (game.phase === PHASE.SHOWDOWN) {
      el.innerHTML =
        '<p class="note">ショーダウン処理中です。伏せ公開・判定の状況は<strong>ログ</strong>タブを参照してください。</p>';
      return;
    }
    if (!game.lastResult && game.phase !== PHASE.RESULT) {
      el.innerHTML =
        '<p class="note">直近ハンドの詳細結果は、ハンド終了後にここに表示されます（一覧はメニューの<strong>履歴</strong>）。</p>';
      return;
    }
    if (game.phase !== PHASE.RESULT || !game.lastResult) {
      el.innerHTML = "";
      return;
    }

    const r = game.lastResult;
    const metaHtml = formatResultMetaHtml(r.meta);

    if (r.kind === "fold_survivor") {
      const w = r.winner;
      const awardsLine = r.awards.map((a, i) => `${seatLabel(i)} +${a}`).join(" · ");
      el.innerHTML = `
        <div class="result-cards">
          <div class="result-mini-card">
            <div class="rc-title">フォールドで決着</div>
            <span class="rc-lbl">勝者</span>
            <span class="rc-val rc-winners">${seatLabel(w)}</span>
          </div>
          <div class="result-mini-card">
            <span class="rc-lbl">ハイ勝者</span>
            <span class="rc-val">—（ショーダウンなし）</span>
          </div>
          <div class="result-mini-card">
            <span class="rc-lbl">ロー勝者</span>
            <span class="rc-val">—</span>
          </div>
          <div class="result-mini-card">
            <span class="rc-lbl">ハイ役 / ロー内容</span>
            <span class="rc-val">—</span>
          </div>
          <div class="result-mini-card">
            <span class="rc-lbl">スクープ</span>
            <span class="rc-val">—</span>
          </div>
          <div class="result-mini-card">
            <span class="rc-lbl">ポット（分配前）</span>
            <span class="rc-val">${r.potStart}</span>
          </div>
          <div class="result-mini-card">
            <span class="rc-lbl">ポット分配 / 獲得チップ</span>
            <span class="rc-val">${awardsLine}</span>
          </div>
          ${metaHtml}
        </div>`;
      return;
    }

    const hiW = r.highWinners.map((i) => seatLabel(i)).join("、");
    let hiName = "";
    let hiDetail = "";
    if (r.highWinners.length > 1) {
      hiName = "タイ（ハイ）";
      hiDetail = r.highWinners.map((i) => `${seatLabel(i)}: ${r.hiEvals[i].nameJa}`).join(" / ");
    } else {
      const w = r.highWinners[0];
      hiName = r.hiEvals[w].nameJa;
      hiDetail = r.hiEvals[w].detailJa;
    }

    let lowBlock = "";
    if (!r.lowOk) {
      const en = r.noQualLowEn || "No qualifying low hand";
      lowBlock = `<div class="result-mini-card"><span class="rc-lbl">ロー勝者 / 内容</span><span class="rc-val">${r.noQualLowText}<br/><em class="rc-en">${en}</em></span></div>`;
    } else {
      const lw = r.lowWinners.map((i) => seatLabel(i)).join("、");
      const lines = r.lowWinners.map((i) => `${seatLabel(i)}: ${r.loEvals[i].labelJa}`).join(" / ");
      lowBlock = `
        <div class="result-mini-card">
          <span class="rc-lbl">ロー勝者</span>
          <span class="rc-val rc-winners">${lw}</span>
        </div>
        <div class="result-mini-card">
          <span class="rc-lbl">ロー内容</span>
          <span class="rc-val">${lines}</span>
        </div>`;
    }

    const scoopClass = r.scoop ? " scoop-yes" : "";
    const awardsLine = r.awards.map((a, i) => `${seatLabel(i)} +${a}`).join(" · ");

    let sidePotSection = "";
    if (r.kind === "showdown" && Array.isArray(r.potDetails) && r.potDetails.length) {
      const cards = r.potDetails
        .map((pd) => {
          const dist = (pd.distribution || [])
            .map((d) => `${escapeHtml(String(d.seat))} +${d.amount}`)
            .join(" · ");
          const lowW = pd.lowOk
            ? escapeHtml(pd.lowWinners.join("、"))
            : "—（ロー不成立・ハイ側が該当分を取得）";
          const scoopTxt = pd.scoop
            ? escapeHtml(`${pd.highWinners.join("、")} がスクープ`)
            : "—";
          return `<div class="result-mini-card result-sidepot-card">
            <div class="rc-title">${escapeHtml(pd.label)} · ${pd.amount}</div>
            <span class="rc-lbl">対象（eligible）</span><span class="rc-val">${escapeHtml(pd.eligiblePlayers.join(", "))}</span>
            <span class="rc-lbl">ハイ勝者</span><span class="rc-val">${escapeHtml(pd.highWinners.join("、"))}</span>
            <span class="rc-lbl">ロー勝者</span><span class="rc-val">${lowW}</span>
            <span class="rc-lbl">このポットの分配</span><span class="rc-val">${dist || "—"}</span>
            <span class="rc-lbl">スクープ</span><span class="rc-val">${scoopTxt}</span>
          </div>`;
        })
        .join("");
      const sub = r.hasSidePots ? "（メイン＋サイド）" : "（メインのみ）";
      sidePotSection = `<div class="result-section-title">ポット内訳 ${sub}</div><div class="result-sidepot-list">${cards}</div>`;
    }

    el.innerHTML = `
      <div class="result-cards">
        ${sidePotSection}
        <div class="result-mini-card">
          <span class="rc-lbl">ハイ勝者</span>
          <span class="rc-val rc-winners">${hiW}</span>
        </div>
        <div class="result-mini-card">
          <span class="rc-lbl">ハイ役</span>
          <span class="rc-val">${hiName}</span>
        </div>
        <div class="result-mini-card">
          <span class="rc-lbl">ハイ内訳</span>
          <span class="rc-val">${hiDetail}</span>
        </div>
        ${lowBlock}
        <div class="result-mini-card${scoopClass}">
          <span class="rc-lbl">スクープ</span>
          <span class="rc-val">${r.scoop ? "あり" : "なし"}</span>
        </div>
        <div class="result-mini-card">
          <span class="rc-lbl">ポット（分配前）</span>
          <span class="rc-val">${r.potStart}</span>
        </div>
        <div class="result-mini-card">
          <span class="rc-lbl">ポット分配 / 獲得チップ</span>
          <span class="rc-val">${awardsLine}</span>
        </div>
        ${metaHtml}
      </div>`;
  }

  function renderPlayers() {
    const showdown = game.phase === PHASE.SHOWDOWN || game.phase === PHASE.RESULT;
    const nCpu = settings.cpuCount;
    const layout = CPU_LAYOUT[nCpu] || CPU_LAYOUT[1];

    const wrap = document.querySelector(".screen-game .poker-grid-wrap");
    if (wrap) wrap.setAttribute("data-cpu-count", String(nCpu));

    const playerEl = document.getElementById(SEAT_GRID_IDS.PLAYER);
    if (playerEl) {
      playerEl.innerHTML = "";
      playerEl.hidden = false;
      playerEl.appendChild(buildSeatPanel(PLAYER, showdown));
    }

    for (const key of Object.keys(SEAT_GRID_IDS)) {
      if (key === "PLAYER") continue;
      const el = document.getElementById(SEAT_GRID_IDS[key]);
      if (!el) continue;
      const seatIdx = layout[key];
      if (seatIdx === undefined) {
        el.hidden = true;
        el.innerHTML = "";
      } else {
        el.hidden = false;
        el.innerHTML = "";
        el.appendChild(buildSeatPanel(seatIdx, showdown));
      }
    }
  }

  function syncGuideToLog() {
    const ph = game.phase;
    const b = game.betting;
    let main = "";
    let extra = "";
    const autoCpu =
      game.playerFoldedThisHand &&
      game.inProgress &&
      ph !== PHASE.RESULT &&
      !(b && !b.closed && b.toAct === PLAYER && !game.folded[PLAYER]);
    if (autoCpu) extra = "自動進行中（CPUのみ）…";

    if (ph === PHASE.THIRD_STREET && game.inProgress && !BETTING_PHASES.has(ph)) {
      main = "サードストリート：各席に3枚配布済み";
    } else if (ph === PHASE.FOURTH_STREET) {
      main = "フォースストリート：公開カードが1枚追加";
    } else if (ph === PHASE.FIFTH_STREET) {
      main = "フィフスストリート：公開カードが1枚追加";
    } else if (ph === PHASE.SIXTH_STREET) {
      main = "シックスストリート：公開カードが1枚追加";
    } else if (ph === PHASE.SEVENTH_STREET) {
      main = "セブンスストリート：最後のホール配布済み";
    } else if (BETTING_PHASES.has(ph)) {
      const rnd =
        ph === PHASE.BETTING_1
          ? "1"
          : ph === PHASE.BETTING_2
            ? "2"
            : ph === PHASE.BETTING_3
              ? "3"
              : ph === PHASE.BETTING_4
                ? "4"
                : "5";
      const yourTurn = b && !b.closed && b.toAct === PLAYER && !game.folded[PLAYER];
      main = yourTurn
        ? `ベットラウンド ${rnd}：あなたの番（操作は下部）`
        : `ベットラウンド ${rnd}：${seatLabel(b.toAct)} の番`;
    } else if (ph === PHASE.SHOWDOWN) {
      main = "ショーダウン：伏せカードを公開中";
    } else if (ph === PHASE.RESULT) {
      main = "ハンド終了。「新しいハンド」またはトップへ移動できます。";
    }

    const key =
      ph +
      "|" +
      (b && !b.closed ? String(b.toAct) : "-") +
      "|" +
      (b && !b.closed ? String(b.target) : "") +
      "|" +
      autoCpu;
    if (game._lastLogGuideKey === key) return;
    game._lastLogGuideKey = key;
    if (extra) logLine(`[ガイド] ${extra}`);
    if (main) logLine(`[ガイド] ${main}`);
  }

  function renderControls() {
    const inBet = BETTING_PHASES.has(game.phase);
    const b = game.betting;
    const btnCheck = document.getElementById("btnCheck");
    const btnBet = document.getElementById("btnBet");
    const btnCall = document.getElementById("btnCall");
    const btnDouble = document.getElementById("btnDouble");
    const btnTriple = document.getElementById("btnTriple");
    const btnAllIn = document.getElementById("btnAllIn");
    const btnFoldDock = document.getElementById("btnFoldDock");
    const yourTurn =
      inBet &&
      b &&
      !b.closed &&
      !game.folded[PLAYER] &&
      !game.allIn[PLAYER] &&
      b.toAct === PLAYER;
    const bu = betUnit();
    const tc = inBet && b && !b.closed ? bettingToCall(PLAYER) : 0;

    function disableAllDock() {
      [btnCheck, btnBet, btnCall, btnDouble, btnTriple, btnAllIn].forEach((btn) => {
        if (!btn) return;
        btn.disabled = true;
        btn.classList.add("btn-action-muted");
        btn.classList.remove("is-active-turn");
      });
      if (btnFoldDock) {
        btnFoldDock.disabled = true;
        btnFoldDock.classList.remove("is-active-turn");
      }
    }

    if (!inBet) {
      disableAllDock();
      return;
    }

    if (btnCheck) {
      btnCheck.disabled = !yourTurn || !canPlayerCheck();
      btnCheck.classList.toggle("btn-action-muted", !yourTurn);
      btnCheck.classList.toggle("is-active-turn", yourTurn && !btnCheck.disabled);
    }
    if (btnBet) {
      btnBet.disabled = !yourTurn || !canPlayerBet();
      btnBet.textContent = `シングル ${bu}`;
      btnBet.classList.toggle("btn-action-muted", !yourTurn);
      btnBet.classList.toggle("is-active-turn", yourTurn && !btnBet.disabled);
    }
    if (btnCall) {
      btnCall.disabled = !yourTurn || !canPlayerCall();
      btnCall.textContent = tc > 0 ? `コール ${tc}` : "コール";
      btnCall.classList.toggle("btn-action-muted", !yourTurn);
      btnCall.classList.toggle("is-active-turn", yourTurn && !btnCall.disabled);
    }
    if (btnDouble) {
      const addD = inBet && b && !b.closed ? playerExtraForMult(2) : 0;
      btnDouble.disabled = !yourTurn || !canPlayerRaiseMult(2);
      btnDouble.textContent = addD > 0 ? `ダブル +${addD}` : "ダブル";
      btnDouble.classList.toggle("btn-action-muted", !yourTurn);
      btnDouble.classList.toggle("is-active-turn", yourTurn && !btnDouble.disabled);
    }
    if (btnTriple) {
      const addT = inBet && b && !b.closed ? playerExtraForMult(3) : 0;
      btnTriple.disabled = !yourTurn || !canPlayerRaiseMult(3);
      btnTriple.textContent = addT > 0 ? `トリプル +${addT}` : "トリプル";
      btnTriple.classList.toggle("btn-action-muted", !yourTurn);
      btnTriple.classList.toggle("is-active-turn", yourTurn && !btnTriple.disabled);
    }
    if (btnAllIn) {
      btnAllIn.disabled = !yourTurn || !canPlayerAllIn();
      btnAllIn.classList.toggle("btn-action-muted", !yourTurn);
      btnAllIn.classList.toggle("is-active-turn", yourTurn && !btnAllIn.disabled);
    }
    if (btnFoldDock) {
      btnFoldDock.disabled = !yourTurn || !canPlayerFold();
      btnFoldDock.classList.toggle("is-active-turn", yourTurn && !btnFoldDock.disabled);
    }
  }

  function buildDebugPayload() {
    const n = numPlayers();
    const alive = activeSeatIndices();
    let hiDbg = "";
    let loDbg = "";
    if (game.hands[0] && game.hands[0].length === 7) {
      for (let i = 0; i < n; i++) {
        if (game.hands[i].length === 7) {
          const h = bestHighFromSeven(game.hands[i]);
          const l = bestLowFromSeven(game.hands[i]);
          hiDbg += `${seatLabel(i)}: ${h.nameJa} / `;
          loDbg += `${seatLabel(i)}: ${l ? l.labelJa : "—"} / `;
        }
      }
    }
    return {
      phase: game.phase,
      pot: game.pot,
      betting: game.betting,
      folded: game.folded,
      stacks: game.stacks,
      hands: game.hands,
      hiDbg,
      loDbg,
      settings,
      statsKeys: STATS_KEY,
      historyLen: loadHistory().length,
    };
  }

  function renderDebug() {
    const preGame = document.getElementById("gameDebugDump");
    const p = buildDebugPayload();
    const body =
      JSON.stringify(
        {
          フェーズコード: p.phase,
          フェーズ表示: phaseLabelJa(p.phase),
          現在ポット: p.pot,
          ベット状態: p.betting,
          フォールド: p.folded,
          チップ: p.stacks,
          手札: p.hands,
          ハイ判定結果: p.hiDbg,
          ロー判定結果: p.loDbg,
          設定: p.settings,
        },
        null,
        2
      ) +
      (() => {
        const ls = {};
        [STATS_KEY, SETTINGS_KEY, HISTORY_KEY].forEach((k) => {
          ls[k] = localStorage.getItem(k);
        });
        return "\n\n--- localStorage（主要キー） ---\n" + JSON.stringify(ls, null, 2);
      })();
    const potTestLines = runSidePotTests();
    const testBlock =
      "\n\n--- Side pot 構造テスト（buildSidePotsFromTotals） ---\n" +
      potTestLines.map((t) => `${t.ok ? "OK" : "NG"}  ${t.name}${t.detail ? " | " + t.detail : ""}`).join("\n");
    const full = body + testBlock;
    if (preGame) preGame.textContent = full;
  }

  function setGameTab(name) {
    const allowed = { play: true, log: true, results: true, debug: true };
    if (!allowed[name]) return;
    game.gameTab = name;
    document.querySelectorAll(".game-tab").forEach((btn) => {
      const on = btn.getAttribute("data-game-tab") === name;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".game-tab-panel").forEach((panel) => {
      const on = panel.getAttribute("data-panel") === name;
      panel.hidden = !on;
      panel.classList.toggle("is-active", on);
    });
    if (name === "log") flushMessageLog();
    if (name === "debug") renderDebug();
  }

  function renderAll() {
    settings = loadSettings();
    syncStacksFromStats();
    maybeAdvanceBetting();
    renderTopChips();
    renderGameHudBar();
    if (currentView !== "game") {
      game.debugEvalCache = buildDebugPayload();
      return;
    }
    const pg = document.querySelector(".screen-game .poker-grid-wrap");
    if (pg) pg.classList.toggle("layout-dense", settings.cpuCount >= 4);
    renderStatus();
    renderPlayers();
    renderResultsPanel();
    renderHandRankPanel();
    renderDockMiniLog();
    renderSupportAi();
    syncGuideToLog();
    renderControls();
    renderDebug();
    setGameTab(game.gameTab || "play");
    game.debugEvalCache = buildDebugPayload();
  }

  function newGameCore() {
    settings = loadSettings();
    syncStacksFromStats();
    topUpCpuStacksForNewHandIfNeeded();
    game.handStartStacks = game.stacks.slice(0, numPlayers());
    if (!minStacksForNewHand()) {
      alert(
        "チップが不足しています。トップ・対戦設定・戦績の「チップ補充（〜1000）」で仮想チップを補い、再度お試しください。\n（あなたの席がアンティ・ブラインドを支払える必要があります）"
      );
      return false;
    }
    game.cpuChainGen++;
    game.autoProgressGen++;
    game.lastResult = null;
    game.betting = null;
    game.messages = [];
    game.folded = [];
    game.playerFoldedThisHand = false;
    game.inProgress = true;
    game.dealPulse = null;
    game.showdownRevealT = 0;
    game.pot = 0;
    game.deck = [];
    game.hands = [];
    game.totalCommitted = Array(numPlayers()).fill(0);
    game.allIn = Array(numPlayers()).fill(false);
    game.seatLastPayLine = Array(numPlayers()).fill("");
    game.dockMiniLog = [];
    game._didAutoResultTab = false;
    game._lastLogGuideKey = "";
    setGameTab("play");

    const ante = anteAmt();
    logLine("--- 新ハンド開始 ---");
    for (let i = 0; i < numPlayers(); i++) {
      pay(i, ante, "アンティ");
    }
    logLine(`アンティ：全席が ${ante} を支払い（ポット計 ${game.pot}）。`);

    postBlindsForHand();
    clampStacks();

    game.hands = Array(numPlayers())
      .fill(null)
      .map(() => []);
    game.deck = shuffleInPlace(makeDeck());
    dealThirdStreet();
    logLine("サードストリート：各プレイヤーに3枚配布しました。");
    setDealPulseThird();
    game.phase = PHASE.THIRD_STREET;
    clampStacks();
    renderAll();
    scheduleThirdToBetting1();
    return true;
  }

  function tryStartFromPreGame() {
    readSettingsForm();
    settings = loadSettings();
    syncStacksFromStats();
    topUpCpuStacksForNewHandIfNeeded();
    if (!minStacksForNewHand()) {
      alert(
        "チップが不足しています。トップ・対戦設定・戦績の「チップ補充（〜1000）」で仮想チップを補ってください。\n（CPU席は不足時に初期チップへ戻す場合があります）"
      );
      return;
    }
    showView("game");
    if (!newGameCore()) showView("preGame");
  }

  function readSettingsForm() {
    settings.cpuCount = Math.min(MAX_CPU, Math.max(1, Number(document.getElementById("setCpuCount").value) || 1));
    settings.startChips = Number(document.getElementById("setStartChips").value);
    settings.ante = Number(document.getElementById("setAnte").value);
    settings.betUnit = Number(document.getElementById("setBet").value);
    settings.difficulty = document.getElementById("setDifficulty").value;
    settings.playSpeed = document.getElementById("setSpeed").value;
    const sa = document.getElementById("setAnimations");
    const ss = document.getElementById("setSound");
    const sf = document.getElementById("setFoldConfirm");
    const sbon = document.getElementById("setBlindsOn");
    const ssb = document.getElementById("setSmallBlind");
    const sbb = document.getElementById("setBigBlind");
    if (sa) settings.animations = sa.value === "1";
    if (ss) settings.sound = ss.value === "1";
    if (sf) settings.foldConfirm = sf.value === "1";
    if (sbon) settings.blindsOn = sbon.value === "1";
    const d0 = defaultSettings();
    const sbRaw = ssb ? Number(ssb.value) : settings.smallBlind;
    const bbRaw = sbb ? Number(sbb.value) : settings.bigBlind;
    const norm = normalizeBlinds(sbRaw, bbRaw, d0);
    settings.smallBlind = norm.smallBlind;
    settings.bigBlind = norm.bigBlind;
    saveSettings(settings);
  }

  function fillSettingsForm() {
    const c = document.getElementById("setCpuCount");
    if (!c) return;
    document.getElementById("setCpuCount").value = String(settings.cpuCount);
    document.getElementById("setStartChips").value = String(settings.startChips);
    document.getElementById("setAnte").value = String(settings.ante);
    document.getElementById("setBet").value = String(settings.betUnit);
    document.getElementById("setDifficulty").value = settings.difficulty;
    document.getElementById("setSpeed").value = settings.playSpeed;
    const sa = document.getElementById("setAnimations");
    const ss = document.getElementById("setSound");
    const sf = document.getElementById("setFoldConfirm");
    if (sa) sa.value = settings.animations ? "1" : "0";
    if (ss) ss.value = settings.sound ? "1" : "0";
    if (sf) sf.value = settings.foldConfirm ? "1" : "0";
    const sbon = document.getElementById("setBlindsOn");
    const ssb = document.getElementById("setSmallBlind");
    const sbb = document.getElementById("setBigBlind");
    if (sbon) sbon.value = settings.blindsOn ? "1" : "0";
    if (ssb) ssb.value = String(settings.smallBlind);
    if (sbb) sbb.value = String(settings.bigBlind);
  }

  function forceShowdownDebug() {
    game.cpuChainGen++;
    const n = numPlayers();
    for (let s = 0; s < n; s++) {
      if (game.folded[s]) continue;
      while (game.hands[s].length < 7 && game.deck.length) {
        const need = game.hands[s].length;
        if (need < 2) {
          game.hands[s].push(game.deck.pop());
        } else if (need >= 2 && need <= 5) {
          game.hands[s].push(game.deck.pop());
        } else {
          game.hands[s].push(game.deck.pop());
        }
      }
    }
    game.betting = null;
    game.phase = PHASE.SHOWDOWN;
    logLine("[デバッグ] 強制ショーダウン（各席のカードを7枚に補完しました）");
    renderAll();
  }

  function wire() {
    function bindClick(id, handler) {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", handler);
    }

    bindClick("menuStartGame", () => {
      playSound("button");
      showView("preGame");
    });
    bindClick("menuRules", () => {
      playSound("button");
      navReturn.rules = "top";
      showView("rules");
    });
    bindClick("menuStats", () => {
      playSound("button");
      showView("stats");
    });
    bindClick("menuHistory", () => {
      playSound("button");
      showView("history");
    });
    bindClick("menuResetSettings", () => {
      playSound("button");
      openConfirmModal("すべての設定を初期値に戻しますか？", "リセットする", () => {
        settings = defaultSettings();
        saveSettings(settings);
        fillSettingsForm();
        renderTopChips();
      });
    });
    bindClick("btnChipRefillTop", () => {
      playSound("button");
      tryRefillVirtualChips();
    });
    bindClick("btnChipRefillPre", () => {
      playSound("button");
      tryRefillVirtualChips();
    });
    bindClick("btnChipRefillStats", () => {
      playSound("button");
      tryRefillVirtualChips();
    });

    bindClick("preGameBack", () => showView("top"));
    bindClick("btnStartWithSettings", () => {
      playSound("button");
      tryStartFromPreGame();
    });

    bindClick("rulesBack", () => showView(navReturn.rules));
    bindClick("statsBack", () => showView("top"));
    bindClick("historyBack", () => showView("top"));
    bindClick("gameBtnHome", () => {
      playSound("button");
      const go = () => showView("top");
      if (needsNewGameConfirm()) {
        openConfirmModal("現在のハンドを終了してトップ画面に戻りますか？", "トップへ", go);
        return;
      }
      go();
    });
    bindClick("gameBtnNewHand", () => {
      playSound("button");
      const run = () => newGameCore();
      if (needsNewGameConfirm()) {
        openConfirmModal("現在のハンドを終了して新しいハンドを開始しますか？", "新しく開始", run);
        return;
      }
      run();
    });
    bindClick("gameBtnRules", () => {
      playSound("button");
      navReturn.rules = "game";
      showView("rules");
    });
    bindClick("gameBtnDebugTab", () => {
      playSound("button");
      setGameTab("debug");
    });

    [
      "setCpuCount",
      "setStartChips",
      "setAnte",
      "setBet",
      "setBlindsOn",
      "setSmallBlind",
      "setBigBlind",
      "setDifficulty",
      "setSpeed",
      "setAnimations",
      "setSound",
      "setFoldConfirm",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", () => {
          readSettingsForm();
        });
      }
    });

    bindClick("btnCheck", () => {
      applyPlayerAction("check");
      clampStacks();
      renderAll();
    });
    bindClick("btnBet", () => {
      applyPlayerAction("bet");
      clampStacks();
      renderAll();
    });
    bindClick("btnCall", () => {
      applyPlayerAction("call");
      clampStacks();
      renderAll();
    });
    bindClick("btnDouble", () => {
      applyPlayerAction("double");
      clampStacks();
      renderAll();
    });
    bindClick("btnTriple", () => {
      applyPlayerAction("triple");
      clampStacks();
      renderAll();
    });
    bindClick("btnAllIn", () => {
      if (!canPlayerAllIn()) return;
      openConfirmModal("残りチップをすべて投入しますか？", "オールインする", () => {
        applyPlayerAction("allin");
        clampStacks();
        renderAll();
      });
    });

    document.querySelectorAll("[data-game-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-game-tab");
        if (t) setGameTab(t);
      });
    });

    bindClick("btnFoldDock", () => {
      if (!canPlayerFold()) return;
      settings = loadSettings();
      const run = () => {
        applyPlayerAction("fold");
        clampStacks();
        renderAll();
      };
      if (settings.foldConfirm) {
        openConfirmModal("このハンドをフォールドしますか？", "フォールドする", run);
        return;
      }
      run();
    });

    function applyStatsReset(clrHist) {
      settings = loadSettings();
      const sc = settings.startChips;
      game.stats = {
        ...defaultStats(),
        playerChips: sc,
        cpuStacks: Array(MAX_CPU).fill(sc),
        maxChipsReached: sc,
        minChipsReached: sc,
      };
      if (clrHist) saveHistory([]);
      saveStats(game.stats);
      syncStacksFromStats();
      game.phase = PHASE.ANTE;
      game.hands = [];
      game.pot = 0;
      game.lastResult = null;
      game.messages = [];
      game.gameTab = "play";
      game._didAutoResultTab = false;
      game._lastLogGuideKey = "";
      logLine("戦績をリセットしました。");
      renderAll();
    }

    bindClick("resetStatsBtn", () => {
      openConfirmModal("戦績をリセットしますか？", "リセットする", () => {
        const clrHist = confirm(
          "直近10ハンド分の履歴もまとめて削除しますか？\n\n「OK」… 履歴も削除\n「キャンセル」… 戦績だけリセットし履歴は残す"
        );
        applyStatsReset(clrHist);
        if (currentView === "stats") renderStats();
      });
    });

    bindClick("resetHistoryBtn", () => {
      openConfirmModal("直近の履歴（最大10件）を削除しますか？", "削除する", () => {
        saveHistory([]);
        renderHistory();
        renderAll();
      });
    });

    function bindDebugActions(suffix) {
      const forceBtn = document.getElementById(suffix ? "gameDebugForceSd" : "debugForceSd");
      if (forceBtn) forceBtn.addEventListener("click", forceShowdownDebug);

      const rs = document.getElementById(suffix ? "gameDebugResetStats" : "debugResetStats");
      if (rs)
        rs.addEventListener("click", () => {
          if (!confirm("戦績をリセットします（デバッグ）。よろしいですか？")) return;
          settings = loadSettings();
          const sc = settings.startChips;
          game.stats = {
            ...defaultStats(),
            playerChips: sc,
            cpuStacks: Array(MAX_CPU).fill(sc),
            maxChipsReached: sc,
            minChipsReached: sc,
          };
          saveStats(game.stats);
          syncStacksFromStats();
          renderAll();
        });

      const rst = document.getElementById(suffix ? "gameDebugResetSettings" : "debugResetSettings");
      if (rst)
        rst.addEventListener("click", () => {
          if (!confirm("設定を初期値に戻しますか？")) return;
          settings = defaultSettings();
          saveSettings(settings);
          fillSettingsForm();
          renderAll();
        });

      const cls = document.getElementById(suffix ? "gameDebugClearLs" : "debugClearLs");
      if (cls)
        cls.addEventListener("click", () => {
          if (
            !confirm(
              "ブラウザに保存したすべてのデータ（戦績・設定・履歴など）を削除します。\nこの操作は取り消せません。よろしいですか？"
            )
          )
            return;
          localStorage.clear();
          location.reload();
        });
    }
    bindDebugActions(true);

    if (
      "serviceWorker" in navigator &&
      (location.protocol === "http:" || location.protocol === "https:")
    ) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }
  }

  wire();
  settings = loadSettings();
  game.stats = loadStats();
  syncStacksFromStats();
  game.phase = PHASE.ANTE;
  showView("top");
})();

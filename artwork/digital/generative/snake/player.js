import { createActivityLoop } from '../activity.js';

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const stepSeconds = .085;
const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
let columns, rows, route, positions, body, food;
let elapsed = 0;
let journeyTime = 0;
let detourTried = false;
let detours = 0;
let ink = '#1a1a1a';
let dirty = true;
let full = false;
let turnHistory = "";
let phrases = new Map();
let noveltyChoices = 0;
let birthVotes = [];
let voteCounts = [0, 0, 0, 0];

function turnFor(index) {
  const head = route[body[0]], behind = route[body[1]], next = route[index];
  const ax = head % columns - behind % columns;
  const ay = Math.floor(head / columns) - Math.floor(behind / columns);
  const bx = next % columns - head % columns;
  const by = Math.floor(next / columns) - Math.floor(head / columns);
  const cross = ax * by - ay * bx;
  return cross === 0 ? 'S' : cross > 0 ? 'R' : 'L';
}

function repetitionCost(turn) {
  const sequence = turnHistory + turn;
  let cost = 0;
  for (let size = 2; size <= Math.min(7, sequence.length); size++) {
    cost += (phrases.get(sequence.slice(-size)) || 0) * 2 ** size;
  }
  return cost;
}

function rememberTurn(turn) {
  const sequence = turnHistory + turn;
  for (let size = 2; size <= Math.min(7, sequence.length); size++) {
    const phrase = sequence.slice(-size);
    phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
  }
  turnHistory = sequence.slice(-6);
}

function distance(from, to) {
  return (to - from + route.length) % route.length;
}

function placeFood() {
  detourTried = false;
  // Food is an absolute board cell, chosen once and kept until contact.
  const occupied = new Set(body.map(index => route[index]));
  const empty = [];
  for (let cell = 0; cell < route.length; cell++) {
    if (!occupied.has(cell)) empty.push(cell);
  }
  food = empty.length ? empty[Math.floor(Math.random() * empty.length)] : null;
}

function reset(nextColumns, nextRows) {
  columns = nextColumns;
  rows = nextRows;
  // Join small loops along a random spanning tree. The resulting single cycle
  // visits every square, but winds through irregular pockets instead of rows.
  const links = Array.from({ length: columns * rows }, () => new Set());
  const connect = (a, b) => { links[a].add(b); links[b].add(a); };
  const disconnect = (a, b) => { links[a].delete(b); links[b].delete(a); };
  const width = columns / 2, height = rows / 2;
  const parents = Array.from({ length: width * height }, (_, i) => i);
  const root = i => {
    while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; }
    return i;
  };
  const edges = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = y * 2 * columns + x * 2;
      connect(a, a + 1); connect(a + 1, a + columns + 1);
      connect(a + columns + 1, a + columns); connect(a + columns, a);
      const tile = y * width + x;
      if (x + 1 < width) edges.push([tile, tile + 1, a + 1, a + columns + 1, a + 2, a + columns + 2]);
      if (y + 1 < height) edges.push([tile, tile + width, a + columns, a + columns + 1, a + 2 * columns, a + 2 * columns + 1]);
    }
  }
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }
  for (const [from, to, a, b, c, d] of edges) {
    const first = root(from), second = root(to);
    if (first === second) continue;
    parents[first] = second;
    disconnect(a, b); disconnect(c, d);
    connect(a, c); connect(b, d);
  }
  route = [];
  let previous = -1, cell = 0;
  do {
    route.push(cell);
    const next = [...links[cell]].find(neighbour => neighbour !== previous);
    previous = cell; cell = next;
  } while (cell !== 0);
  if (Math.random() < .5) route.reverse();
  positions = [];
  route.forEach((cell, index) => { positions[cell] = index; });
  const head = Math.floor(Math.random() * route.length);
  body = Array.from({ length: 4 }, (_, i) => (head - i + route.length) % route.length);
  birthVotes = body.map((index,i) => {
    const a=route[index], b=route[body[i+1] ?? (index-1+route.length)%route.length];
    return directions.findIndex(([dx,dy])=>dx===a%columns-b%columns && dy===Math.floor(a/columns)-Math.floor(b/columns));
  });
  voteCounts = [0,0,0,0];
  birthVotes.forEach(vote => voteCounts[vote]++);
  full = false;
  turnHistory = ""; phrases = new Map(); noveltyChoices = 0;
  elapsed = 0; journeyTime = 0; detours = 0;
  dirty = true;
  placeFood();
}

function update(dt) {
  if (full) return;
  journeyTime += dt;
  elapsed += dt;
  if (elapsed < stepSeconds) return;
  elapsed -= stepSeconds;
  const head = body[0];
  let next = (head + 1) % route.length;
  const cell = route[head], x = cell % columns, y = Math.floor(cell / columns);
  const room = distance(head, body.at(-1));
  // Prefer the least repeated phrase of 2–7 relative turns among safe moves.
  // Safety wins when repetition is unavoidable; food never moves or gets skipped.
  if (food !== null && room > 2) {
    const previousCell = route[body[1]];
    const headingX = x - previousCell % columns;
    const headingY = y - Math.floor(previousCell / columns);
    const choices = directions.flatMap(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= columns || ny < 0 || ny >= rows) return [];
      const index = positions[ny * columns + nx];
      const advance = distance(head, index);
      if (advance < 1 || advance > distance(head, positions[food]) || advance >= room) return [];
      const turn = dx !== headingX || dy !== headingY;
      const vote = directions.findIndex(([vx,vy]) => vx===dx && vy===dy);
      const support = .65 + 2 * voteCounts[vote] / body.length;
      return [{ index, advance, cost: repetitionCost(turnFor(index)), weight: support * (turn ? 2.4 : 1) * (advance > 1 ? 1.5 : 1) }];
    });
    // Over four minutes of visible movement, increasingly decline shortcuts.
    // Taking the next cycle square preserves a longer, safe route to fixed food.
    const patience = Math.min(1, journeyTime / 240);
    const scenic = choices.length > 1 && Math.random() < patience * .92;
    const shortestAdvance = Math.min(...choices.map(choice => choice.advance));
    const candidates = scenic ? choices.filter(choice => choice.advance === shortestAdvance) : choices;
    const lowest = Math.min(...candidates.map(choice => choice.cost));
    const fresh = candidates.filter(choice => choice.cost === lowest);
    if (fresh.length < choices.length) noveltyChoices++;
    let pick = Math.random() * fresh.reduce((sum, choice) => sum + choice.weight, 0);
    for (const choice of fresh) {
      pick -= choice.weight;
      if (pick <= 0) { next = choice.index; break; }
    }
    // Once per meal, occasionally pass up reachable food for a safe side road.
    // All alternatives still precede the food on the cycle: return is guaranteed.
    const besideFood = Math.abs(x - food % columns) + Math.abs(y - Math.floor(food / columns)) === 1;
    if (besideFood && !detourTried) {
      detourTried = true;
      const sideRoads = choices.filter(choice => route[choice.index] !== food);
      if (sideRoads.length && Math.random() < .22) {
        next = sideRoads.reduce((a,b) => a.advance < b.advance ? a : b).index;
        detours++;
      }
    }
  }
  rememberTurn(turnFor(next));
  body.unshift(next);
  if (route[next] === food) {
    const vote = directions.findIndex(([dx,dy]) => dx===route[next]%columns-x && dy===Math.floor(route[next]/columns)-y);
    birthVotes.unshift(vote);
    voteCounts[vote]++;
    if (body.length === route.length) {
      food = null;
      full = true;
      canvas.setAttribute('aria-label', 'The snake has filled every square in the frame.');
    } else placeFood();
  } else {
    body.pop();
    if (food === null) placeFood();
  }
  dirty = true;
}

function draw() {
  if (!dirty) return;
  dirty = false;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const cellSize = Math.min(canvas.width / columns, canvas.height / rows);
  const left = (canvas.width - columns * cellSize) / 2;
  const top = (canvas.height - rows * cellSize) / 2;
  const gap = Math.max(1, Math.round(cellSize * .045));
  context.fillStyle = ink;
  function square(index, scale) {
    const cell = route[index];
    const size = cellSize * scale - gap;
    const inset = (cellSize - size) / 2;
    context.fillRect(left + (cell % columns) * cellSize + inset,
      top + Math.floor(cell / columns) * cellSize + inset, size, size);
  }
  for (const index of body) square(index, 1);
  if (food !== null) square(positions[food], .45);
  if (full) activity.setLost(true);
}

function resize() {
  const portrait = canvas.clientHeight > canvas.clientWidth;
  const nextColumns = portrait ? 16 : 24;
  const nextRows = portrait ? 20 : 12;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  if (columns !== nextColumns || rows !== nextRows) {
    reset(nextColumns, nextRows);
    activity.setLost(false);
  }
  dirty = true;
  draw();
}
const activity = createActivityLoop({ fps: 30, update, draw });
new ResizeObserver(resize).observe(canvas);
resize();

window.livingArtwork = {
  backend: 'canvas-snake',
  snapshot: () => ({ columns, rows, route: [...route], body: [...body], food, elapsed, journeyTime, detourTried, detours, full, turnHistory, phrases: [...phrases], noveltyChoices, birthVotes: [...birthVotes], voteCounts: [...voteCounts] }),
  restore(state) {
    ({ columns, rows, route, body, food, elapsed, full } = state);
    journeyTime = state.journeyTime || 0;
    detourTried = !!state.detourTried; detours = state.detours || 0;
    turnHistory = state.turnHistory || "";
    phrases = new Map(state.phrases || []);
    noveltyChoices = state.noveltyChoices || 0;
    birthVotes = state.birthVotes ? [...state.birthVotes] : body.map((_,i)=>i%4);
    voteCounts = [0,0,0,0]; birthVotes.forEach(vote=>voteCounts[vote]++);
    positions = [];
    route.forEach((cell, index) => { positions[cell] = index; });
    activity.setLost(full);
    dirty = true;
    draw();
  },
  stats: () => ({ filled: body.length, capacity: route.length, full, active: activity.running, patience: Math.min(1, journeyTime / 240), detours, rememberedPhrases: phrases.size, noveltyChoices, votes: [...voteCounts] }),
};
addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.type !== 'living-theme') return;
  const colour = event.data.ink;
  if (typeof colour !== 'string' || colour === ink || !CSS.supports('color', colour)) return;
  ink = colour;
  dirty = true;
  draw();
});
if (parent !== window) parent.postMessage({ type: 'living-ready' }, location.origin);

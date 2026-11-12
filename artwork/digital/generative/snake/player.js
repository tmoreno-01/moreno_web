import { createActivityLoop } from '../activity.js';

const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');
const stepSeconds = .085;
const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
let columns, rows, route, positions, body, food;
let elapsed = 0;
let ink = '#1a1a1a';
let dirty = true;
let full = false;

function distance(from, to) {
  return (to - from + route.length) % route.length;
}

function placeFood() {
  const room = distance(body[0], body.at(-1)) - 1;
  if (room < 1) {
    food = null;
    return;
  }
  const reach = Math.min(room, body.length > route.length * .65 ? 3 : 7);
  food = (body[0] + 1 + Math.floor(Math.random() * reach)) % route.length;
}

function reset(nextColumns, nextRows) {
  columns = nextColumns;
  rows = nextRows;
  route = [0];
  for (let y = 0; y < rows; y++) {
    for (let x = 1; x < columns; x++) {
      route.push(y * columns + (y % 2 ? columns - x : x));
    }
  }
  for (let y = rows - 1; y > 0; y--) route.push(y * columns);
  if (Math.random() < .5) route.reverse();
  positions = [];
  route.forEach((cell, index) => { positions[cell] = index; });
  const head = Math.floor(Math.random() * route.length);
  body = Array.from({ length: 4 }, (_, i) => (head - i + route.length) % route.length);
  full = false;
  elapsed = 0;
  dirty = true;
  placeFood();
}

function update(dt) {
  if (full) return;
  elapsed += dt;
  if (elapsed < stepSeconds) return;
  elapsed -= stepSeconds;
  const head = body[0];
  let next = (head + 1) % route.length;
  const cell = route[head], x = cell % columns, y = Math.floor(cell / columns);
  const room = distance(head, body.at(-1));
  // Shortcuts go forward through free space, so the growing snake never traps itself.
  if (food !== null && room > 30 && Math.random() < .65) {
    const jumps = directions.flatMap(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= columns || ny < 0 || ny >= rows) return [];
      const index = positions[ny * columns + nx];
      const advance = distance(head, index);
      return advance > 1 && advance <= distance(head, food) && advance < room ? [index] : [];
    });
    next = jumps[Math.floor(Math.random() * jumps.length)] ?? next;
  }
  body.unshift(next);
  if (next === food) {
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
  if (food !== null) square(food, .45);
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
  snapshot: () => ({ columns, rows, route: [...route], body: [...body], food, elapsed, full }),
  restore(state) {
    ({ columns, rows, route, body, food, elapsed, full } = state);
    positions = [];
    route.forEach((cell, index) => { positions[cell] = index; });
    activity.setLost(full);
    dirty = true;
    draw();
  },
  stats: () => ({ filled: body.length, capacity: route.length, full, active: activity.running }),
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

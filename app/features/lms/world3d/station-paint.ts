// What the classroom's stations show instead of a blank screen: the lab bench's screen carries the real lab, the quiz
// board a card with the quiz's title, time and deadline and its target, and the task book is open on the assignment
// and its five posts. They are painted on a canvas (like the blackboard's page, classroom.tsx) from the same data the
// rest of the page already has. The quiz's questions are deliberately not on its board: they belong to the attempt.

export const FACE_HEIGHT = 768;

export type Due = { tone: "late" | "soon" | "later"; text: string };

export type QuizFace = {
  title: string;
  minutes: number | null;
  due: Due | null;
  state: "new" | "running" | "done";
  score: string | null;
};

export type BookFace = {
  title: string;
  due: Due | null;
  state: "new" | "working" | "done";
  posts: Array<{ name: string; status: "done" | "current" | "locked" }>;
  /** How many other books are on the desk. */
  more: number;
};

export type LabFace = {
  title: string;
  subject: string;
  solved: number;
  total: number;
  /** The real lab's figure, drawn onto a canvas (lab-picture.tsx), once it has been taken. */
  picture: HTMLCanvasElement | null;
};

const FONT = '"Poppins", "Geist Variable", system-ui, sans-serif';
const INK = "#1b1a2e";
const SOFT = "#3a3850";
const MUTED = "#6a6880";
const TONE: Record<Due["tone"], string> = { late: "#c8344f", soon: "#b86a00", later: "#4a4960" };

/** A canvas this tall and as wide as the surface it goes on. */
export function sizeFace(canvas: HTMLCanvasElement, aspect: number) {
  canvas.height = FACE_HEIGHT;
  canvas.width = Math.round(FACE_HEIGHT * Math.min(1.6, Math.max(0.45, aspect)));
}

// ---- small pieces -------------------------------------------------------------------------------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Lines of text no wider than `max`, at most `limit` of them, the last one ended with an ellipsis if the text goes on. */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, max: number, limit: number) {
  const lines: string[] = [];
  let line = "";
  const words = text.split(/\s+/).filter(Boolean);
  for (let index = 0; index < words.length; index++) {
    const word = words[index]!;
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= max || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === limit - 1) {
      line = words.slice(index).join(" ");
      break;
    }
  }
  if (line) lines.push(line);
  const last = lines.length - 1;
  if (last >= 0 && (ctx.measureText(lines[last]!).width > max || (lines.length === limit && words.join(" ") !== lines.join(" ")))) {
    // end the last line with an ellipsis: drop whole words first, letters only if one word alone is too wide
    let cut = lines[last]!;
    while (ctx.measureText(`${cut}…`).width > max) {
      const space = cut.lastIndexOf(" ");
      if (space > 0) cut = cut.slice(0, space);
      else if (cut.length > 1) cut = cut.slice(0, -1);
      else break;
    }
    lines[last] = `${cut.trimEnd()}…`;
  }
  return lines;
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, weight: number, color: string, align: CanvasTextAlign = "left") {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(value, x, y);
}

/** One line of text no wider than `max`: a little smaller if it must be (down to 70%), an ellipsis if even that is too wide. */
function fitted(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, weight: number, color: string, max: number, align: CanvasTextAlign = "left") {
  let fontSize = size;
  ctx.font = `${weight} ${fontSize}px ${FONT}`;
  while (ctx.measureText(value).width > max && fontSize > size * 0.7) {
    fontSize -= size * 0.05;
    ctx.font = `${weight} ${fontSize}px ${FONT}`;
  }
  const line = wrapLines(ctx, value, max, 1)[0] ?? value;
  text(ctx, line, x, y, fontSize, weight, color, align);
}

/** A rounded label with text in it; returns its width. */
function chip(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, size: number, background: string, color: string, weight = 700, spacing = 0) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
  const width = ctx.measureText(label).width + size * 1.1;
  const height = size * 1.75;
  ctx.fillStyle = background;
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  text(ctx, label, x + width / 2, y + height / 2 + size * 0.36, size, weight, color, "center");
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  return width;
}

function check(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy);
  ctx.lineTo(cx - r * 0.12, cy + r * 0.4);
  ctx.lineTo(cx + r * 0.52, cy - r * 0.38);
  ctx.stroke();
}

function clockIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.moveTo(cx, cy - r * 0.55);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx + r * 0.42, cy + r * 0.2);
  ctx.stroke();
}

function calendarIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = "round";
  roundRect(ctx, cx - r, cy - r * 0.85, r * 2, r * 1.85, r * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r * 0.25);
  ctx.lineTo(cx + r, cy - r * 0.25);
  ctx.moveTo(cx - r * 0.45, cy - r * 1.1);
  ctx.lineTo(cx - r * 0.45, cy - r * 0.6);
  ctx.moveTo(cx + r * 0.45, cy - r * 1.1);
  ctx.lineTo(cx + r * 0.45, cy - r * 0.6);
  ctx.stroke();
}

/** A tiny conical flask, for a lab with no picture yet. */
function flaskIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = `${color}22`;
  ctx.lineWidth = size * 0.07;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.14, cy - size * 0.5);
  ctx.lineTo(cx - size * 0.14, cy - size * 0.1);
  ctx.lineTo(cx - size * 0.46, cy + size * 0.42);
  ctx.quadraticCurveTo(cx - size * 0.52, cy + size * 0.52, cx - size * 0.4, cy + size * 0.52);
  ctx.lineTo(cx + size * 0.4, cy + size * 0.52);
  ctx.quadraticCurveTo(cx + size * 0.52, cy + size * 0.52, cx + size * 0.46, cy + size * 0.42);
  ctx.lineTo(cx + size * 0.14, cy - size * 0.1);
  ctx.lineTo(cx + size * 0.14, cy - size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.2, cy - size * 0.5);
  ctx.lineTo(cx + size * 0.2, cy - size * 0.5);
  ctx.stroke();
}

/** The rows under a title: minutes, deadline. */
function metaRow(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, icon: "clock" | "calendar", label: string, color: string, max: number) {
  const r = 17 * u;
  (icon === "clock" ? clockIcon : calendarIcon)(ctx, x + r, y - 13 * u, r, color);
  fitted(ctx, label, x + r * 2 + 18 * u, y, 38 * u, 600, color, max - r * 2 - 18 * u);
}

// ---- the quiz board -----------------------------------------------------------------------------

function target(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.shadowColor = "rgba(60,40,120,.28)";
  ctx.shadowBlur = r * 0.18;
  ctx.shadowOffsetY = r * 0.08;
  const rings: Array<[number, string]> = [[1, "#5e4ac4"], [0.8, "#ffffff"], [0.62, "#a594f5"], [0.44, "#ffffff"], [0.26, "#ff6b8a"], [0.1, "#ffffff"]];
  rings.forEach(([share, color], index) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r * share, 0, Math.PI * 2);
    ctx.fill();
    if (index === 0) ctx.shadowColor = "transparent";
  });
  ctx.restore();
  // an arrow in the ring beside the bullseye
  ctx.save();
  ctx.translate(cx + r * 0.2, cy - r * 0.18);
  ctx.rotate(-0.62);
  ctx.strokeStyle = "#3a2f7a";
  ctx.lineWidth = r * 0.06;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(r * 0.95, 0);
  ctx.stroke();
  ctx.fillStyle = "#ff6b8a";
  for (const dy of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.95, 0);
    ctx.lineTo(r * 1.18, dy * r * 0.13);
    ctx.lineTo(r * 1.06, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const score = (value: string) => {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 10) / 10).replace(".", ",") : value;
};

export function paintQuiz(canvas: HTMLCanvasElement, face: QuizFace) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const u = H / 768;
  const m = 56 * u;
  const wide = W / H >= 1.05;
  ctx.fillStyle = "#fffaf0";
  ctx.fillRect(0, 0, W, H);
  // the target takes the right of a wide board, and the lower right of a narrow one
  const size = 30 * u;
  const chipTop = H - m - size * 1.75;
  // a wide board has its target at the right, beside the writing; a narrow one fits it in what the writing leaves
  const bigRadius = Math.min(W * 0.21, H * 0.3);
  const column = wide ? W - m - 2 * bigRadius - 10 * u - m * 1.9 - m : W - 2 * m;

  chip(ctx, m, m, "KUIS", 26 * u, "#5e4ac4", "#ffffff", 700, 2 * u);
  ctx.font = `700 ${66 * u}px ${FONT}`;
  const lines = wrapLines(ctx, face.title, column, 3);
  let y = m + 46 * u + 78 * u;
  for (const line of lines) {
    text(ctx, line, m, y, 66 * u, 700, INK);
    y += 80 * u;
  }
  y += 14 * u;
  if (face.minutes) {
    metaRow(ctx, m, y, u, "clock", `${face.minutes} menit`, SOFT, column);
    y += 58 * u;
  }
  if (face.due) metaRow(ctx, m, y, u, "calendar", face.due.text, TONE[face.due.tone], column);

  if (wide) target(ctx, W - m - bigRadius - 10 * u, H * 0.46, bigRadius);
  else {
    const free = chipTop - 22 * u - (y + 26 * u);
    const radius = Math.min(W * 0.28, free / 2);
    if (radius > 44 * u) target(ctx, W - m - radius, y + 26 * u + free / 2, radius);
  }

  const base = chipTop;
  if (face.state === "done") {
    const width = chip(ctx, m, base, face.score ? `Nilai ${score(face.score)}` : "Sudah dikerjakan", size, "#dff6ec", "#1f7a57", 700);
    check(ctx, m + width + 26 * u, base + size * 0.9, 20 * u, "#1f7a57", 6 * u);
  } else if (face.state === "running") chip(ctx, m, base, "Sedang dikerjakan", size, "#fff0d1", "#9a5b00");
  else chip(ctx, m, base, "Belum dikerjakan", size, "#efebfb", "#5e4ac4");
}

// ---- the task book ------------------------------------------------------------------------------

export function paintBook(canvas: HTMLCanvasElement, face: BookFace) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const u = H / 768;
  const m = 52 * u;
  const spine = W / 2;
  ctx.fillStyle = "#fbf6ea";
  ctx.fillRect(0, 0, W, H);
  // the fold: the pages darken toward the spine
  const fold = ctx.createLinearGradient(spine - 70 * u, 0, spine + 70 * u, 0);
  fold.addColorStop(0, "rgba(120,86,50,0)");
  fold.addColorStop(0.5, "rgba(120,86,50,.2)");
  fold.addColorStop(1, "rgba(120,86,50,0)");
  ctx.fillStyle = fold;
  ctx.fillRect(spine - 70 * u, 0, 140 * u, H);
  // left page: what the assignment is
  const page = spine - m * 1.7;
  chip(ctx, m, m, "TUGAS", 26 * u, "#8a614a", "#ffffff", 700, 2 * u);
  ctx.font = `700 ${58 * u}px ${FONT}`;
  const lines = wrapLines(ctx, face.title, page, 4);
  let y = m + 46 * u + 70 * u;
  const titleY = y;
  y += 70 * u * lines.length + 12 * u;
  // faint ruled lines on the page, below the writing
  ctx.strokeStyle = "rgba(138,97,74,.1)";
  ctx.lineWidth = 2 * u;
  for (let rule = y + 52 * u; rule < H - m - 90 * u; rule += 56 * u) {
    ctx.beginPath();
    ctx.moveTo(m, rule);
    ctx.lineTo(spine - m * 0.7, rule);
    ctx.stroke();
  }
  lines.forEach((line, index) => text(ctx, line, m, titleY + 70 * u * index, 58 * u, 700, INK));
  if (face.due) metaRow(ctx, m, y, u, "calendar", face.due.text, TONE[face.due.tone], page);
  const size = 28 * u;
  const base = H - m - size * 1.75;
  const current = face.posts.findIndex((post) => post.status === "current");
  if (face.state === "done") {
    const width = chip(ctx, m, base, "Selesai", size, "#dff6ec", "#1f7a57");
    check(ctx, m + width + 26 * u, base + size * 0.9, 20 * u, "#1f7a57", 6 * u);
  } else if (face.state === "working") chip(ctx, m, base, current >= 0 ? `Pos ${current + 1} dari ${face.posts.length || 5}` : "Sedang dikerjakan", size, "#fff0d1", "#9a5b00");
  else chip(ctx, m, base, "Belum dimulai", size, "#efebfb", "#5e4ac4");

  // right page: the five posts, as a path
  const left = spine + m * 1.1;
  text(ctx, "LIMA POS", left, m + 34 * u, 26 * u, 700, "#8a614a");
  const posts = face.posts.length ? face.posts : Array.from({ length: 5 }, (_, index) => ({ name: `Pos ${index + 1}`, status: "locked" as const }));
  const top = m + 100 * u;
  const step = (H - top - m - (face.more ? 56 * u : 0)) / posts.length;
  const r = Math.min(24 * u, step * 0.26);
  const x = left + r + 4 * u;
  ctx.strokeStyle = "rgba(138,97,74,.35)";
  ctx.lineWidth = 5 * u;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, top + step / 2);
  ctx.lineTo(x, top + step * (posts.length - 0.5));
  ctx.stroke();
  posts.forEach((post, index) => {
    const cy = top + step * (index + 0.5);
    if (post.status === "current") {
      ctx.fillStyle = "rgba(94,74,196,.16)";
      ctx.beginPath();
      ctx.arc(x, cy, r * 1.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = post.status === "done" ? "#34b47e" : post.status === "current" ? "#5e4ac4" : "#fbf6ea";
    ctx.fill();
    ctx.lineWidth = 4 * u;
    ctx.strokeStyle = post.status === "locked" ? "#c9bba6" : "rgba(0,0,0,0)";
    if (post.status === "locked") ctx.stroke();
    if (post.status === "done") check(ctx, x, cy, r, "#ffffff", 5 * u);
    else text(ctx, String(index + 1), x, cy + r * 0.36, r * 1.05, 700, post.status === "current" ? "#ffffff" : "#a89a86", "center");
    fitted(ctx, post.name, x + r + 22 * u, cy + 12 * u, 34 * u, post.status === "current" ? 700 : 600, post.status === "locked" ? "#a89a86" : INK, W - m - (x + r + 22 * u));
  });
  if (face.more) text(ctx, `+${face.more} tugas lain di meja`, left, H - m, 26 * u, 600, MUTED);
}

// ---- the lab bench's screen -----------------------------------------------------------------------------

export function paintLab(canvas: HTMLCanvasElement, face: LabFace) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  const u = H / 768;
  const m = 40 * u;
  ctx.fillStyle = "#edf8f4";
  ctx.fillRect(0, 0, W, H);

  // header: LAB, the lab's name, how far along
  const tag = chip(ctx, m, m, "LAB", 26 * u, "#256b59", "#ffffff", 700, 2 * u);
  const room = W - 2 * m - tag - 24 * u;
  fitted(ctx, face.title, m + tag + 22 * u, m + 46 * u, 54 * u, 700, INK, room * 0.7);
  const dots = Math.max(1, face.total);
  const dot = 13 * u;
  const dotsWidth = dots * dot * 2.7;
  for (let index = 0; index < dots; index++) {
    const cx = W - m - dotsWidth + dot + index * dot * 2.7;
    const cy = m + 26 * u;
    ctx.beginPath();
    ctx.arc(cx, cy, dot, 0, Math.PI * 2);
    ctx.fillStyle = index < face.solved ? "#30a46c" : "#ffffff";
    ctx.fill();
    ctx.lineWidth = 4 * u;
    ctx.strokeStyle = index < face.solved ? "#30a46c" : "#a9d4c3";
    ctx.stroke();
  }
  text(ctx, `${face.solved} dari ${face.total}`, W - m, m + 76 * u, 24 * u, 600, MUTED, "right");

  // the figure, on a card
  const top = m + 100 * u;
  const card = { x: m, y: top, w: W - 2 * m, h: H - top - m };
  ctx.save();
  ctx.shadowColor = "rgba(20,70,55,.2)";
  ctx.shadowBlur = 22 * u;
  ctx.shadowOffsetY = 8 * u;
  ctx.fillStyle = "#fbfbfa";
  roundRect(ctx, card.x, card.y, card.w, card.h, 26 * u);
  ctx.fill();
  ctx.restore();
  if (face.picture) {
    const pad = 20 * u;
    const scale = Math.min((card.w - 2 * pad) / face.picture.width, (card.h - 2 * pad) / face.picture.height);
    const w = face.picture.width * scale;
    const h = face.picture.height * scale;
    ctx.drawImage(face.picture, card.x + (card.w - w) / 2, card.y + (card.h - h) / 2, w, h);
  } else {
    flaskIcon(ctx, card.x + card.w / 2, card.y + card.h * 0.42, Math.min(card.w, card.h) * 0.4, "#256b59");
    text(ctx, face.subject, card.x + card.w / 2, card.y + card.h * 0.82, 40 * u, 600, MUTED, "center");
  }
}

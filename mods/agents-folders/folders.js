// Which folder a space is in. The same file ships in spaces-folders and agents-folders.
//
// Folders and path rules come from ~/.config/herdr-app/folders.json (optional):
//   { "folders": ["Work", "Personal"],
//     "rules": { "~/work": "Work", "~/personal-projects": "Personal" } }
// A space dragged onto a folder stays there (shared "space.folders", by space id);
// else the longest rule matching where it is now wins; else it's Unsorted.

import { appHome, home, readTextFile, shared } from "herdr";

export const UNSORTED = "Unsorted";
const DEFAULT = { folders: ["Work", "Personal"], rules: {} };

export const configPath = () => `${appHome()}/folders.json`;

// The config, or the defaults with `error` set when the file doesn't parse.
export async function loadConfig() {
  const text = await readTextFile(configPath());
  if (text == null) return DEFAULT;
  try {
    const raw = JSON.parse(text);
    const folders = (Array.isArray(raw.folders) ? raw.folders : DEFAULT.folders).map(String).filter(Boolean);
    const rules = raw.rules && typeof raw.rules === "object" ? raw.rules : {};
    return { folders: folders.length ? folders : DEFAULT.folders, rules };
  } catch (e) {
    return { ...DEFAULT, error: `folders.json: ${e.message ?? e}` };
  }
}

// Where a space is now: its first terminal's live folder, else where it was made.
// `ps`: panes(), read once by the caller (each read copies every pane).
export function place(s, ps) {
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  return ps.find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s.folder;
}

const expand = (p) => (p.startsWith("~") ? home() + p.slice(1) : p).replace(/\/+$/, "");
const named = (cfg, name) => cfg.folders.find((f) => f.toLowerCase() === String(name ?? "").toLowerCase());

export function folderOf(s, ps, cfg) {
  const chosen = named(cfg, (shared("space.folders") ?? {})[s.id]);
  if (chosen) return chosen;
  const at = place(s, ps) ?? "";
  let best = null;
  for (const [path, folder] of Object.entries(cfg.rules)) {
    const p = expand(path);
    if ((at === p || at.startsWith(p + "/")) && (!best || p.length > best.p.length) && named(cfg, folder)) best = { p, folder: named(cfg, folder) };
  }
  return best?.folder ?? UNSORTED;
}

// Every folder in order, Unsorted last.
export const folderNames = (cfg) => [...cfg.folders, UNSORTED];

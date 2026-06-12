/* ══════════════════════════════════════════════════════════════
   PYTHON RUNNER — echtes Python im Browser via Pyodide (CDN)
══════════════════════════════════════════════════════════════ */
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";

let pyodidePromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Pyodide konnte nicht geladen werden (Internet prüfen)"));
    document.head.appendChild(s);
  });
}

export function loadPython(onStatus) {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onStatus?.("Lade Python-Umgebung...");
      await loadScript(PYODIDE_URL);
      onStatus?.("Starte Python-Interpreter...");
      const py = await window.loadPyodide({ indexURL: PYODIDE_URL.replace(/pyodide\.js$/, "") });
      // input() auf Browser-Prompt umleiten
      py.globals.set("__js_prompt", (msg) => {
        const v = window.prompt(msg || "Eingabe:");
        return v === null ? "" : v;
      });
      await py.runPythonAsync(`
import builtins
def __patched_input(prompt=""):
    from js import window
    v = window.prompt(str(prompt) if prompt else "Eingabe:")
    return v if v is not None else ""
builtins.input = __patched_input
`);
      onStatus?.("");
      return py;
    })().catch(e => { pyodidePromise = null; throw e; });
  }
  return pyodidePromise;
}

export function isPythonReady() {
  return !!pyodidePromise;
}

/**
 * Führt Python-Code aus. Gibt {output, error} zurück.
 * onLine wird live für jede Ausgabezeile aufgerufen.
 */
export async function runPython(code, { onStatus, onLine } = {}) {
  const py = await loadPython(onStatus);
  const lines = [];
  const push = (text) => { lines.push(text); onLine?.(text); };
  py.setStdout({ batched: push });
  py.setStderr({ batched: (t) => push("⚠ " + t) });
  try {
    const result = await py.runPythonAsync(code);
    if (result !== undefined && result !== null && String(result) !== "undefined") {
      const s = String(result);
      if (s && s !== "None") push(s);
    }
    return { output: lines.join("\n"), error: null };
  } catch (e) {
    // Python-Traceback kürzen: nur die relevanten Zeilen
    const msg = String(e.message || e);
    const m = msg.match(/(File "<exec>".*[\s\S]*)$/);
    return { output: lines.join("\n"), error: m ? m[1].trim() : msg };
  }
}

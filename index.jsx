import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { LEVELS, getLevel, COURSES } from "./courses.js";
import { runPython, loadPython } from "./pyrunner.js";

/* ══════════════════════════════════════════════════════════════
   GEMINI API (Google AI Studio) — mit Modell-Fallback
══════════════════════════════════════════════════════════════ */
const MODELS = ["gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-2.0-flash-lite"];
let workingModel = null;

async function callAI(apiKey, prompt, system = "") {
  if (!apiKey?.trim()) throw new Error("Kein API-Key gesetzt");
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 1500 }
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const tryList = workingModel ? [workingModel, ...MODELS.filter(m => m !== workingModel)] : MODELS;
  let lastErr = null;

  for (const model of tryList) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      const d = await r.json();
      if (d.error) {
        // Modell existiert nicht → nächstes probieren. Andere Fehler (z.B. falscher Key) → sofort abbrechen.
        if (d.error.code === 404 || /not found|not supported/i.test(d.error.message || "")) {
          lastErr = new Error(d.error.message); continue;
        }
        throw new Error(d.error.message);
      }
      workingModel = model;
      return d.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (e) {
      if (e.message && !/not found|not supported|fetch/i.test(e.message)) throw e;
      lastErr = e;
    }
  }
  throw lastErr || new Error("Kein Gemini-Modell erreichbar");
}

/* ══════════════════════════════════════════════════════════════
   PERSISTENZ (localStorage — überlebt Sessions)
══════════════════════════════════════════════════════════════ */
const SKEY = "pylearn_state_v1";
async function loadPersisted() {
  try {
    const v = localStorage.getItem(SKEY);
    return v ? JSON.parse(v) : {};
  } catch { return {}; }
}
function persist(d) {
  try { localStorage.setItem(SKEY, JSON.stringify(d)); } catch {}
}
const today = () => new Date().toISOString().slice(0, 10);

/* ══════════════════════════════════════════════════════════════
   PYTHON SYNTAX HIGHLIGHTER
══════════════════════════════════════════════════════════════ */
const PY_KW = new Set(["def","class","if","elif","else","for","while","import","from","return","try","except","finally","with","as","and","or","not","in","is","True","False","None","break","continue","pass","lambda","yield","del","global","nonlocal","raise","assert"]);
const PY_BI = new Set(["print","input","len","range","int","float","str","bool","list","dict","set","tuple","type","sum","max","min","sorted","enumerate","zip","map","filter","open","super","self","abs","round","isinstance"]);
const he = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

function pyHL(code) {
  const out = []; let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === "\n") { out.push("\n"); i++; continue; }
    if (ch === "#") {
      let j = i; while (j < code.length && code[j] !== "\n") j++;
      out.push(`<span style="color:#6A9955;font-style:italic">${he(code.slice(i,j))}</span>`); i = j; continue;
    }
    if (ch === '"' || ch === "'") {
      const q = ch; let j = i + 1;
      if (code.slice(i, i+3) === q+q+q) {
        j = i + 3; while (j < code.length && code.slice(j, j+3) !== q+q+q) j++;
        j = Math.min(j + 3, code.length);
      } else {
        while (j < code.length && code[j] !== q && code[j] !== "\n") { if (code[j] === "\\") j++; j++; }
        if (j < code.length && code[j] === q) j++;
      }
      out.push(`<span style="color:#CE9178">${he(code.slice(i,j))}</span>`); i = j; continue;
    }
    if (/\d/.test(ch) && (i === 0 || !/\w/.test(code[i-1]))) {
      let j = i; while (j < code.length && /[\d.]/.test(code[j])) j++;
      out.push(`<span style="color:#B5CEA8">${he(code.slice(i,j))}</span>`); i = j; continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i; while (j < code.length && /\w/.test(code[j])) j++;
      const w = code.slice(i, j);
      if (PY_KW.has(w)) out.push(`<span style="color:#569CD6;font-weight:600">${he(w)}</span>`);
      else if (PY_BI.has(w)) out.push(`<span style="color:#DCDCAA">${he(w)}</span>`);
      else out.push(he(w));
      i = j; continue;
    }
    out.push(he(ch)); i++;
  }
  return out.join("");
}

/* ══════════════════════════════════════════════════════════════
   GLOBALES STYLING — Animationen & Responsive
══════════════════════════════════════════════════════════════ */
const GlobalStyle = () => (
  <style>{`
    @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes pop { 0% { transform:scale(0.6); opacity:0; } 70% { transform:scale(1.08); } 100% { transform:scale(1); opacity:1; } }
    @keyframes glowPulse { 0%,100% { box-shadow:0 0 0 0 rgba(124,58,237,0.45); } 50% { box-shadow:0 0 0 7px rgba(124,58,237,0); } }
    @keyframes bounceIn { 0% { transform:translateY(-8px); opacity:0; } 100% { transform:translateY(0); opacity:1; } }
    @keyframes spin { to { transform:rotate(360deg); } }
    .anim-fadeUp { animation: fadeUp 0.4s ease both; }
    .anim-fadeIn { animation: fadeIn 0.3s ease both; }
    .anim-pop { animation: pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
    .anim-bounceIn { animation: bounceIn 0.35s ease both; }
    .pulse-current { animation: glowPulse 2.2s ease-in-out infinite; }
    .spin { animation: spin 1s linear infinite; display:inline-block; }
    .hover-lift { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
    .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.45); }
    .hover-bright { transition: filter 0.15s ease, transform 0.12s ease; }
    .hover-bright:hover { filter: brightness(1.15); }
    .hover-bright:active { transform: scale(0.97); }
    button { font-family: inherit; }
    input, textarea { font-family: inherit; }
    * { -webkit-tap-highlight-color: transparent; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-thumb { background: #2d2d50; border-radius: 99px; }
    ::-webkit-scrollbar-track { background: transparent; }
    @media (max-width: 600px) {
      .grid-2 { grid-template-columns: 1fr !important; }
      .pg-layout { flex-direction: column !important; }
      .pg-chat { width: 100% !important; max-width: none !important; min-height: 280px; }
      .hide-mobile { display: none !important; }
    }
  `}</style>
);

/* ══════════════════════════════════════════════════════════════
   OUTPUT-KONSOLE — zeigt echte Python-Ausgabe
══════════════════════════════════════════════════════════════ */
function OutputConsole({ output, error, running, status, onClear }) {
  if (!running && !status && output === null && !error) return null;
  return (
    <div className="anim-fadeIn" style={{background:"#05050c",border:"1px solid #2d2d50",borderRadius:10,marginTop:10,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 12px",background:"#0d0d1c",borderBottom:"1px solid #1e1e3a"}}>
        <span style={{color:"#6b7280",fontSize:11,fontWeight:700,letterSpacing:0.5}}>
          {running ? <><span className="spin">⏳</span> {status || "Führe aus..."}</> : "▸ KONSOLE"}
        </span>
        {onClear && !running && <button onClick={onClear} style={{background:"none",border:"none",color:"#4b5563",cursor:"pointer",fontSize:11}}>✕ leeren</button>}
      </div>
      <pre style={{margin:0,padding:"12px 14px",fontFamily:"'Fira Code',Consolas,monospace",fontSize:13,lineHeight:1.6,color:"#d4d4d4",whiteSpace:"pre-wrap",overflowWrap:"break-word",maxHeight:240,overflowY:"auto"}}>
        {output || ""}
        {error && <span style={{color:"#f87171"}}>{(output ? "\n" : "") + error}</span>}
        {!running && !error && !output && <span style={{color:"#4b5563"}}>(keine Ausgabe)</span>}
      </pre>
    </div>
  );
}

/* Hook: Python-Code ausführen mit Konsolen-State */
function usePyRunner() {
  const [out, setOut] = useState(null);
  const [err, setErr] = useState(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");

  const run = async (code) => {
    if (running) return;
    setRunning(true); setOut(""); setErr(null); setStatus("");
    try {
      const r = await runPython(code, { onStatus: setStatus });
      setOut(r.output); setErr(r.error);
    } catch (e) {
      setErr(String(e.message || e));
    } finally { setRunning(false); setStatus(""); }
  };
  const clear = () => { setOut(null); setErr(null); };
  return { out, err, running, status, run, clear };
}

/* ══════════════════════════════════════════════════════════════
   KI-HILFE-BUTTON (schwebend, unten rechts)
══════════════════════════════════════════════════════════════ */
function HelpFab({ apiKey, context }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (question) => {
    setLoading(true); setText("");
    try {
      const resp = await callAI(apiKey,
        `${context}\n\nFrage des Schülers: ${question}\n\nAntworte hilfreich, kompakt (max 5 Sätze + ggf. ein Mini-Codebeispiel), auf Deutsch. Gib KEINE Komplettlösung der Aufgabe, sondern erkläre das Konzept.`);
      setText(resp);
    } catch (e) { setText(`Fehler: ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} className="hover-bright"
        style={{position:"fixed",bottom:20,right:20,width:54,height:54,borderRadius:"50%",
          background:"linear-gradient(135deg,#7c3aed,#6d28d9)",border:"none",color:"white",
          fontSize:24,cursor:"pointer",zIndex:50,boxShadow:"0 6px 24px rgba(124,58,237,0.5)"}}
        title="KI-Hilfe">
        {open ? "✕" : "🤖"}
      </button>
      {open && (
        <div className="anim-pop" style={{position:"fixed",bottom:84,right:20,left:"max(20px, calc(100vw - 420px))",
          background:"#13132a",border:"1px solid #3d3d65",borderRadius:16,padding:16,zIndex:50,
          boxShadow:"0 20px 60px rgba(0,0,0,0.7)",maxHeight:"60vh",overflowY:"auto"}}>
          <div style={{color:"#a78bfa",fontWeight:700,fontSize:14,marginBottom:10}}>🤖 KI-Hilfe</div>
          {!text && !loading && (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {["Erkläre mir die Aufgabe nochmal einfacher","Welches Konzept brauche ich hier?","Ich verstehe die Fehlermeldung nicht","Gib mir einen kleinen Denkanstoß"].map(q => (
                <button key={q} onClick={()=>ask(q)} className="hover-bright"
                  style={{padding:"10px 12px",background:"#1c1c35",border:"1px solid #2d2d50",borderRadius:10,color:"#cbd5e0",fontSize:13,cursor:"pointer",textAlign:"left"}}>
                  {q}
                </button>
              ))}
            </div>
          )}
          {loading && <div style={{color:"#6b7280",fontSize:13,padding:"12px 0"}}><span className="spin">⏳</span> Denke nach...</div>}
          {text && (
            <>
              <p style={{color:"#cbd5e0",fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",margin:"0 0 10px"}}>{text}</p>
              <button onClick={()=>setText("")} style={{padding:"8px 14px",background:"#1c1c35",border:"1px solid #2d2d50",borderRadius:8,color:"#a78bfa",fontSize:12,cursor:"pointer"}}>← andere Frage</button>
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   CODE EDITOR (Syntax-Highlighting Overlay, Tab-Support)
══════════════════════════════════════════════════════════════ */
function CodeEditor({ value, onChange, height = 280, readOnly = false }) {
  const taRef = useRef(null);
  const preRef = useRef(null);

  const syncScroll = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  const handleTab = e => {
    if (e.key === "Tab") {
      e.preventDefault();
      const s = e.target.selectionStart, en = e.target.selectionEnd;
      onChange(value.substring(0, s) + "    " + value.substring(en));
      requestAnimationFrame(() => { e.target.selectionStart = e.target.selectionEnd = s + 4; });
    }
  };

  const shared = {
    position:"absolute", top:0, left:0, right:0, bottom:0,
    margin:0, padding:"14px 16px",
    fontFamily:"'Fira Code','Consolas','Courier New',monospace",
    fontSize:"13px", lineHeight:"1.65", tabSize:4,
    whiteSpace:"pre", overflow:"auto", letterSpacing:"0.01em",
    boxSizing:"border-box"
  };

  return (
    <div style={{position:"relative", height, background:"#0a0a18", borderRadius:10, border:"1px solid #2d2d50", overflow:"hidden"}}>
      <pre ref={preRef} aria-hidden
        style={{...shared, color:"#d4d4d4", pointerEvents:"none", zIndex:1}}
        dangerouslySetInnerHTML={{__html: pyHL(value) + "\n "}} />
      <textarea ref={taRef} value={value}
        onChange={e => !readOnly && onChange(e.target.value)}
        onKeyDown={handleTab} onScroll={syncScroll}
        readOnly={readOnly} spellCheck={false}
        autoCapitalize="off" autoCorrect="off" autoComplete="off"
        style={{...shared, background:"transparent", color:"transparent",
          caretColor:"#a78bfa", border:"none", outline:"none",
          resize:"none", zIndex:2, cursor: readOnly ? "default" : "text"}} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   THEORIE-RENDERER (Mini-Markdown)
══════════════════════════════════════════════════════════════ */
function TheoryText({ text }) {
  const lines = text.split("\n");
  const els = []; let inCode = false, codeLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      if (!inCode) { inCode = true; codeLines = []; continue; }
      inCode = false;
      els.push(
        <div key={i} style={{background:"#0a0a18",borderRadius:8,padding:"12px 14px",marginBottom:12,overflowX:"auto",border:"1px solid #2d2d50"}}>
          <pre style={{margin:0,fontFamily:"monospace",fontSize:13,lineHeight:1.65,color:"#d4d4d4"}}
            dangerouslySetInnerHTML={{__html: pyHL(codeLines.join("\n"))}} />
        </div>
      ); continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    if (line.startsWith("## ")) {
      els.push(<h3 key={i} style={{color:"#a78bfa",fontSize:14,fontWeight:700,margin:"16px 0 8px",letterSpacing:0.3}}>{line.slice(3)}</h3>);
    } else if (line === "") {
      els.push(<div key={i} style={{height:4}} />);
    } else {
      const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      els.push(
        <p key={i} style={{margin:"3px 0",color:"#cbd5e0",lineHeight:1.75,fontSize:14}}>
          {parts.map((p, pi) => {
            if (p.startsWith("**") && p.endsWith("**")) return <strong key={pi} style={{color:"#e2e8f0"}}>{p.slice(2,-2)}</strong>;
            if (p.startsWith("`") && p.endsWith("`")) return <code key={pi} style={{background:"#1e1e3a",color:"#DCDCAA",padding:"1px 6px",borderRadius:4,fontSize:12,fontFamily:"monospace"}}>{p.slice(1,-1)}</code>;
            return p;
          })}
        </p>
      );
    }
  }
  return <div>{els}</div>;
}

/* ══════════════════════════════════════════════════════════════
   SETUP SCREEN
══════════════════════════════════════════════════════════════ */
function SetupScreen({ initKey, onDone }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState(initKey || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    if (!name.trim()) { setErr("Bitte gib deinen Namen ein."); return; }
    if (!key.trim()) { setErr("Bitte gib deinen Gemini API-Key ein."); return; }
    setLoading(true); setErr("");
    try {
      await callAI(key.trim(), "Sage nur 'ok'.");
      onDone(name.trim(), key.trim());
    } catch (e) { setErr(`API-Fehler: ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:"#07070f",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{maxWidth:420,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:60,marginBottom:12}}>🐍</div>
          <h1 style={{color:"#e2e8f0",fontSize:28,fontWeight:800,margin:0,letterSpacing:-0.5}}>Python Learn AI</h1>
          <p style={{color:"#6b7280",fontSize:15,marginTop:8,lineHeight:1.5}}>Lerne Python interaktiv – mit KI-Tutor, Daily Challenges und echtem Code-Editor</p>
        </div>
        <div style={{background:"#111120",borderRadius:16,padding:28,border:"1px solid #2a2a50",boxShadow:"0 20px 60px #0008"}}>
          <label style={{display:"block",color:"#94a3b8",fontSize:13,marginBottom:6,fontWeight:600}}>DEIN NAME</label>
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}
            placeholder="z.B. Alex" style={{width:"100%",padding:"12px 14px",background:"#1c1c35",border:"1px solid #2a2a50",borderRadius:10,color:"#e2e8f0",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:18}}/>
          <label style={{display:"block",color:"#94a3b8",fontSize:13,marginBottom:6,fontWeight:600}}>GEMINI API-KEY</label>
          <input value={key} onChange={e=>setKey(e.target.value)} type="password" placeholder="AIza..."
            style={{width:"100%",padding:"12px 14px",background:"#1c1c35",border:"1px solid #2a2a50",borderRadius:10,color:"#e2e8f0",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:6}}/>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{color:"#8b5cf6",fontSize:12,textDecoration:"none"}}>→ Kostenlos auf Google AI Studio holen</a>
          {err && <div style={{color:"#ef4444",fontSize:13,marginTop:12,background:"#1a0505",borderRadius:8,padding:"10px 14px"}}>{err}</div>}
          <button onClick={go} disabled={loading}
            style={{width:"100%",marginTop:20,padding:"14px",background:loading?"#4b3b6b":"linear-gradient(135deg,#7c3aed,#6d28d9)",border:"none",borderRadius:10,color:"white",fontSize:16,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>
            {loading ? "Verbinde mit Gemini..." : "Lernen starten 🚀"}
          </button>
        </div>
        <p style={{color:"#374151",fontSize:12,textAlign:"center",marginTop:16}}>Dein Fortschritt wird automatisch gespeichert.</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   HOME SCREEN
══════════════════════════════════════════════════════════════ */
function HomeScreen({ user, challenge, onLesson, onChallenge, onTutor, onSettings, onPlayground }) {
  const lv = getLevel(user.xp);
  const done = new Set(user.completed);
  const totalL = COURSES.reduce((s,c)=>s+c.lessons.length,0);
  const doneL  = COURSES.reduce((s,c)=>s+c.lessons.filter(l=>done.has(l.id)).length,0);
  const challengeDone = challenge?.date === today() && challenge?.completed;
  const [expanded, setExpanded] = useState(null); // Kurs-ID für "abgeschlossene anzeigen"

  // Kurs i ist freigeschaltet, wenn alle Lektionen des vorherigen Kurses fertig sind
  const courseUnlocked = i => i === 0 || COURSES[i-1].lessons.every(l => done.has(l.id));

  return (
    <div style={{minHeight:"100vh",background:"#07070f",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:32}}>
      <div style={{background:"#0f0f1ecc",backdropFilter:"blur(12px)",borderBottom:"1px solid #1e1e3a",padding:"14px 16px",position:"sticky",top:0,zIndex:20}}>
        <div style={{maxWidth:720,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:26}}>🐍</span>
            <div>
              <div style={{color:"#e2e8f0",fontWeight:700,fontSize:15}}>Python Learn AI</div>
              <div style={{color:"#4b5563",fontSize:12}}>Hallo, {user.name}! 👋</div>
            </div>
          </div>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#f59e0b",fontWeight:700,fontSize:15}}>🔥 {user.streak}</div>
              <div style={{color:"#4b5563",fontSize:11}}>Streak</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{color:"#a78bfa",fontWeight:700,fontSize:15}}>⚡ {user.xp}</div>
              <div style={{color:"#4b5563",fontSize:11}}>XP</div>
            </div>
            <button onClick={onSettings} className="hover-bright" style={{background:"none",border:"none",color:"#4b5563",cursor:"pointer",fontSize:18,padding:4}}>⚙</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"20px 16px"}}>
        <div className="anim-fadeUp" style={{background:"#111120",borderRadius:14,padding:"18px 20px",marginBottom:16,border:"1px solid #2a2a50"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{color:"#e2e8f0",fontWeight:700,fontSize:15}}>{lv.icon} {lv.name}</div>
            <div style={{color:"#6b7280",fontSize:13}}>{user.xp} / {lv.nextXP} XP</div>
          </div>
          <div style={{background:"#1c1c35",borderRadius:99,height:8,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(90deg,#7c3aed,#a78bfa)",height:"100%",width:`${lv.pct}%`,borderRadius:99,transition:"width 0.5s"}} />
          </div>
          <div style={{color:"#4b5563",fontSize:12,marginTop:8}}>{doneL} von {totalL} Lektionen · {challengeDone?"✅ Challenge heute gemacht":"⚡ Daily Challenge verfügbar"}</div>
        </div>

        <div className="grid-2 anim-fadeUp" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12,animationDelay:"0.05s"}}>
          <button onClick={onChallenge} className="hover-lift" style={{background:`linear-gradient(135deg,#1a1530,${challengeDone?"#111120":"#2d1b69"})`,border:`1px solid ${challengeDone?"#2a2a50":"#4c1d95"}`,borderRadius:14,padding:"16px 14px",cursor:"pointer",textAlign:"left"}}>
            <div style={{fontSize:26,marginBottom:6}}>{challengeDone?"✅":"⚡"}</div>
            <div style={{color:challengeDone?"#6b7280":"#a78bfa",fontWeight:700,fontSize:14}}>Daily Challenge</div>
            <div style={{color:"#4b5563",fontSize:12,marginTop:3}}>{challengeDone?"Heute erledigt!":"+50 XP heute"}</div>
          </button>
          <button onClick={onTutor} className="hover-lift" style={{background:"linear-gradient(135deg,#0a1a2a,#0c2440)",border:"1px solid #1e3a5f",borderRadius:14,padding:"16px 14px",cursor:"pointer",textAlign:"left"}}>
            <div style={{fontSize:26,marginBottom:6}}>🤖</div>
            <div style={{color:"#60a5fa",fontWeight:700,fontSize:14}}>AI Tutor</div>
            <div style={{color:"#4b5563",fontSize:12,marginTop:3}}>Frag mich alles!</div>
          </button>
        </div>

        <button onClick={onPlayground} className="hover-lift anim-fadeUp" style={{display:"flex",alignItems:"center",gap:14,width:"100%",background:"linear-gradient(135deg,#0a1f14,#0e3320)",border:"1px solid #166534",borderRadius:14,padding:"16px 18px",cursor:"pointer",textAlign:"left",marginBottom:24,animationDelay:"0.1s",boxSizing:"border-box"}}>
          <div style={{fontSize:32}}>🧪</div>
          <div style={{flex:1}}>
            <div style={{color:"#4ade80",fontWeight:700,fontSize:15}}>Python Playground</div>
            <div style={{color:"#4b5563",fontSize:12,marginTop:2}}>Echtes Python im Browser · KI-Assistent · Code teilen</div>
          </div>
          <div style={{color:"#4ade80",fontSize:20}}>→</div>
        </button>

        <div style={{color:"#e2e8f0",fontSize:17,fontWeight:700,marginBottom:14}}>Dein Lernpfad</div>
        {COURSES.map((course, ci) => {
          const cDone = course.lessons.filter(l=>done.has(l.id)).length;
          const pct = (cDone / course.lessons.length) * 100;
          const cUnlocked = courseUnlocked(ci);
          const showAll = expanded === course.id;
          const diffLabel = ci === 0 ? "Easy" : ci === 1 ? "Mittel" : "Fortgeschritten";
          return (
            <div key={course.id} className="anim-fadeUp" style={{background:"#111120",borderRadius:16,marginBottom:14,border:`1px solid ${course.border}55`,overflow:"hidden",opacity:cUnlocked?1:0.55,animationDelay:`${0.1 + ci*0.07}s`}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid #1a1a30"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>{cUnlocked ? course.emoji : "🔒"}</span>
                    <div>
                      <div style={{color:"#e2e8f0",fontWeight:700,fontSize:15}}>{course.title} <span style={{color:course.color,fontSize:11,fontWeight:700,marginLeft:4,background:course.bg,padding:"2px 8px",borderRadius:10,border:`1px solid ${course.border}66`}}>{diffLabel}</span></div>
                      <div style={{color:"#4b5563",fontSize:12}}>{cUnlocked ? course.subtitle : "Schließe erst den vorherigen Kurs ab"}</div>
                    </div>
                  </div>
                  <div style={{color:course.color,fontSize:13,fontWeight:700,background:course.bg,padding:"3px 10px",borderRadius:20}}>{cDone}/{course.lessons.length}</div>
                </div>
                <div style={{background:"#1c1c35",borderRadius:99,height:5}}>
                  <div style={{background:course.color,height:"100%",width:`${pct}%`,borderRadius:99,transition:"width 0.5s"}} />
                </div>
              </div>
              <div style={{padding:"12px 16px"}}>
                {(() => {
                  const doneCount = course.lessons.filter(l=>done.has(l.id)).length;
                  return (
                    <>
                      {doneCount > 0 && !showAll && (
                        <button onClick={()=>setExpanded(course.id)} style={{display:"block",width:"100%",padding:"8px 10px",marginBottom:6,background:"transparent",border:"1px dashed #2d2d50",borderRadius:10,color:"#4b5563",fontSize:12,cursor:"pointer"}}>
                          ✓ {doneCount} abgeschlossene Lektion{doneCount>1?"en":""} anzeigen
                        </button>
                      )}
                      {showAll && doneCount > 0 && (
                        <button onClick={()=>setExpanded(null)} style={{display:"block",width:"100%",padding:"8px 10px",marginBottom:6,background:"transparent",border:"1px dashed #2d2d50",borderRadius:10,color:"#4b5563",fontSize:12,cursor:"pointer"}}>
                          Abgeschlossene wieder einklappen ▲
                        </button>
                      )}
                    </>
                  );
                })()}
                {course.lessons.map((lesson, idx) => {
                  const isDone = done.has(lesson.id);
                  const lUnlocked = cUnlocked && course.lessons.slice(0, idx).every(l=>done.has(l.id));
                  const isCurrent = !isDone && lUnlocked;
                  if (isDone && !showAll) return null; // Abgeschlossene standardmäßig eingeklappt
                  return (
                    <button key={lesson.id}
                      onClick={()=> (isDone || isCurrent) && onLesson(course, lesson)}
                      disabled={!isDone && !isCurrent}
                      className={isCurrent ? "pulse-current" : ""}
                      style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:isCurrent?"12px 12px":"9px 10px",borderRadius:10,marginBottom:3,
                        background:isCurrent?"linear-gradient(135deg,#1e1e3a,#251a45)":"transparent",
                        border:isCurrent?"1px solid #7c3aed88":"1px solid transparent",
                        cursor:(isDone||isCurrent)?"pointer":"default",textAlign:"left",transition:"all 0.15s",
                        opacity:(!isDone && !isCurrent)?0.4:1}}>
                      <div style={{width:isCurrent?30:26,height:isCurrent?30:26,borderRadius:"50%",background:isDone?course.color:isCurrent?"#7c3aed":"#1c1c35",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,color:(isDone||isCurrent)?"#fff":"#4b5563",fontWeight:700,transition:"all 0.2s"}}>
                        {isDone ? "✓" : isCurrent ? "▶" : "🔒"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:isDone?"#6b7280":isCurrent?"#fff":"#6b7280",fontSize:14,fontWeight:isCurrent?700:isDone?400:500}}>
                          {isCurrent && <span style={{color:"#a78bfa",fontSize:10,fontWeight:800,letterSpacing:1,display:"block",marginBottom:2}}>JETZT DRAN</span>}
                          {lesson.num}. {lesson.title}
                        </div>
                        <div style={{color:"#374151",fontSize:12}}>{lesson.sub}</div>
                      </div>
                      <div style={{color:isCurrent?"#f59e0b":"#4b5563",fontSize:12,fontWeight:700,flexShrink:0}}>+{lesson.xp}XP</div>
                    </button>
                  );
                })}
                {(() => {
                  const testUnlocked = cUnlocked && course.lessons.every(l=>done.has(l.id));
                  const testDone = done.has(course.finalTest.id);
                  return (
                    <button onClick={()=> testUnlocked && onLesson(course, {...course.finalTest, isTest:true})}
                      disabled={!testUnlocked}
                      className={testUnlocked && !testDone ? "pulse-current" : ""}
                      style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"9px 10px",borderRadius:10,marginTop:6,
                        background:testDone?"transparent":testUnlocked?"#150e25":"transparent",
                        border:`1px solid ${testDone?"#2a2a50":testUnlocked?course.color+"66":"transparent"}`,
                        cursor:testUnlocked?"pointer":"default",textAlign:"left",opacity:testUnlocked||testDone?1:0.4}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:testDone?course.color:"#2d1b69",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12}}>
                        {testDone ? "✓" : testUnlocked ? "🏆" : "🔒"}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{color:"#e2e8f0",fontSize:14,fontWeight:600}}>{course.finalTest.title}</div>
                        <div style={{color:"#4b5563",fontSize:12}}>Abschlusstest · {course.finalTest.diff}{!testUnlocked && " · erst alle Lektionen abschließen"}</div>
                      </div>
                      <div style={{color:"#f59e0b",fontSize:12,fontWeight:700,flexShrink:0}}>+{course.finalTest.xp}XP</div>
                    </button>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LESSON SCREEN
══════════════════════════════════════════════════════════════ */
function LessonScreen({ lesson, course, user, apiKey, onBack, onComplete, onNext, onSkip }) {
  const isTest = !!lesson.isTest;
  const [tab, setTab] = useState(isTest ? "code" : "story");
  const [code, setCode] = useState("# Dein Code hier\n\n");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [xpAnim, setXpAnim] = useState(false);
  const alreadyDone = user.completed.includes(lesson.id);
  const py = usePyRunner();
  const [passedNow, setPassedNow] = useState(false);

  const checkCode = async (hint = false) => {
    if (!code.trim() || code.trim() === "# Dein Code hier") {
      setResult({type:"error", text:"Schreib zuerst etwas Code! 💻"}); return;
    }
    setLoading(true); setResult(null);
    try {
      const task = lesson.task || lesson.desc;
      const prompt = hint
        ? `Du bist Python-Tutor. Der Schüler lernt "${lesson.title}".
Aufgabe: ${task}
Sein Code bisher:
\`\`\`python
${code}
\`\`\`
Gib einen hilfreichen HINWEIS (max 3 Sätze), aber NICHT die Lösung. Was soll er als nächstes überlegen?`
        : `Du bist Python-Tutor. Bewerte diesen Code für die Aufgabe.

Aufgabe: ${task}

Code:
\`\`\`python
${code}
\`\`\`

Antworte EXAKT in diesem Format:
ERGEBNIS: [BESTANDEN oder NICHT BESTANDEN]
FEEDBACK: [2-4 Sätze: Was gut ist, was fehlt oder verbessert werden kann]
PROFI-TIPP: [Ein optionaler kurzer Tipp für besseren Code]`;

      const resp = await callAI(apiKey, prompt);
      if (hint) {
        setResult({type:"hint", text:resp});
      } else {
        const up = resp.toUpperCase();
        const passed = up.includes("BESTANDEN") && !up.includes("NICHT BESTANDEN");
        const fb = resp.match(/FEEDBACK:\s*([\s\S]*?)(?:PROFI-TIPP:|$)/i)?.[1]?.trim() || resp;
        const tip = resp.match(/PROFI-TIPP:\s*([\s\S]*?)$/i)?.[1]?.trim();
        setResult({type: passed ? "success" : "fail", text: fb, tip});
        if (passed) setPassedNow(true);
        if (passed && !alreadyDone) {
          setXpAnim(true);
          onComplete(lesson.id, lesson.xp);
          setTimeout(()=>setXpAnim(false), 3000);
        }
      }
    } catch (e) {
      setResult({type:"error", text:`Fehler: ${e.message}`});
    } finally { setLoading(false); }
  };

  const tabs = isTest
    ? [{id:"code", label:"💻 Aufgabe"}]
    : [{id:"story", label:"🎬 Story"}, {id:"theory", label:"📖 Theorie"}, {id:"code", label:"💻 Code"}];

  return (
    <div style={{minHeight:"100vh",background:"#07070f",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{background:"#0f0f1e",borderBottom:"1px solid #1e1e3a",padding:"12px 16px",position:"sticky",top:0,zIndex:20}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <button onClick={onBack} style={{background:"none",border:"none",color:"#6b7280",cursor:"pointer",fontSize:22,padding:"0 8px 0 0",lineHeight:1}}>←</button>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:course.color,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{course.title}</div>
              <div style={{color:"#e2e8f0",fontSize:15,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lesson.title}</div>
            </div>
            <div style={{background:"#1c1c35",borderRadius:20,padding:"4px 12px",color:"#f59e0b",fontSize:13,fontWeight:700,flexShrink:0}}>
              {alreadyDone ? "✓ " : ""}{lesson.xp} XP
            </div>
          </div>
          <div style={{display:"flex",gap:4}}>
            {tabs.map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
                  background: tab===t.id ? course.color+"22" : "transparent",
                  color: tab===t.id ? course.color : "#4b5563", transition:"all 0.15s"}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"20px 16px"}}>
        {tab === "story" && (
          <div>
            <div style={{background:`linear-gradient(135deg,#111120,${course.bg})`,borderRadius:16,padding:24,marginBottom:16,border:`1px solid ${course.border}55`}}>
              <p style={{color:"#e2e8f0",fontSize:18,lineHeight:1.8,margin:0}}>{lesson.story}</p>
            </div>
            <div style={{background:"#111120",borderRadius:14,padding:"16px 18px",marginBottom:16,border:"1px solid #2a2a50"}}>
              <div style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>In dieser Lektion</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {(lesson.tags||[]).map(tag => (
                  <span key={tag} style={{background:"#1c1c35",color:"#a78bfa",padding:"4px 12px",borderRadius:20,fontSize:13}}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{background:"#111120",borderRadius:14,padding:"16px 18px",marginBottom:16,border:"1px solid #2a2a50"}}>
              <div style={{color:"#6b7280",fontSize:11,fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:0.5}}>Beispielcode</div>
              <CodeEditor value={lesson.example||""} onChange={()=>{}} height={200} readOnly />
            </div>
            <button onClick={()=>setTab("theory")}
              style={{width:"100%",padding:13,background:"linear-gradient(135deg,#7c3aed,#6d28d9)",border:"none",borderRadius:12,color:"white",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              Theorie lernen →
            </button>
          </div>
        )}

        {tab === "theory" && (
          <div>
            <div style={{background:"#111120",borderRadius:16,padding:"22px 20px",marginBottom:16,border:"1px solid #2a2a50"}}>
              <TheoryText text={lesson.theory||""} />
            </div>
            <button onClick={()=>setTab("code")}
              style={{width:"100%",padding:13,background:"linear-gradient(135deg,#7c3aed,#6d28d9)",border:"none",borderRadius:12,color:"white",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              Aufgabe lösen →
            </button>
          </div>
        )}

        {tab === "code" && (
          <div>
            {xpAnim && (
              <div style={{background:"#0a1f0a",border:"1px solid #22c55e",borderRadius:12,padding:14,marginBottom:14,textAlign:"center"}}>
                <div style={{fontSize:28}}>🎉</div>
                <div style={{color:"#22c55e",fontWeight:700,fontSize:16}}>+{lesson.xp} XP verdient!</div>
              </div>
            )}

            <div style={{background:"#111120",borderRadius:14,padding:"16px 18px",marginBottom:14,border:`1px solid ${course.border}55`}}>
              <div style={{color:course.color,fontSize:11,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>
                {isTest ? "🏆 Abschlusstest" : "📝 Aufgabe"}
              </div>
              <div style={{color:"#e2e8f0",fontSize:14,lineHeight:1.75,whiteSpace:"pre-line"}}>{lesson.task||lesson.desc}</div>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{color:"#4b5563",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Python Editor</span>
                <span style={{color:"#374151",fontSize:11}}>Tab = 4 Leerzeichen</span>
              </div>
              <CodeEditor value={code} onChange={setCode} height={300} />
              <OutputConsole output={py.out} error={py.err} running={py.running} status={py.status} onClear={py.clear} />
            </div>

            <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
              <button onClick={()=>py.run(code)} disabled={py.running} className="hover-bright"
                style={{padding:12,background:py.running?"#1c1c35":"linear-gradient(135deg,#166534,#15803d)",border:"none",borderRadius:10,color:"white",fontSize:14,fontWeight:700,cursor:py.running?"not-allowed":"pointer"}}>
                {py.running ? "⏳ Läuft..." : "▶ Ausführen"}
              </button>
              <button onClick={()=>checkCode(true)} disabled={loading} className="hover-bright"
                style={{padding:12,background:"#1c1c35",border:"1px solid #3d3d65",borderRadius:10,color:"#a78bfa",fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer"}}>
                💡 Hinweis
              </button>
              <button onClick={()=>checkCode(false)} disabled={loading} className="hover-bright"
                style={{padding:12,background:loading?"#4b3b6b":"linear-gradient(135deg,#7c3aed,#6d28d9)",border:"none",borderRadius:10,color:"white",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>
                {loading ? "⏳ Prüfe..." : "✓ Abgeben"}
              </button>
            </div>

            {result && (
              <div className="anim-fadeUp" style={{background:result.type==="success"?"#071209":result.type==="hint"?"#0d0b1a":"#120505",border:`1px solid ${result.type==="success"?"#22c55e55":result.type==="hint"?"#7c3aed55":"#ef444455"}`,borderRadius:12,padding:"16px 18px"}}>
                <div style={{fontWeight:700,marginBottom:8,color:result.type==="success"?"#22c55e":result.type==="hint"?"#a78bfa":"#ef4444",fontSize:14}}>
                  {result.type==="success"?"✅ Bestanden!":result.type==="fail"?"❌ Noch nicht ganz...":result.type==="hint"?"💡 Hinweis für dich":"⚠️ Fehler"}
                </div>
                <p style={{color:"#cbd5e0",fontSize:14,margin:0,lineHeight:1.75,whiteSpace:"pre-wrap"}}>{result.text}</p>
                {result.tip && <p style={{color:"#6b7280",fontSize:13,margin:"10px 0 0",fontStyle:"italic",borderTop:"1px solid #2a2a50",paddingTop:10}}>⚡ Profi-Tipp: {result.tip}</p>}
              </div>
            )}

            {(passedNow || alreadyDone) && onNext && (
              <button onClick={onNext} className="hover-bright anim-pop"
                style={{width:"100%",marginTop:14,padding:14,background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:12,color:"white",fontSize:15,fontWeight:700,cursor:"pointer"}}>
                Nächste Lektion →
              </button>
            )}
            {!passedNow && !alreadyDone && !isTest && onSkip && (
              <button onClick={onSkip}
                style={{width:"100%",marginTop:10,padding:10,background:"transparent",border:"1px dashed #2d2d50",borderRadius:10,color:"#4b5563",fontSize:13,cursor:"pointer"}}>
                Lektion überspringen (ohne XP) ⏭
              </button>
            )}
          </div>
        )}
      </div>
      <HelpFab apiKey={apiKey} context={`Der Schüler arbeitet an der Python-Lektion "${lesson.title}" (${lesson.sub||"Abschlusstest"}).\nAufgabe: ${lesson.task||lesson.desc}`} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DAILY CHALLENGE SCREEN
══════════════════════════════════════════════════════════════ */
function ChallengeScreen({ user, apiKey, challenge, onSaveChallenge, onBack, onXP }) {
  const todayS = today();
  const [ch, setCh] = useState(challenge?.date === todayS ? challenge : null);
  const [code, setCode] = useState("# Daily Challenge Code\n\n");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const alreadyDone = ch?.completed;
  const py = usePyRunner();

  const gen = async () => {
    setGenLoading(true);
    try {
      const lv = getLevel(user.xp);
      const resp = await callAI(apiKey,
        `Erstelle eine Python-Coding-Challenge (Daily Challenge) für heute.
Schüler-Level: ${lv.name} (${user.xp} XP), ${user.completed.length} Lektionen abgeschlossen.

Antworte EXAKT so:
TITEL: [kurzer, motivierender Titel]
SCHWIERIGKEIT: [Leicht/Mittel/Schwer]
AUFGABE: [klare Aufgabe in 3-4 Sätzen, konkret lösbar in Python]
TIPP: [ein hilfreicher Tipp ohne Lösung]`);
      const t = resp.match(/TITEL:\s*(.+)/)?.[1]?.trim() || "Python Challenge";
      const d = resp.match(/SCHWIERIGKEIT:\s*(.+)/)?.[1]?.trim() || "Mittel";
      const a = resp.match(/AUFGABE:\s*([\s\S]+?)(?:TIPP:|$)/i)?.[1]?.trim() || resp;
      const h = resp.match(/TIPP:\s*([\s\S]+?)$/i)?.[1]?.trim() || "";
      const newCh = {date:todayS, title:t, diff:d, task:a, hint:h, completed:false};
      setCh(newCh);
      onSaveChallenge(newCh);
    } catch (e) {
      setCh({date:todayS, title:"Fehler beim Generieren", diff:"-", task:`API-Fehler: ${e.message}. Geh zurück und versuch es nochmal.`, hint:"", completed:false});
    } finally { setGenLoading(false); }
  };

  useEffect(() => { if (!ch) gen(); }, []);

  const submit = async () => {
    setLoading(true); setResult(null);
    try {
      const resp = await callAI(apiKey, `Aufgabe: ${ch?.task}

Code des Schülers:
\`\`\`python
${code}
\`\`\`

Bewerte kurz: Erste Zeile EXAKT "BESTANDEN" oder "NICHT BESTANDEN", danach 1-2 Sätze Feedback.`);
      const up = resp.toUpperCase();
      const passed = up.includes("BESTANDEN") && !up.includes("NICHT BESTANDEN");
      setResult({passed, text:resp});
      if (passed && !alreadyDone) {
        const updated = {...ch, completed:true};
        setCh(updated);
        onSaveChallenge(updated);
        onXP(50);
      }
    } catch (e) { setResult({passed:false, text:e.message}); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:"#07070f",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{background:"#0f0f1e",borderBottom:"1px solid #1e1e3a",padding:"12px 16px"}}>
        <div style={{maxWidth:720,margin:"0 auto",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#6b7280",cursor:"pointer",fontSize:22,padding:"0 8px 0 0"}}>←</button>
          <div style={{flex:1}}>
            <div style={{color:"#a78bfa",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Daily Challenge</div>
            <div style={{color:"#e2e8f0",fontSize:16,fontWeight:700}}>⚡ Tägliche Herausforderung</div>
          </div>
          <div style={{background:"#1c1c35",borderRadius:20,padding:"4px 12px",color:"#f59e0b",fontWeight:700,fontSize:13}}>+50 XP</div>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"20px 16px"}}>
        {genLoading ? (
          <div style={{textAlign:"center",padding:60}}>
            <div style={{fontSize:40,marginBottom:12}}>⏳</div>
            <div style={{color:"#a78bfa",fontSize:15}}>Generiere deine heutige Challenge mit KI...</div>
          </div>
        ) : ch ? (
          <>
            <div style={{background:"linear-gradient(135deg,#1a1530,#2d1b69)",borderRadius:16,padding:20,marginBottom:16,border:"1px solid #4c1d9555"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{color:"#e2e8f0",fontWeight:800,fontSize:17}}>{ch.title}</div>
                <div style={{background:"#4c1d95",color:"#a78bfa",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700}}>{ch.diff}</div>
              </div>
              <p style={{color:"#cbd5e0",fontSize:14,lineHeight:1.8,margin:0}}>{ch.task}</p>
              {ch.hint && <div style={{marginTop:12,padding:"10px 14px",background:"#1e1530",borderRadius:8,color:"#8b5cf6",fontSize:13}}>💡 {ch.hint}</div>}
            </div>
            <CodeEditor value={code} onChange={setCode} height={260} />
            <OutputConsole output={py.out} error={py.err} running={py.running} status={py.status} onClear={py.clear} />
            <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
              <button onClick={()=>py.run(code)} disabled={py.running} className="hover-bright"
                style={{padding:13,background:py.running?"#1c1c35":"linear-gradient(135deg,#166534,#15803d)",border:"none",borderRadius:12,color:"white",fontSize:15,fontWeight:700,cursor:py.running?"not-allowed":"pointer"}}>
                {py.running ? "⏳ Läuft..." : "▶ Ausführen"}
              </button>
              <button onClick={submit} disabled={loading||alreadyDone} className="hover-bright"
                style={{padding:13,background:alreadyDone?"#1c1c35":loading?"#4b3b6b":"linear-gradient(135deg,#7c3aed,#6d28d9)",border:"none",borderRadius:12,color:alreadyDone?"#6b7280":"white",fontSize:15,fontWeight:700,cursor:alreadyDone?"not-allowed":"pointer"}}>
                {alreadyDone ? "✅ Gelöst!" : loading ? "Prüfe..." : "Einreichen ⚡"}
              </button>
            </div>
            {result && (
              <div style={{marginTop:12,background:result.passed?"#071209":"#120505",border:`1px solid ${result.passed?"#22c55e55":"#ef444455"}`,borderRadius:12,padding:"16px 18px"}}>
                <div style={{color:result.passed?"#22c55e":"#ef4444",fontWeight:700,marginBottom:8}}>{result.passed?"🎉 Challenge gelöst! +50 XP":"Weiter versuchen..."}</div>
                <p style={{color:"#cbd5e0",fontSize:14,margin:0,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{result.text}</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AI TUTOR SCREEN
══════════════════════════════════════════════════════════════ */
function TutorScreen({ user, apiKey, onBack }) {
  const [msgs, setMsgs] = useState([{
    role:"ai", text:`Hallo ${user.name}! 👋 Ich bin dein persönlicher Python-Tutor.

Frag mich alles – über Konzepte, deinen Code, Fehler oder Ideen. Ich helfe dir mit Erklärungen und Hinweisen, gebe aber keine fertigen Lösungen für deine Aufgaben.

Was möchtest du wissen?`
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs]);

  const send = async () => {
    const txt = input.trim(); if (!txt || loading) return;
    setInput(""); setMsgs(prev=>[...prev, {role:"user", text:txt}]); setLoading(true);
    try {
      const sys = `Du bist ein freundlicher, motivierender Python-Tutor. Der Schüler heißt ${user.name}, hat ${user.xp} XP und ${user.completed.length} abgeschlossene Lektionen.
Regeln:
- Erkläre klar und mit Beispielen
- Gib KEINE fertigen Lösungen für Aufgaben (gib Hinweise)
- Nutze Emojis um Spaß zu machen
- Antworte auf Deutsch, kompakt (max 4 Absätze)
- Nutze Code-Blöcke wenn du Code zeigst`;
      const history = msgs.map(m=>`${m.role==="user"?"Schüler":"Tutor"}: ${m.text}`).join("\n\n");
      const resp = await callAI(apiKey, `${history}\n\nSchüler: ${txt}`, sys);
      setMsgs(prev=>[...prev, {role:"ai", text:resp}]);
    } catch (e) {
      setMsgs(prev=>[...prev, {role:"ai", text:`Fehler: ${e.message}`}]);
    } finally { setLoading(false); }
  };

  const quickQ = ["Was ist der Unterschied zwischen = und ==?","Wie funktionieren Variablen genau?","Zeig mir ein Beispiel für eine for-Schleife","Wann nutze ich Liste vs. Dictionary?"];

  return (
    <div style={{height:"100vh",background:"#07070f",fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#0f0f1e",borderBottom:"1px solid #1e1e3a",padding:"12px 16px",flexShrink:0}}>
        <div style={{maxWidth:720,margin:"0 auto",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#6b7280",cursor:"pointer",fontSize:22,padding:"0 8px 0 0"}}>←</button>
          <div style={{fontSize:32}}>🤖</div>
          <div>
            <div style={{color:"#e2e8f0",fontWeight:700,fontSize:16}}>AI Python Tutor</div>
            <div style={{color:"#22c55e",fontSize:12}}>● Immer verfügbar</div>
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",maxWidth:720,width:"100%",margin:"0 auto",padding:16,boxSizing:"border-box"}}>
        {msgs.map((m, i) => (
          <div key={i} style={{marginBottom:16,display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
            {m.role==="ai" && <div style={{width:32,height:32,borderRadius:"50%",background:"#1c1c35",display:"flex",alignItems:"center",justifyContent:"center",marginRight:10,flexShrink:0,fontSize:16,alignSelf:"flex-end"}}>🤖</div>}
            <div style={{maxWidth:"80%",padding:"12px 16px",borderRadius:16,borderBottomRightRadius:m.role==="user"?4:16,borderBottomLeftRadius:m.role==="ai"?4:16,background:m.role==="user"?"#7c3aed":"#1c1c35",color:"#e2e8f0",fontSize:14,lineHeight:1.75,whiteSpace:"pre-wrap",overflowWrap:"break-word"}}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{display:"flex",marginBottom:16}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"#1c1c35",display:"flex",alignItems:"center",justifyContent:"center",marginRight:10,fontSize:16}}>🤖</div>
            <div style={{background:"#1c1c35",borderRadius:16,borderBottomLeftRadius:4,padding:"12px 18px",color:"#6b7280"}}>● ● ●</div>
          </div>
        )}
        {msgs.length === 1 && (
          <div style={{marginBottom:16}}>
            <div style={{color:"#4b5563",fontSize:12,marginBottom:10,textAlign:"center"}}>Schnellstart:</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {quickQ.map((q, i) => (
                <button key={i} onClick={()=>setInput(q)}
                  style={{padding:"10px 12px",background:"#111120",border:"1px solid #2a2a50",borderRadius:10,color:"#94a3b8",fontSize:13,cursor:"pointer",textAlign:"left",lineHeight:1.4}}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{padding:"12px 16px",borderTop:"1px solid #1e1e3a",background:"#0f0f1e",flexShrink:0}}>
        <div style={{maxWidth:720,margin:"0 auto",display:"flex",gap:10}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Frag mich etwas über Python..."
            style={{flex:1,padding:"12px 16px",background:"#1c1c35",border:"1px solid #2a2a50",borderRadius:12,color:"#e2e8f0",fontSize:14,outline:"none"}} />
          <button onClick={send} disabled={loading||!input.trim()}
            style={{padding:"12px 18px",background:input.trim()&&!loading?"#7c3aed":"#1c1c35",border:"none",borderRadius:12,color:input.trim()&&!loading?"white":"#4b5563",cursor:"pointer",fontWeight:700,fontSize:16,transition:"all 0.15s"}}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SETTINGS SCREEN
══════════════════════════════════════════════════════════════ */
function SettingsScreen({ user, onBack, onReset, onUpdateKey }) {
  const [newKey, setNewKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const saveKey = () => {
    if (!newKey.trim()) return;
    onUpdateKey(newKey.trim());
    setNewKey(""); setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  return (
    <div style={{minHeight:"100vh",background:"#07070f",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{background:"#0f0f1e",borderBottom:"1px solid #1e1e3a",padding:"12px 16px"}}>
        <div style={{maxWidth:720,margin:"0 auto",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#6b7280",cursor:"pointer",fontSize:22,padding:"0 8px 0 0"}}>←</button>
          <div style={{color:"#e2e8f0",fontWeight:700,fontSize:16}}>Einstellungen</div>
        </div>
      </div>
      <div style={{maxWidth:720,margin:"0 auto",padding:"20px 16px"}}>
        <div style={{background:"#111120",borderRadius:14,padding:20,marginBottom:14,border:"1px solid #2a2a50"}}>
          <div style={{color:"#94a3b8",fontSize:13,fontWeight:600,marginBottom:12}}>PROFIL</div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{color:"#6b7280"}}>Name</span>
            <span style={{color:"#e2e8f0",fontWeight:600}}>{user.name}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{color:"#6b7280"}}>XP</span>
            <span style={{color:"#a78bfa",fontWeight:600}}>{user.xp}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:"#6b7280"}}>Streak</span>
            <span style={{color:"#f59e0b",fontWeight:600}}>🔥 {user.streak}</span>
          </div>
        </div>
        <div style={{background:"#111120",borderRadius:14,padding:20,marginBottom:14,border:"1px solid #2a2a50"}}>
          <div style={{color:"#94a3b8",fontSize:13,fontWeight:600,marginBottom:12}}>API-KEY ÄNDERN</div>
          <input value={newKey} onChange={e=>setNewKey(e.target.value)} placeholder="Neuer Gemini API-Key..." type="password"
            style={{width:"100%",padding:"12px 14px",background:"#1c1c35",border:"1px solid #2a2a50",borderRadius:10,color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:10}}/>
          <button onClick={saveKey}
            style={{width:"100%",padding:12,background:saved?"#10b981":"#7c3aed",border:"none",borderRadius:10,color:"white",fontWeight:700,fontSize:14,cursor:"pointer"}}>
            {saved ? "✅ Gespeichert!" : "Key speichern"}
          </button>
        </div>
        <div style={{background:"#120505",borderRadius:14,padding:20,border:"1px solid #7f1d1d55"}}>
          <div style={{color:"#ef4444",fontSize:13,fontWeight:600,marginBottom:8}}>GEFAHRENZONE</div>
          <p style={{color:"#6b7280",fontSize:13,marginBottom:12,lineHeight:1.5}}>Fortschritt zurücksetzen löscht alle XP, abgeschlossene Lektionen und Streak.</p>
          {!confirmReset ? (
            <button onClick={()=>setConfirmReset(true)}
              style={{padding:"10px 18px",background:"#7f1d1d",border:"1px solid #ef444455",borderRadius:10,color:"#ef4444",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              Fortschritt zurücksetzen
            </button>
          ) : (
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{onReset(); setConfirmReset(false);}}
                style={{padding:"10px 18px",background:"#ef4444",border:"none",borderRadius:10,color:"white",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                Ja, wirklich löschen
              </button>
              <button onClick={()=>setConfirmReset(false)}
                style={{padding:"10px 18px",background:"#1c1c35",border:"1px solid #2a2a50",borderRadius:10,color:"#94a3b8",fontWeight:600,fontSize:14,cursor:"pointer"}}>
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PYTHON PLAYGROUND — echtes Python, KI-Assistent, Code teilen
══════════════════════════════════════════════════════════════ */
const PG_KEY = "pylearn_playground_v1";
const PG_DEFAULT = `# 🧪 Willkommen im Python Playground!
# Hier läuft ECHTES Python direkt in deinem Browser.
# Schreib was du willst und drück ▶ Ausführen.

name = input("Wie heißt du? ")
print(f"Hallo {name}! 🐍")

for i in range(3):
    print("Python ist", "super " * (i + 1))
`;

const b64encode = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_");
const b64decode = s => decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/"))));

/* Zerlegt KI-Antworten in Text- und Code-Segmente */
function splitCodeBlocks(text) {
  const parts = [];
  const re = /```(?:python|py)?\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type:"text", value:text.slice(last, m.index).trim() });
    parts.push({ type:"code", value:m[1].replace(/\n$/,"") });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type:"text", value:text.slice(last).trim() });
  return parts.filter(p => p.value);
}

function PlaygroundScreen({ user, apiKey, onBack }) {
  const [code, setCode] = useState(() => {
    try {
      const m = window.location.hash.match(/pg=([A-Za-z0-9_=-]+)/);
      if (m) return b64decode(m[1]);
    } catch {}
    try { const s = localStorage.getItem(PG_KEY); if (s) return s; } catch {}
    return PG_DEFAULT;
  });
  const py = usePyRunner();
  const [shareMsg, setShareMsg] = useState("");
  const [msgs, setMsgs] = useState([{ role:"ai", text:`Hi ${user.name}! 🧪 Ich bin dein Playground-Assistent.\n\nSag mir was du bauen willst – ich schreibe dir kompletten Python-Code, den du direkt in den Editor übernehmen kannst. Oder frag mich zu deinem aktuellen Code!` }]);
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { try { localStorage.setItem(PG_KEY, code); } catch {} }, [code]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs, aiLoading]);

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#pg=${b64encode(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("✅ Link kopiert!");
    } catch {
      window.prompt("Link zum Teilen kopieren:", url);
      setShareMsg("Link erstellt");
    }
    setTimeout(()=>setShareMsg(""), 2500);
  };

  const send = async () => {
    const txt = input.trim(); if (!txt || aiLoading) return;
    setInput(""); setMsgs(p=>[...p, { role:"user", text:txt }]); setAiLoading(true);
    try {
      const sys = `Du bist ein Python-Coding-Assistent in einem Browser-Playground. Der Nutzer heißt ${user.name}.
Regeln:
- Du DARFST und SOLLST kompletten, lauffähigen Python-Code schreiben wenn der Nutzer etwas bauen will
- Code IMMER in \`\`\`python Blöcken
- Der Code läuft via Pyodide im Browser: print() und input() funktionieren, KEINE Datei-/Netzwerkzugriffe, keine pip-Pakete außer Standard-Library
- Erkläre kurz was der Code macht (max 3 Sätze)
- Antworte auf Deutsch`;
      const history = msgs.slice(-8).map(m=>`${m.role==="user"?"Nutzer":"Assistent"}: ${m.text}`).join("\n\n");
      const resp = await callAI(apiKey, `${history}\n\nAktueller Code im Editor:\n\`\`\`python\n${code}\n\`\`\`\n\nNutzer: ${txt}`, sys);
      setMsgs(p=>[...p, { role:"ai", text:resp }]);
    } catch (e) {
      setMsgs(p=>[...p, { role:"ai", text:`Fehler: ${e.message}` }]);
    } finally { setAiLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:"#07070f",fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#0f0f1e",borderBottom:"1px solid #1e1e3a",padding:"12px 16px",flexShrink:0}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#6b7280",cursor:"pointer",fontSize:22,padding:"0 8px 0 0"}}>←</button>
          <div style={{flex:1}}>
            <div style={{color:"#4ade80",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Playground</div>
            <div style={{color:"#e2e8f0",fontSize:16,fontWeight:700}}>🧪 Python Playground</div>
          </div>
          {shareMsg && <span className="anim-pop" style={{color:"#4ade80",fontSize:13,fontWeight:600}}>{shareMsg}</span>}
          <button onClick={share} className="hover-bright"
            style={{padding:"9px 16px",background:"#1c1c35",border:"1px solid #3d3d65",borderRadius:10,color:"#a78bfa",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            🔗 Teilen
          </button>
        </div>
      </div>

      <div className="pg-layout" style={{flex:1,display:"flex",gap:14,maxWidth:1200,width:"100%",margin:"0 auto",padding:16,boxSizing:"border-box",alignItems:"stretch"}}>
        {/* Editor + Konsole */}
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{color:"#4b5563",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>Editor</span>
            <button onClick={()=>setCode(PG_DEFAULT)} style={{background:"none",border:"none",color:"#4b5563",fontSize:11,cursor:"pointer"}}>↺ zurücksetzen</button>
          </div>
          <CodeEditor value={code} onChange={setCode} height={380} />
          <button onClick={()=>py.run(code)} disabled={py.running} className="hover-bright"
            style={{marginTop:12,padding:13,background:py.running?"#1c1c35":"linear-gradient(135deg,#166534,#15803d)",border:"none",borderRadius:12,color:"white",fontSize:15,fontWeight:700,cursor:py.running?"not-allowed":"pointer"}}>
            {py.running ? <><span className="spin">⏳</span> {py.status || "Läuft..."}</> : "▶ Ausführen"}
          </button>
          <OutputConsole output={py.out} error={py.err} running={py.running} status={py.status} onClear={py.clear} />
        </div>

        {/* KI-Chat */}
        <div className="pg-chat" style={{width:360,maxWidth:"40%",flexShrink:0,display:"flex",flexDirection:"column",background:"#0d0d1c",border:"1px solid #1e1e3a",borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #1e1e3a",color:"#a78bfa",fontWeight:700,fontSize:13,flexShrink:0}}>🤖 KI-Assistent</div>
          <div style={{flex:1,overflowY:"auto",padding:12,minHeight:200,maxHeight:460}}>
            {msgs.map((m, i) => (
              <div key={i} className="anim-fadeIn" style={{marginBottom:12}}>
                {m.role === "user" ? (
                  <div style={{background:"#7c3aed",borderRadius:12,borderBottomRightRadius:4,padding:"9px 12px",color:"#fff",fontSize:13,lineHeight:1.6,marginLeft:30,whiteSpace:"pre-wrap",overflowWrap:"break-word"}}>{m.text}</div>
                ) : (
                  <div style={{marginRight:14}}>
                    {splitCodeBlocks(m.text).map((seg, si) => seg.type === "text" ? (
                      <div key={si} style={{background:"#1c1c35",borderRadius:12,borderBottomLeftRadius:4,padding:"9px 12px",color:"#cbd5e0",fontSize:13,lineHeight:1.6,marginBottom:6,whiteSpace:"pre-wrap",overflowWrap:"break-word"}}>{seg.value}</div>
                    ) : (
                      <div key={si} style={{marginBottom:6,border:"1px solid #2d2d50",borderRadius:10,overflow:"hidden"}}>
                        <pre style={{margin:0,padding:"10px 12px",background:"#0a0a18",fontSize:12,lineHeight:1.55,fontFamily:"'Fira Code',Consolas,monospace",color:"#d4d4d4",overflowX:"auto"}}
                          dangerouslySetInnerHTML={{__html: pyHL(seg.value)}} />
                        <button onClick={()=>setCode(seg.value)} className="hover-bright"
                          style={{display:"block",width:"100%",padding:"7px 10px",background:"#15803d",border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                          ⤵ In Editor übernehmen
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {aiLoading && <div style={{color:"#6b7280",fontSize:13}}><span className="spin">⏳</span> schreibt...</div>}
            <div ref={bottomRef} />
          </div>
          <div style={{padding:10,borderTop:"1px solid #1e1e3a",display:"flex",gap:8,flexShrink:0}}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Was soll ich bauen?"
              style={{flex:1,padding:"10px 12px",background:"#1c1c35",border:"1px solid #2a2a50",borderRadius:10,color:"#e2e8f0",fontSize:13,outline:"none",minWidth:0}} />
            <button onClick={send} disabled={aiLoading||!input.trim()} className="hover-bright"
              style={{padding:"10px 14px",background:input.trim()&&!aiLoading?"#7c3aed":"#1c1c35",border:"none",borderRadius:10,color:input.trim()&&!aiLoading?"white":"#4b5563",cursor:"pointer",fontWeight:700,fontSize:14}}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════════ */
/* Nächste Lektion im Lernpfad finden (innerhalb Kurs → Abschlusstest → nächster Kurs) */
function findNextLesson(course, lesson) {
  const ci = COURSES.findIndex(c => c.id === course.id);
  if (ci === -1) return null;
  if (lesson.isTest) {
    const next = COURSES[ci + 1];
    return next ? { course: next, lesson: next.lessons[0] } : null;
  }
  const li = COURSES[ci].lessons.findIndex(l => l.id === lesson.id);
  if (li < COURSES[ci].lessons.length - 1) {
    return { course: COURSES[ci], lesson: COURSES[ci].lessons[li + 1] };
  }
  return { course: COURSES[ci], lesson: { ...COURSES[ci].finalTest, isTest: true } };
}

export default function App() {
  const [data, setData] = useState(null);          // null = lädt noch
  const [view, setView] = useState(() => window.location.hash.includes("pg=") ? "playground" : "home");
  const [selLesson, setSelLesson] = useState(null);
  const [selCourse, setSelCourse] = useState(null);

  // Initial laden + Streak-Check
  useEffect(() => {
    (async () => {
      let d = await loadPersisted();
      if (d.userName) {
        const t = today();
        if (d.lastDay !== t) {
          const y = new Date(); y.setDate(y.getDate() - 1);
          const yStr = y.toISOString().slice(0, 10);
          d = {...d, lastDay: t, streak: d.lastDay === yStr ? (d.streak||0) + 1 : 1};
          persist(d);
        }
      }
      setData(d);
    })();
  }, []);

  const update = patch => {
    setData(prev => {
      const next = {...prev, ...patch};
      persist(next);
      return next;
    });
  };

  if (data === null) {
    return (
      <div style={{minHeight:"100vh",background:"#07070f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:12}}>🐍</div>
          <div style={{color:"#6b7280",fontSize:14}}>Lade deinen Fortschritt...</div>
        </div>
      </div>
    );
  }

  if (!data.userName || !data.apiKey) {
    return <SetupScreen initKey={data.apiKey}
      onDone={(name, key) => update({userName:name, apiKey:key, xp:data.xp||0, streak:data.streak||1, lastDay:today(), completed:data.completed||[]})} />;
  }

  const user = {
    name: data.userName,
    xp: data.xp || 0,
    streak: data.streak || 0,
    completed: data.completed || []
  };

  const addXP = amount => update({xp: (data.xp||0) + amount});
  const completeLesson = (id, xp) => update({
    completed: [...new Set([...(data.completed||[]), id])],
    xp: (data.xp||0) + xp
  });

  if (view === "settings") {
    return <SettingsScreen user={user} onBack={()=>setView("home")}
      onUpdateKey={key=>update({apiKey:key})}
      onReset={()=>{update({xp:0, streak:0, lastDay:today(), completed:[], challenge:null}); setView("home");}} />;
  }

  if (view === "tutor") {
    return <TutorScreen user={user} apiKey={data.apiKey} onBack={()=>setView("home")} />;
  }

  if (view === "challenge") {
    return <ChallengeScreen user={user} apiKey={data.apiKey}
      challenge={data.challenge}
      onSaveChallenge={ch=>update({challenge:ch})}
      onBack={()=>setView("home")} onXP={addXP} />;
  }

  if (view === "playground") {
    return <PlaygroundScreen user={user} apiKey={data.apiKey} onBack={()=>setView("home")} />;
  }

  if (view === "lesson" && selLesson && selCourse) {
    const next = findNextLesson(selCourse, selLesson);
    const goNext = next ? () => { setSelCourse(next.course); setSelLesson(next.lesson); } : null;
    return <LessonScreen key={selLesson.id} lesson={selLesson} course={selCourse} user={user} apiKey={data.apiKey}
      onBack={()=>setView("home")} onComplete={completeLesson}
      onNext={goNext}
      onSkip={() => {
        // Überspringen: als erledigt markieren, aber ohne XP
        update({ completed: [...new Set([...(data.completed||[]), selLesson.id])] });
        if (goNext) goNext(); else setView("home");
      }} />;
  }

  return (
    <HomeScreen user={user} challenge={data.challenge}
      onLesson={(course, lesson)=>{setSelCourse(course); setSelLesson(lesson); setView("lesson");}}
      onChallenge={()=>setView("challenge")}
      onTutor={()=>setView("tutor")}
      onPlayground={()=>setView("playground")}
      onSettings={()=>setView("settings")} />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<><GlobalStyle /><App /></>);

import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

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
   LEVELS
══════════════════════════════════════════════════════════════ */
const LEVELS = [
  [0,"Neuling","⚪"],[100,"Anfänger","🟢"],[300,"Lernender","🔵"],
  [600,"Coder","🟣"],[1000,"Entwickler","🟠"],[1500,"Senior","🔴"],[2500,"Python-Meister","⭐"]
];
function getLevel(xp) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l[0]) cur = l;
  const idx = LEVELS.indexOf(cur);
  const nxt = LEVELS[Math.min(idx + 1, LEVELS.length - 1)];
  const pct = idx >= LEVELS.length - 1 ? 100 : Math.min(100, ((xp - cur[0]) / (nxt[0] - cur[0])) * 100);
  return { name: cur[1], icon: cur[2], nextXP: nxt[0], pct };
}

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
   KURSDATEN — 19 Lektionen + 3 Abschlusstests
══════════════════════════════════════════════════════════════ */
const COURSES = [
  {
    id:"beginner", emoji:"🟢", title:"Python Beginner", subtitle:"Die Werkzeuge",
    color:"#22c55e", border:"#14532d", bg:"#071209",
    lessons:[
      {
        id:"b1", num:1, title:"Deine erste Nachricht", sub:"print() & Kommentare",
        story:"🚀 Du bist Astronaut auf dem Mars. Dein Terminal ist die einzige Verbindung zur Erde. Mit jedem print()-Befehl sendest du eine Nachricht ans Kontrollzentrum. Was schickst du als erstes?",
        theory:`## Was ist Code?
Code ist eine Serie von Anweisungen, die ein Computer Zeile für Zeile ausführt – von oben nach unten.

## print()
Der wichtigste Grundbefehl – gibt Daten auf dem Bildschirm aus:
\`\`\`
print("Hallo Welt!")    # Text in Anführungszeichen
print(42)               # Zahlen direkt
print("Alter:", 25)     # Mehrere Werte mit Komma
\`\`\`

## Kommentare mit #
Alles nach # wird von Python **ignoriert**. Kommentare erklären deinen Code:
\`\`\`
# Das ist ein Kommentar
print("Hallo")   # Inline-Kommentar
\`\`\``,
        example:`# Meine erste Python-Nachricht
# Kommentare werden von Python ignoriert

print("Hallo Erde!")
print("Ich bin auf dem Mars angekommen!")
print("Status: Alle Systeme normal 🚀")
print("Tag:", 1, "Temperatur:", -60, "Grad")`,
        task:"Schreibe ein Programm das mit print() ausgibt: deinen Namen, dein Alter, dein Lieblingsessen. Füge mindestens 2 Kommentare hinzu.",
        xp:20, tags:["print()","#","Grundlagen"]
      },
      {
        id:"b2", num:2, title:"Magische Daten-Boxen", sub:"Variablen & Datentypen",
        story:"🧙 Du bist Zauberlehrling. Variablen sind deine magischen Boxen – jede hat einen Namen und du kannst Daten reinlegen. Python erkennt automatisch ob es Text, Zahl oder Wahrheitswert ist.",
        theory:`## Variablen
Daten im Speicher ablegen – Python erkennt den Typ automatisch:
\`\`\`
name = "Alex"       # String (Text) – in Anführungszeichen
alter = 25          # Integer (ganze Zahl)
groesse = 1.84      # Float (Kommazahl, Punkt statt Komma!)
ist_cool = True     # Boolean (True oder False)
\`\`\`

## Variablen nutzen und ändern
\`\`\`
alter = 25
print(alter)    # 25
alter = 26      # Überschreiben geht jederzeit
print(alter)    # 26
\`\`\`
**Regeln:** Keine Leerzeichen im Namen, nicht mit Zahl beginnen.`,
        example:`name = "Luna"
alter = 17
groesse = 1.65
lieblingsfilm = "Inception"

print(name)
print(alter)
print(groesse)
print(lieblingsfilm)

# Variablen ändern
alter = 18
print("Jetzt:", alter)`,
        task:"Erstelle Variablen für: deinen Namen, dein Alter, deine Stadt, deine Lieblingszahl (als Float). Gib alle 4 Variablen mit print() aus.",
        xp:20, tags:["Variablen","String","Integer","Float","Boolean"]
      },
      {
        id:"b3", num:3, title:"Der Taschenrechner", sub:"Operatoren & Rechnen",
        story:"🔢 Als Raumfahrtingenieur musst du ständig rechnen – Treibstoff, Distanzen, Temperaturen. Python ist dein Supertaschenrechner, und Modulo (%) ist dein geheimes Werkzeug.",
        theory:`## Rechenoperatoren
\`\`\`
10 + 3    # 13  Addition
10 - 3    # 7   Subtraktion
10 * 3    # 30  Multiplikation
10 / 3    # 3.33 Division (immer Float!)
10 // 3   # 3   Ganzzahldivision
10 % 3    # 1   Modulo (Restwert!) ⭐
10 ** 2   # 100 Potenz
\`\`\`

## Modulo – dein Superoperator
\`\`\`
17 % 2   # = 1 → ungerade
16 % 2   # = 0 → gerade
\`\`\`

## Kurzformen
\`\`\`
x = 10
x += 5   # x = 15
x *= 2   # x = 30
\`\`\``,
        example:`preis = 100
rabatt = 20

endpreis = preis - rabatt
mwst = endpreis * 0.19
gesamt = endpreis + mwst

print("Endpreis:", endpreis, "€")
print("MwSt:", mwst, "€")
print("Gesamt:", gesamt, "€")

zahl = 17
print("Gerade?", zahl % 2 == 0)`,
        task:"Berechne: Du kaufst 3 Produkte (eigene Preise als Variablen). Berechne Gesamtpreis, 15% Rabatt darauf, und finalen Preis. Gib alles übersichtlich aus.",
        xp:20, tags:["+","-","*","/","%","**","+="]
      },
      {
        id:"b4", num:4, title:"Sprich mit dem User", sub:"Input & Type Casting",
        story:"💬 Dein Programm wartet im Dunkeln – bis der Benutzer etwas eingibt. input() erweckt es zum Leben. Aber Vorsicht: alles kommt als Text zurück, auch Zahlen!",
        theory:`## input()
Wartet auf Eingabe des Benutzers:
\`\`\`
name = input("Wie heißt du? ")
print("Hallo,", name)
\`\`\`

## ⚠️ Type Casting – sehr wichtig!
input() gibt IMMER einen String zurück. Für Berechnungen umwandeln:
\`\`\`
alter = int(input("Dein Alter? "))       # → Integer
groesse = float(input("Deine Größe? "))  # → Float

# int() = ganze Zahl
# float() = Kommazahl
# str() = Text
\`\`\``,
        example:`name = input("Wie heißt du? ")
alter = int(input("Wie alt bist du? "))

geburtsjahr = 2025 - alter

print("Hallo", name + "!")
print("Geburtsjahr:", geburtsjahr)
print("In 10 Jahren:", alter + 10, "Jahre alt")`,
        task:"Frage den User nach: Namen, Alter, Geburtsstadt. Berechne Geburtsjahr und Alter im Jahr 2050. Gib alles personalisiert aus.",
        xp:20, tags:["input()","int()","float()","str()","Type Casting"]
      },
      {
        id:"b5", num:5, title:"Entscheidungen treffen", sub:"If / elif / else",
        story:"🎮 Dein Programm muss selbst denken. Wie ein Türwächter: Wer darf rein? Wer nicht? If-Statements sind das Gehirn deines Codes – sie treffen Entscheidungen.",
        theory:`## If-Statements
\`\`\`
if bedingung:
    # code wenn True
elif andere_bedingung:
    # code wenn erste False, zweite True
else:
    # code wenn alles False
\`\`\`

## Vergleichsoperatoren
\`\`\`
==  gleich?      !=  ungleich?
>   größer?      <   kleiner?
>=  größer-gleich?   <=  kleiner-gleich?
\`\`\`

## Logische Operatoren
\`\`\`
if alter >= 18 and hat_ausweis:
    print("Rein!")
if regen or kalt:
    print("Jacke an!")
\`\`\``,
        example:`punkte = int(input("Deine Punkte: "))

if punkte >= 90:
    print("Note: A - Ausgezeichnet! 🏆")
elif punkte >= 80:
    print("Note: B - Sehr gut!")
elif punkte >= 70:
    print("Note: C - Gut")
elif punkte >= 60:
    print("Note: D - Ausreichend")
else:
    print("Note: F - Nicht bestanden")`,
        task:"Baue einen Passwort-Checker: Setze ein 'richtiges' Passwort als Variable. Frage den User danach. Reagiere auf: richtiges Passwort ('Willkommen!'), falsches Passwort ('Zugang verweigert!'), leeres Passwort ('Kein Passwort eingegeben!').",
        xp:25, tags:["if","elif","else","and","or","==","!="]
      },
      {
        id:"b6", num:6, title:"Text-Magie", sub:"String-Methoden & f-Strings",
        story:"✨ Strings sind keine passiven Textblöcke – sie sind Objekte mit Superkräften. Du kannst sie transformieren, analysieren, zerschneiden. Und f-Strings sind das eleganteste Feature von Python.",
        theory:`## String-Methoden
\`\`\`
text = "Hallo Python"
text.upper()              # "HALLO PYTHON"
text.lower()              # "hallo python"
text.title()              # "Hallo Python"
text.replace("o", "0")    # "Hall0 Pyth0n"
len(text)                 # 12
text.strip()              # Leerzeichen entfernen
\`\`\`

## f-Strings ⭐ Die moderne Methode
\`\`\`
name = "Max"
alter = 20
print(f"Hallo {name}! Du bist {alter} Jahre alt.")
print(f"In 5 Jahren: {alter + 5}")
\`\`\``,
        example:`vorname = input("Vorname: ")
nachname = input("Nachname: ")

vollname = vorname + " " + nachname
email = f"{vorname.lower()}.{nachname.lower()}@code.de"

print(f"\\nHallo, {vollname.title()}!")
print(f"E-Mail: {email}")
print(f"Namenslänge: {len(vollname)} Zeichen")
print(f"GROSSBUCHSTABEN: {vollname.upper()}")`,
        task:"Name-Formatter: Input Vor- und Nachname. Output mit f-Strings: (1) GROSSBUCHSTABEN, (2) kleinbuchstaben, (3) generierte E-Mail vorname.nachname@python.de, (4) Gesamtlänge beider Namen zusammen.",
        xp:25, tags:["f-Strings","upper()","lower()","len()","replace()"]
      }
    ],
    finalTest:{
      id:"bt", title:"Text-Adventure Generator",
      desc:`Programmiere ein kleines Text-Rollenspiel!

Das Programm muss:
✓ Namen des Spielers per input() abfragen
✓ Lebenspunkte mit Berechnung setzen
✓ Mindestens 3 Entscheidungen mit if/elif/else anbieten
✓ Auf falsche Eingaben reagieren
✓ f-Strings für saubere Ausgaben nutzen

Geprüft wird: input(), if/elif/else, Variablen, Rechnen, f-Strings`,
      xp:100, diff:"Beginner"
    }
  },
  {
    id:"intermediate", emoji:"🟡", title:"Python Intermediate", subtitle:"Datenkontrolle",
    color:"#eab308", border:"#713f12", bg:"#120e00",
    lessons:[
      {
        id:"i1", num:7, title:"Die unermüdliche Maschine", sub:"While-Schleifen",
        story:"⚙️ Du programmierst einen Roboter, der nicht aufhört – bis du STOP sagst. While-Schleifen laufen endlos weiter, solange eine Bedingung wahr ist.",
        theory:`## While-Schleife
\`\`\`
while bedingung:
    # Wird wiederholt solange True
\`\`\`

## Endlosschleife mit break
\`\`\`
while True:
    eingabe = input("Befehl: ")
    if eingabe == "stop":
        break     # Schleife beenden
    if eingabe == "skip":
        continue  # Diese Runde überspringen
    print("Du sagtest:", eingabe)
\`\`\`
**break** beendet die Schleife. **continue** springt zur nächsten Iteration.`,
        example:`geheimzahl = 42
versuche = 0

while True:
    tipp = int(input("Rate (1-100): "))
    versuche += 1

    if tipp < geheimzahl:
        print("Zu klein! ⬆️")
    elif tipp > geheimzahl:
        print("Zu groß! ⬇️")
    else:
        print(f"Richtig! {versuche} Versuche 🎉")
        break`,
        task:"Baue einen Countdown: Frage nach einer positiven Startzahl. Zähle mit while runter bis 0. Verhindere negative Eingaben. Gib am Ende 'Starten! 🚀' aus.",
        xp:25, tags:["while","break","continue","Schleife"]
      },
      {
        id:"i2", num:8, title:"Die Schatzkiste", sub:"Listen (Lists)",
        story:"🎒 Dein Rucksack kann viele Dinge tragen – in einer Reihenfolge. Genau so funktionieren Listen. Hinzufügen, löschen, sortieren, indexieren.",
        theory:`## Listen erstellen
\`\`\`
früchte = ["Apfel", "Banane", "Cherry"]
früchte.append("Mango")     # Hinzufügen
früchte.remove("Banane")    # Löschen
früchte.sort()              # Alphabetisch sortieren
len(früchte)                # Anzahl der Elemente
\`\`\`

## Indexing
\`\`\`
früchte[0]   # Erstes Element (Index beginnt bei 0!)
früchte[-1]  # Letztes Element
früchte[1:3] # Elemente 1 und 2 (Slicing)
\`\`\`

## Prüfen
\`\`\`
"Apfel" in früchte   # True/False
\`\`\``,
        example:`einkaufsliste = []

while True:
    item = input("Item (oder 'fertig'): ")
    if item == "fertig":
        break
    einkaufsliste.append(item)

print("\\nDeine Liste:")
einkaufsliste.sort()
for i, item in enumerate(einkaufsliste):
    print(f"{i+1}. {item}")
print(f"Insgesamt: {len(einkaufsliste)} Items")`,
        task:"Top-5 Lieblingsfilme: Lass User 5 Filme eingeben. Speichere in Liste. Sortiere alphabetisch. Zeige nummeriert. Lass dann einen Film per Eingabe löschen.",
        xp:25, tags:["list","append()","remove()","sort()","len()"]
      },
      {
        id:"i3", num:9, title:"Der Reiseführer", sub:"For-Schleifen & range()",
        story:"🗺️ Du planst eine Weltreise und willst jeden Ort besuchen. Die For-Schleife ist dein Reiseplan – systematisch, jeden Stop, keinen vergessen.",
        theory:`## For-Schleife über Liste
\`\`\`
städte = ["Berlin", "Paris", "Tokyo"]
for stadt in städte:
    print(f"Nächster Stopp: {stadt}")
\`\`\`

## range() für Zahlen
\`\`\`
for i in range(5):          # 0, 1, 2, 3, 4
for i in range(1, 11):      # 1 bis 10
for i in range(0, 10, 2):   # 0, 2, 4, 6, 8
\`\`\`

## enumerate für Index + Wert
\`\`\`
for i, item in enumerate(liste):
    print(f"{i}: {item}")
\`\`\``,
        example:`noten = [2, 1, 3, 2, 1, 4]
summe = 0
beste = noten[0]

for note in noten:
    summe += note
    if note < beste:
        beste = note

durchschnitt = summe / len(noten)
print(f"Durchschnitt: {durchschnitt:.1f}")
print(f"Beste Note: {beste}")`,
        task:"Notenrechner: Liste mit 5 selbst gewählten Noten. Berechne mit for-Schleife: Durchschnitt, beste Note, schlechteste Note, Anzahl der Noten unter 3.",
        xp:25, tags:["for","range()","enumerate()","in"]
      },
      {
        id:"i4", num:10, title:"Das Telefonbuch", sub:"Dictionaries",
        story:"📞 Ein Telefonbuch ordnet Namen Nummern zu. Dictionaries tun genau das – du suchst mit einem Schlüssel und bekommst den Wert. Perfekt für strukturierte Daten.",
        theory:`## Dictionary erstellen
\`\`\`
person = {
    "name": "Alex",
    "alter": 25,
    "stadt": "Berlin"
}
\`\`\`

## Zugreifen und ändern
\`\`\`
person["name"]            # "Alex" lesen
person["job"] = "Coder"   # Neu hinzufügen
person["alter"] = 26      # Ändern
del person["stadt"]       # Löschen
"name" in person          # True/False prüfen
\`\`\`

## Durchlaufen
\`\`\`
for key, value in person.items():
    print(f"{key}: {value}")
\`\`\``,
        example:`kontakte = {}

while True:
    aktion = input("(a)dden (s)uchen (b)eenden: ")
    if aktion == "b": break
    elif aktion == "a":
        name = input("Name: ")
        nummer = input("Nummer: ")
        kontakte[name] = nummer
        print(f"✅ {name} gespeichert!")
    elif aktion == "s":
        name = input("Suchen: ")
        if name in kontakte:
            print(f"📞 {kontakte[name]}")
        else:
            print("❌ Nicht gefunden")`,
        task:"Produkt-Inventar: Dict mit 5 Produkten (Name: Preis). Lass User Produkte suchen. Berechne Durchschnittspreis aller Produkte mit einer for-Schleife.",
        xp:30, tags:["dict","key","value",".items()","in"]
      },
      {
        id:"i5", num:11, title:"Spezial-Sammlungen", sub:"Tuples & Sets",
        story:"🔒 Manchmal sind Daten heilig und dürfen nicht verändert werden. Manchmal brauchst du nur einzigartige Werte. Tuples und Sets lösen genau das.",
        theory:`## Tuples – unveränderlich
\`\`\`
koordinaten = (52.5, 13.4)     # Kann nicht geändert werden!
x, y = koordinaten              # Unpacking!
wochentage = ("Mo","Di","Mi","Do","Fr")
\`\`\`

## Sets – keine Duplikate
\`\`\`
besucher = {"Alex", "Ben", "Alex", "Clara"}
# → {"Alex", "Ben", "Clara"}  Duplikat weg!

set1 = {1, 2, 3}
set2 = {2, 3, 4}
set1 & set2   # Schnittmenge: {2, 3}
set1 | set2   # Vereinigung: {1, 2, 3, 4}
\`\`\``,
        example:`# Tuple: GPS (unveränderlich)
berlin = (52.52, 13.41)
lat, lon = berlin
print(f"Berlin: {lat}°N, {lon}°E")

# Set: Einzigartige Besucher
log = ["Alice","Bob","Alice","Charlie","Bob"]
einzigartig = set(log)
print(f"Besuche: {len(log)}")
print(f"Unique: {len(einzigartig)}")`,
        task:"Wort-Analyzer: Nimm einen Satz per input(). Speichere alle Wörter als Liste (text.split()). Konvertiere zu Set. Gib aus: Wörter total vs. einzigartige Wörter und welche Wörter doppelt waren.",
        xp:25, tags:["tuple","set","immutable","Duplikate"]
      },
      {
        id:"i6", num:12, title:"Baupläne für Code", sub:"Eigene Funktionen (def)",
        story:"🏗️ Gute Programmierer wiederholen sich nie. Funktionen sind deine Baupläne – einmal schreiben, überall nutzen. Das ist der Kern von professionellem Code.",
        theory:`## Funktionen definieren
\`\`\`
def begruessen(name, sprache="de"):
    if sprache == "de":
        return f"Hallo, {name}!"
    return f"Hello, {name}!"

# Aufrufen:
print(begruessen("Alex"))
print(begruessen("Alex", "en"))
\`\`\`

## return
Gibt Wert zurück. Ohne return: None.
\`\`\`
def addieren(a, b):
    return a + b

summe = addieren(5, 3)  # 8
\`\`\`
Default-Werte für Parameter mit **=**.`,
        example:`def ist_prim(n):
    if n < 2: return False
    for i in range(2, int(n**0.5)+1):
        if n % i == 0: return False
    return True

def primzahlen_bis(limit):
    return [x for x in range(2, limit+1) if ist_prim(x)]

n = int(input("Primzahlen bis: "))
primzahlen = primzahlen_bis(n)
print(f"Primzahlen bis {n}: {primzahlen}")
print(f"Anzahl: {len(primzahlen)}")`,
        task:"Schreibe 3 Funktionen: (1) berechne_mwst(preis, satz=0.19) → gibt Nettopreis + MwSt aus, (2) celsius_zu_fahrenheit(grad) → Umrechnung, (3) ist_gerade(zahl) → True/False. Teste alle drei.",
        xp:35, tags:["def","return","parameter","default"]
      }
    ],
    finalTest:{
      id:"it", title:"Das digitale Haushaltsbuch",
      desc:`Baue ein Einnahmen/Ausgaben-System!

Das Programm muss:
✓ In einer Schleife laufen bis "beenden"
✓ Einnahmen und Ausgaben speichern (Listen oder Dicts)
✓ Einträge hinzufügen können
✓ Eine eigene Funktion den Kontostand berechnen
✓ Warnung ausgeben wenn im Minus

Geprüft wird: while, for, Lists/Dicts, def, return`,
      xp:150, diff:"Intermediate"
    }
  },
  {
    id:"pro", emoji:"🔴", title:"Python Profi", subtitle:"Struktur & Dateihandling",
    color:"#ef4444", border:"#7f1d1d", bg:"#120505",
    lessons:[
      {
        id:"p1", num:13, title:"Crash-sichere Programme", sub:"Try / Except",
        story:"🛡️ Ein Programm das beim ersten Fehler abstürzt ist unbrauchbar. try/except ist deine Schutzrüstung – fange Fehler ab bevor sie alles zerstören.",
        theory:`## Try / Except
\`\`\`
try:
    zahl = int(input("Zahl: "))
    print(10 / zahl)
except ValueError:
    print("Das ist keine Zahl!")
except ZeroDivisionError:
    print("Nicht durch 0 teilen!")
except Exception as e:
    print(f"Fehler: {e}")
finally:
    print("Wird IMMER ausgeführt")
\`\`\`
**ValueError** = falscher Typ. **ZeroDivisionError** = durch 0. **finally** läuft immer.`,
        example:`def sichere_eingabe(prompt, typ=int):
    while True:
        try:
            return typ(input(prompt))
        except ValueError:
            print("❌ Ungültige Eingabe!")

alter = sichere_eingabe("Alter: ")
groesse = sichere_eingabe("Größe: ", float)
print(f"Alter: {alter}, Größe: {groesse}m")`,
        task:"Sicherer Taschenrechner: Frage nach 2 Zahlen und Operation (+,-,*,/). Fange alle Fehler ab: keine Zahlen, Division durch 0, unbekannte Operation. Zeige immer eine sinnvolle Fehlermeldung.",
        xp:30, tags:["try","except","finally","ValueError"]
      },
      {
        id:"p2", num:14, title:"Daten überleben alles", sub:"File Handling",
        story:"💾 Daten im RAM verschwinden wenn das Programm schließt. Files leben ewig. Lerne wie du Daten persistent speicherst und wieder lädst.",
        theory:`## Dateien schreiben und lesen
\`\`\`
# Schreiben (überschreibt):
with open("datei.txt", "w") as f:
    f.write("Hallo\\n")

# Anhängen:
with open("datei.txt", "a") as f:
    f.write("Neue Zeile\\n")

# Lesen:
with open("datei.txt", "r") as f:
    inhalt = f.read()
    zeilen = f.readlines()  # Liste
\`\`\`
Immer **with** verwenden – schließt die Datei automatisch!`,
        example:`def speichern(text):
    with open("notizen.txt", "a") as f:
        f.write(text + "\\n")

def lesen():
    try:
        with open("notizen.txt", "r") as f:
            return f.readlines()
    except FileNotFoundError:
        return []

while True:
    cmd = input("(s)chreiben (l)esen (b)eenden: ")
    if cmd == "b": break
    elif cmd == "s": speichern(input("Text: "))
    elif cmd == "l":
        for z in lesen(): print(z.strip())`,
        task:"Highscore-System: Speichere Name+Punkte in einer Textdatei. Beim Start alle bestehenden Scores laden und zeigen. Neuen Score hinzufügen. Besten Score hervorheben.",
        xp:30, tags:["open()","write()","read()","with"]
      },
      {
        id:"p3", num:15, title:"Die Sprache des Internets", sub:"JSON",
        story:"🌐 JSON ist das universelle Datenformat. APIs, Apps, Datenbanken – alle reden JSON. Lerne es und du verstehst die Sprache der modernen Software.",
        theory:`## JSON – Dictionaries als Datei
\`\`\`
import json

# Dict → JSON-Datei speichern:
daten = {"name": "Alex", "punkte": [10, 20]}
with open("daten.json", "w") as f:
    json.dump(daten, f, indent=2)

# JSON-Datei → Dict laden:
with open("daten.json", "r") as f:
    geladen = json.load(f)

print(geladen["name"])  # Alex
\`\`\`
**indent=2** macht die JSON-Datei lesbar für Menschen.`,
        example:`import json

DATEI = "nutzer.json"

def laden():
    try:
        with open(DATEI) as f: return json.load(f)
    except FileNotFoundError: return {}

def speichern(d):
    with open(DATEI, "w") as f: json.dump(d, f, indent=2)

nutzer = laden()
name = input("Name: ")
punkte = int(input("Punkte: "))
nutzer[name] = {"punkte": punkte}
speichern(nutzer)
print("✅ Gespeichert!")`,
        task:"JSON-Kontaktmanager: Lade Kontakte aus contacts.json (falls vorhanden). Neue Kontakte hinzufügen (Name, Email, Telefon). Kontakt per Name suchen. Alle Änderungen zurück in JSON speichern.",
        xp:35, tags:["json","json.dump()","json.load()","import"]
      },
      {
        id:"p4", num:16, title:"Baupläne für Objekte", sub:"OOP – Klassen",
        story:"🏭 Du bist kein Programmierer mehr – du bist Architekt. Klassen sind deine Baupläne, Objekte die erschaffenen Dinge. Das ist objektorientiertes Denken.",
        theory:`## Klassen definieren
\`\`\`
class Auto:
    def __init__(self, marke, ps):   # Konstruktor
        self.marke = marke            # Attribut
        self.ps = ps
        self.km = 0

    def fahren(self, kilometer):     # Methode
        self.km += kilometer

    def __str__(self):               # String-Darstellung
        return f"{self.marke} ({self.km}km)"

mein_auto = Auto("Tesla", 400)
mein_auto.fahren(100)
print(mein_auto)
\`\`\``,
        example:`class BankKonto:
    def __init__(self, inhaber, start=0):
        self.inhaber = inhaber
        self.guthaben = start

    def einzahlen(self, betrag):
        self.guthaben += betrag
        print(f"✅ +{betrag}€ → {self.guthaben}€")

    def abheben(self, betrag):
        if betrag > self.guthaben:
            print("❌ Kein Guthaben")
            return
        self.guthaben -= betrag

    def __str__(self):
        return f"Konto {self.inhaber}: {self.guthaben}€"

konto = BankKonto("Alex", 1000)
konto.einzahlen(500)
konto.abheben(200)
print(konto)`,
        task:"Student-Klasse: Attribute name, matrikel_nr, noten (Liste). Methoden: note_hinzufuegen(n), durchschnitt() → berechnet Durchschnitt, status() → 'Bestanden' oder 'Nicht bestanden' (Grenze 4.0). Erstelle 2 Studenten und teste alle Methoden.",
        xp:40, tags:["class","__init__","self","Methoden","OOP"]
      },
      {
        id:"p5", num:17, title:"Code vererben", sub:"OOP – Vererbung",
        story:"👶 Kinder erben von Eltern. In Python erben Klassen von anderen Klassen. Schreibe einmal, nutze überall – das Grundprinzip der Wiederverwendung.",
        theory:`## Vererbung
\`\`\`
class Tier:
    def __init__(self, name):
        self.name = name
    def laut(self):
        return "..."

class Hund(Tier):           # erbt von Tier
    def __init__(self, name, rasse):
        super().__init__(name)  # Eltern-Konstruktor
        self.rasse = rasse

    def laut(self):         # Override!
        return "Wuff! 🐕"

fido = Hund("Fido", "Labrador")
print(fido.laut())  # Wuff!
\`\`\`
**super()** ruft den Eltern-Konstruktor auf. **Override** = Methode überschreiben.`,
        example:`class Fahrzeug:
    def __init__(self, marke, speed):
        self.marke = marke
        self.max_speed = speed

    def info(self):
        return f"{self.marke} ({self.max_speed}km/h)"

class ElektroAuto(Fahrzeug):
    def __init__(self, marke, speed, reichweite):
        super().__init__(marke, speed)
        self.reichweite = reichweite

    def info(self):
        return f"{super().info()}, {self.reichweite}km 🔋"

tesla = ElektroAuto("Tesla", 250, 600)
print(tesla.info())`,
        task:"Form-Hierarchie: Klasse Form mit flaeche() und umfang() (return 0). Unterklassen Rechteck(Form) und Kreis(Form) mit echten Berechnungen (import math für pi). 2 Objekte je Klasse testen.",
        xp:40, tags:["Vererbung","super()","override","Polymorphismus"]
      },
      {
        id:"p6", num:18, title:"Pythons Werkzeugkasten", sub:"Standard-Module",
        story:"🎁 Python liefert hunderte fertige Werkzeuge mit. Du musst das Rad nicht neu erfinden – du musst nur wissen wo die Werkzeugkiste ist.",
        theory:`## random – Zufallszahlen
\`\`\`
import random
random.randint(1, 100)    # Zufallszahl 1-100
random.choice(["A","B"])  # Zufälliges Element
random.shuffle(liste)      # Liste mischen
\`\`\`

## datetime – Datum & Zeit
\`\`\`
import datetime
heute = datetime.date.today()
print(heute.strftime("%d.%m.%Y"))
\`\`\`

## math – Mathematik
\`\`\`
import math
math.sqrt(16)    # 4.0
math.pi          # 3.14159
math.ceil(3.2)   # 4 (aufrunden)
\`\`\``,
        example:`import random
import datetime
import math

# Würfel 10x
wuerfe = [random.randint(1,6) for _ in range(10)]
print(f"Würfe: {wuerfe}")
print(f"Durchschnitt: {sum(wuerfe)/len(wuerfe):.2f}")

# Datum
heute = datetime.date.today()
print(f"Heute: {heute.strftime('%d.%m.%Y')}")

# Mathe
print(f"Pi: {math.pi:.4f}")
print(f"√144 = {math.sqrt(144)}")`,
        task:"Glücksrad-Programm: Liste mit 8 Optionen (selbst wählen). random.choice() für Auswahl. Datum/Uhrzeit anzeigen. Wahrscheinlichkeit mit math berechnen (1/8 × 100%). Lass User 3x drehen.",
        xp:30, tags:["random","datetime","math","import"]
      },
      {
        id:"p7", num:19, title:"Profi-Schreibweise", sub:"List Comprehensions",
        story:"⚡ Senior-Entwickler schreiben in einer Zeile was Anfänger fünf brauchen. List Comprehensions sind dein erster Schritt in die Profi-Liga.",
        theory:`## List Comprehensions
Normal (4 Zeilen):
\`\`\`
quadrate = []
for x in range(10):
    if x % 2 == 0:
        quadrate.append(x**2)
\`\`\`

Kompakt (1 Zeile!):
\`\`\`
quadrate = [x**2 for x in range(10) if x % 2 == 0]
\`\`\`

Weitere Beispiele:
\`\`\`
gross = [w.upper() for w in ["hallo","welt"]]
gerade = [x for x in range(20) if x % 2 == 0]
\`\`\``,
        example:`zahlen = [3, -1, 7, -5, 2, -8, 9]

positive = [x for x in zahlen if x > 0]
quadrate = [x**2 for x in zahlen if x > 0]

namen = ["  alice  ", "BOB  ", "  Charlie"]
sauber = [n.strip().title() for n in namen]

print(f"Positiv: {positive}")
print(f"Quadrate: {quadrate}")
print(f"Namen: {sauber}")`,
        task:"Konvertiere 4 Aufgaben zu List Comprehensions: (1) Alle durch 3 teilbare Zahlen 1-50, (2) Quadratzahlen von 1-10, (3) Wörter über 4 Zeichen aus 'der schnelle braune fuchs springt', (4) Celsius zu Fahrenheit für [0,20,37,100].",
        xp:35, tags:["list comprehension","filter","kompakter Code"]
      }
    ],
    finalTest:{
      id:"pt", title:"Verschlüsselter Passwort-Manager",
      desc:`Das ultimative Meisterstück!

Dein Programm muss:
✓ OOP: Klassen User und PasswortManager
✓ JSON: daten.json beim Start laden (wenn vorhanden)
✓ Registrierung & Login mit try/except abgesichert
✓ Passwörter verschlüsselt speichern (simpler Algorithmus mit math/random)
✓ Alles sauber mit OOP strukturiert

Geprüft wird: Alles aus Teil 1, 2 und 3`,
      xp:200, diff:"Profi"
    }
  }
];

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
function HomeScreen({ user, challenge, onLesson, onChallenge, onTutor, onSettings }) {
  const lv = getLevel(user.xp);
  const done = new Set(user.completed);
  const totalL = COURSES.reduce((s,c)=>s+c.lessons.length,0);
  const doneL  = COURSES.reduce((s,c)=>s+c.lessons.filter(l=>done.has(l.id)).length,0);
  const challengeDone = challenge?.date === today() && challenge?.completed;

  return (
    <div style={{minHeight:"100vh",background:"#07070f",fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:32}}>
      <div style={{background:"#0f0f1e",borderBottom:"1px solid #1e1e3a",padding:"14px 16px",position:"sticky",top:0,zIndex:20}}>
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
            <button onClick={onSettings} style={{background:"none",border:"none",color:"#4b5563",cursor:"pointer",fontSize:18,padding:4}}>⚙</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:720,margin:"0 auto",padding:"20px 16px"}}>
        <div style={{background:"#111120",borderRadius:14,padding:"18px 20px",marginBottom:16,border:"1px solid #2a2a50"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{color:"#e2e8f0",fontWeight:700,fontSize:15}}>{lv.icon} {lv.name}</div>
            <div style={{color:"#6b7280",fontSize:13}}>{user.xp} / {lv.nextXP} XP</div>
          </div>
          <div style={{background:"#1c1c35",borderRadius:99,height:8,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(90deg,#7c3aed,#a78bfa)",height:"100%",width:`${lv.pct}%`,borderRadius:99,transition:"width 0.5s"}} />
          </div>
          <div style={{color:"#4b5563",fontSize:12,marginTop:8}}>{doneL} von {totalL} Lektionen · {challengeDone?"✅ Challenge heute gemacht":"⚡ Daily Challenge verfügbar"}</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
          <button onClick={onChallenge} style={{background:`linear-gradient(135deg,#1a1530,${challengeDone?"#111120":"#2d1b69"})`,border:`1px solid ${challengeDone?"#2a2a50":"#4c1d95"}`,borderRadius:14,padding:"16px 14px",cursor:"pointer",textAlign:"left"}}>
            <div style={{fontSize:26,marginBottom:6}}>{challengeDone?"✅":"⚡"}</div>
            <div style={{color:challengeDone?"#6b7280":"#a78bfa",fontWeight:700,fontSize:14}}>Daily Challenge</div>
            <div style={{color:"#4b5563",fontSize:12,marginTop:3}}>{challengeDone?"Heute erledigt!":"+50 XP heute"}</div>
          </button>
          <button onClick={onTutor} style={{background:"linear-gradient(135deg,#0a1a2a,#0c2440)",border:"1px solid #1e3a5f",borderRadius:14,padding:"16px 14px",cursor:"pointer",textAlign:"left"}}>
            <div style={{fontSize:26,marginBottom:6}}>🤖</div>
            <div style={{color:"#60a5fa",fontWeight:700,fontSize:14}}>AI Tutor</div>
            <div style={{color:"#4b5563",fontSize:12,marginTop:3}}>Frag mich alles!</div>
          </button>
        </div>

        <div style={{color:"#e2e8f0",fontSize:17,fontWeight:700,marginBottom:14}}>Deine Kurse</div>
        {COURSES.map(course => {
          const cDone = course.lessons.filter(l=>done.has(l.id)).length;
          const pct = (cDone / course.lessons.length) * 100;
          return (
            <div key={course.id} style={{background:"#111120",borderRadius:16,marginBottom:14,border:`1px solid ${course.border}55`,overflow:"hidden"}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid #1a1a30"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:20}}>{course.emoji}</span>
                    <div>
                      <div style={{color:"#e2e8f0",fontWeight:700,fontSize:15}}>{course.title}</div>
                      <div style={{color:"#4b5563",fontSize:12}}>{course.subtitle}</div>
                    </div>
                  </div>
                  <div style={{color:course.color,fontSize:13,fontWeight:700,background:course.bg,padding:"3px 10px",borderRadius:20}}>{cDone}/{course.lessons.length}</div>
                </div>
                <div style={{background:"#1c1c35",borderRadius:99,height:5}}>
                  <div style={{background:course.color,height:"100%",width:`${pct}%`,borderRadius:99,transition:"width 0.5s"}} />
                </div>
              </div>
              <div style={{padding:"12px 16px"}}>
                {course.lessons.map((lesson, idx) => {
                  const isDone = done.has(lesson.id);
                  const isNext = !isDone && course.lessons.slice(0, idx).every(l=>done.has(l.id));
                  return (
                    <button key={lesson.id} onClick={()=>onLesson(course, lesson)}
                      style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"9px 10px",borderRadius:10,marginBottom:3,background:isNext?"#1e1e3a":"transparent",border:isNext?"1px solid #3d3d65":"1px solid transparent",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:isDone?course.color:"#1c1c35",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,color:isDone?"#fff":"#6b7280",fontWeight:700}}>
                        {isDone ? "✓" : lesson.num}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:isDone?"#6b7280":"#e2e8f0",fontSize:14,fontWeight:isDone?400:600}}>{lesson.title}</div>
                        <div style={{color:"#374151",fontSize:12}}>{lesson.sub}</div>
                      </div>
                      <div style={{color:"#f59e0b",fontSize:12,fontWeight:700,flexShrink:0}}>+{lesson.xp}XP</div>
                    </button>
                  );
                })}
                <button onClick={()=>onLesson(course, {...course.finalTest, isTest:true})}
                  style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"9px 10px",borderRadius:10,marginTop:6,background:done.has(course.finalTest.id)?"transparent":"#150e25",border:`1px solid ${done.has(course.finalTest.id)?"#2a2a50":course.color+"44"}`,cursor:"pointer",textAlign:"left"}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:done.has(course.finalTest.id)?course.color:"#2d1b69",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12}}>
                    {done.has(course.finalTest.id) ? "✓" : "🏆"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{color:"#e2e8f0",fontSize:14,fontWeight:600}}>{course.finalTest.title}</div>
                    <div style={{color:"#4b5563",fontSize:12}}>Abschlusstest · {course.finalTest.diff}</div>
                  </div>
                  <div style={{color:"#f59e0b",fontSize:12,fontWeight:700,flexShrink:0}}>+{course.finalTest.xp}XP</div>
                </button>
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
function LessonScreen({ lesson, course, user, apiKey, onBack, onComplete }) {
  const isTest = !!lesson.isTest;
  const [tab, setTab] = useState(isTest ? "code" : "story");
  const [code, setCode] = useState("# Dein Code hier\n\n");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [xpAnim, setXpAnim] = useState(false);
  const alreadyDone = user.completed.includes(lesson.id);

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
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <button onClick={()=>checkCode(true)} disabled={loading}
                style={{padding:12,background:"#1c1c35",border:"1px solid #3d3d65",borderRadius:10,color:"#a78bfa",fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer"}}>
                💡 Hinweis
              </button>
              <button onClick={()=>checkCode(false)} disabled={loading}
                style={{padding:12,background:loading?"#4b3b6b":"linear-gradient(135deg,#7c3aed,#6d28d9)",border:"none",borderRadius:10,color:"white",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>
                {loading ? "⏳ Prüfe Code..." : "✓ Code prüfen"}
              </button>
            </div>

            {result && (
              <div style={{background:result.type==="success"?"#071209":result.type==="hint"?"#0d0b1a":"#120505",border:`1px solid ${result.type==="success"?"#22c55e55":result.type==="hint"?"#7c3aed55":"#ef444455"}`,borderRadius:12,padding:"16px 18px"}}>
                <div style={{fontWeight:700,marginBottom:8,color:result.type==="success"?"#22c55e":result.type==="hint"?"#a78bfa":"#ef4444",fontSize:14}}>
                  {result.type==="success"?"✅ Bestanden!":result.type==="fail"?"❌ Noch nicht ganz...":result.type==="hint"?"💡 Hinweis für dich":"⚠️ Fehler"}
                </div>
                <p style={{color:"#cbd5e0",fontSize:14,margin:0,lineHeight:1.75,whiteSpace:"pre-wrap"}}>{result.text}</p>
                {result.tip && <p style={{color:"#6b7280",fontSize:13,margin:"10px 0 0",fontStyle:"italic",borderTop:"1px solid #2a2a50",paddingTop:10}}>⚡ Profi-Tipp: {result.tip}</p>}
              </div>
            )}
          </div>
        )}
      </div>
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
            <button onClick={submit} disabled={loading||alreadyDone}
              style={{width:"100%",marginTop:12,padding:13,background:alreadyDone?"#1c1c35":loading?"#4b3b6b":"linear-gradient(135deg,#7c3aed,#6d28d9)",border:"none",borderRadius:12,color:alreadyDone?"#6b7280":"white",fontSize:15,fontWeight:700,cursor:alreadyDone?"not-allowed":"pointer"}}>
              {alreadyDone ? "✅ Heute bereits gelöst!" : loading ? "Prüfe..." : "Einreichen ⚡"}
            </button>
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
   MAIN APP
══════════════════════════════════════════════════════════════ */
export default function App() {
  const [data, setData] = useState(null);          // null = lädt noch
  const [view, setView] = useState("home");
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

  if (view === "lesson" && selLesson && selCourse) {
    return <LessonScreen lesson={selLesson} course={selCourse} user={user} apiKey={data.apiKey}
      onBack={()=>setView("home")} onComplete={completeLesson} />;
  }

  return (
    <HomeScreen user={user} challenge={data.challenge}
      onLesson={(course, lesson)=>{setSelCourse(course); setSelLesson(lesson); setView("lesson");}}
      onChallenge={()=>setView("challenge")}
      onTutor={()=>setView("tutor")}
      onSettings={()=>setView("settings")} />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

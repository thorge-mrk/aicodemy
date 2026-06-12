/* ══════════════════════════════════════════════════════════════
   LEVELS & KURSDATEN — Python Learn AI
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
        task:`Name-Formatter bauen!

📋 Schritt für Schritt:
1. Frage mit input() nach Vorname und Nachname
2. Gib den Namen in GROSSBUCHSTABEN aus (upper())
3. Gib den Namen in kleinbuchstaben aus (lower())
4. Generiere eine E-Mail: vorname.nachname@python.de (alles klein!)
5. Gib die Gesamtlänge beider Namen mit len() aus

💡 Nutze überall f-Strings für die Ausgabe!`,
        xp:25, tags:["f-Strings","upper()","lower()","len()","replace()"]
      },
      {
        id:"b7", num:7, title:"Verschachtelte Welten", sub:"Nested If & Einrückung",
        story:"🏰 Du bist Wächter einer Burg mit mehreren Toren. Hinter jedem Tor wartet die nächste Prüfung. Verschachtelte If-Statements sind Tore hinter Toren – und die Einrückung zeigt Python, welcher Code zu welchem Tor gehört.",
        theory:`## Verschachtelte If-Statements
Ein if im if – die Einrückung (4 Leerzeichen) entscheidet alles:
\`\`\`
alter = 20
hat_ticket = True

if alter >= 18:
    print("Alterscheck bestanden ✓")
    if hat_ticket:
        print("Willkommen im Club! 🎉")
    else:
        print("Erst Ticket kaufen!")
else:
    print("Sorry, ab 18!")
\`\`\`

## Bedingungen kombinieren statt verschachteln
Oft eleganter mit and/or:
\`\`\`
if alter >= 18 and hat_ticket:
    print("Willkommen! 🎉")
\`\`\`

## Wahrheitswerte verstehen
\`\`\`
x = 5
print(x > 3)            # True
print(x > 3 and x < 10) # True
print(not x > 3)        # False
\`\`\``,
        example:`wetter = input("Wetter (sonne/regen): ")
temperatur = int(input("Temperatur: "))

if wetter == "sonne":
    if temperatur > 25:
        print("🏖️ Ab zum See!")
    elif temperatur > 15:
        print("🚴 Perfekt für Fahrrad!")
    else:
        print("🧥 Sonnig aber kalt – Jacke an!")
else:
    if temperatur < 5:
        print("🏠 Bleib drin mit Tee!")
    else:
        print("☔ Regenschirm nicht vergessen!")`,
        task:`Kino-Einlass-System bauen!

📋 Schritt für Schritt:
1. Frage nach dem Alter (int) und ob ein Erwachsener dabei ist (ja/nein)
2. Film ist ab 16: Wer 16+ ist, kommt rein
3. Wer 12-15 ist, kommt NUR mit Erwachsenem rein (nested if!)
4. Wer jünger ist, kommt gar nicht rein
5. Gib für jeden Fall eine passende Nachricht aus

💡 Achte genau auf die Einrückung – sie entscheidet, welcher Code wann läuft!`,
        xp:25, tags:["nested if","Einrückung","and","Logik"]
      },
      {
        id:"b8", num:8, title:"Zahlen-Werkstatt", sub:"round(), abs(), min/max & Formatierung",
        story:"🔧 In deiner Werkstatt liegen Zahlen-Werkzeuge: rund schleifen, Vorzeichen entfernen, das Größte finden. Und mit f-String-Formatierung machst du aus 3.3333333 ein sauberes 3.33.",
        theory:`## Eingebaute Zahlen-Funktionen
\`\`\`
round(3.7)        # 4 (runden)
round(3.14159, 2) # 3.14 (auf 2 Stellen)
abs(-5)           # 5 (Betrag)
min(3, 7, 1)      # 1 (kleinste)
max(3, 7, 1)      # 7 (größte)
sum([1, 2, 3])    # 6 (Summe einer Liste)
\`\`\`

## Zahlen schön formatieren ⭐
In f-Strings mit : formatieren:
\`\`\`
preis = 19.99999
print(f"{preis:.2f} €")    # 20.00 €
zahl = 0.4567
print(f"{zahl:.1%}")       # 45.7%
gross = 1234567
print(f"{gross:,}")        # 1,234,567
\`\`\``,
        example:`temperaturen = [22.456, 19.81, 25.999, 18.2]

durchschnitt = sum(temperaturen) / len(temperaturen)

print(f"Messwerte: {temperaturen}")
print(f"Höchste:  {max(temperaturen):.1f}°C")
print(f"Tiefste:  {min(temperaturen):.1f}°C")
print(f"Schnitt:  {durchschnitt:.2f}°C")
print(f"Spanne:   {abs(max(temperaturen) - min(temperaturen)):.1f}°C")`,
        task:`Baue einen Preis-Analysator!

📋 Schritt für Schritt:
1. Erstelle eine Liste mit 5 Produktpreisen (Floats, z.B. 12.99)
2. Berechne und zeige: teuerstes Produkt (max), billigstes (min)
3. Berechne den Durchschnittspreis (sum / len)
4. Formatiere ALLE Ausgaben mit f-Strings auf 2 Nachkommastellen ({x:.2f} €)
5. Bonus: Zeige die Preisspanne (Differenz max - min)

💡 round() oder :.2f – beides funktioniert fürs Runden in der Anzeige!`,
        xp:25, tags:["round()","abs()","min()","max()","sum()",":.2f"]
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
        task:`Baue deine eigene Funktions-Bibliothek!

📋 Schritt für Schritt:
1. Funktion berechne_mwst(preis, satz=0.19) → gibt Preis inkl. MwSt zurück
2. Funktion celsius_zu_fahrenheit(grad) → Formel: grad * 9/5 + 32
3. Funktion ist_gerade(zahl) → gibt True oder False zurück (Modulo!)
4. Teste alle drei Funktionen mit print() und verschiedenen Werten

💡 Jede Funktion braucht ein return – sonst kommt None zurück!`,
        xp:35, tags:["def","return","parameter","default"]
      },
      {
        id:"i7", num:13, title:"Schleifen in Schleifen", sub:"Nested Loops & Muster",
        story:"🧶 Eine Strickmaschine arbeitet Reihe für Reihe, und in jeder Reihe Masche für Masche. Verschachtelte Schleifen funktionieren genauso – die äußere zählt Reihen, die innere füllt jede Reihe.",
        theory:`## Schleife in der Schleife
Die innere Schleife läuft KOMPLETT durch – für jeden Durchlauf der äußeren:
\`\`\`
for reihe in range(3):
    for spalte in range(4):
        print(f"({reihe},{spalte})", end=" ")
    print()  # Neue Zeile nach jeder Reihe
\`\`\`

## Muster drucken
\`\`\`
for i in range(1, 6):
    print("⭐" * i)
# ⭐
# ⭐⭐
# ⭐⭐⭐ ...
\`\`\`

## print ohne Zeilenumbruch
\`\`\`
print("A", end="")   # end="" verhindert Umbruch
print("B")           # → AB
\`\`\``,
        example:`# Kleines Einmaleins als Tabelle
for zeile in range(1, 6):
    for spalte in range(1, 6):
        produkt = zeile * spalte
        print(f"{produkt:4}", end="")
    print()

print()

# Pyramide
hoehe = 5
for i in range(1, hoehe + 1):
    leer = " " * (hoehe - i)
    sterne = "*" * (2 * i - 1)
    print(leer + sterne)`,
        task:`Muster-Künstler werden!

📋 Schritt für Schritt:
1. Drucke ein Quadrat aus # (5x5) mit zwei verschachtelten Schleifen
2. Drucke eine Treppe aus ⭐ (Zeile 1 hat 1 Stern, Zeile 5 hat 5)
3. Drucke das Einmaleins von 1 bis 5 als Tabelle (nested loop!)

💡 Nutze print(..., end="") in der inneren Schleife und print() in der äußeren für den Zeilenumbruch!`,
        xp:30, tags:["nested loops","end=''","Muster","range()"]
      },
      {
        id:"i8", num:14, title:"String-Chirurgie", sub:"Slicing, split() & join()",
        story:"🔪 Du bist Chirurg für Texte: zerschneiden, Teile entnehmen, neu zusammennähen. Slicing schneidet präzise, split() zerlegt, join() näht zusammen – die wichtigsten Operationen der Textverarbeitung.",
        theory:`## String-Slicing – wie bei Listen!
\`\`\`
text = "Python ist toll"
text[0]      # "P" (erstes Zeichen)
text[-1]     # "l" (letztes)
text[0:6]    # "Python" (Index 0 bis 5)
text[7:]     # "ist toll" (ab Index 7)
text[::-1]   # "llot tsi nohtyP" (umdrehen!)
\`\`\`

## split() – Text zerlegen
\`\`\`
satz = "Apfel,Banane,Cherry"
teile = satz.split(",")   # ["Apfel","Banane","Cherry"]
woerter = "Hallo Welt".split()  # ["Hallo","Welt"]
\`\`\`

## join() – Liste zusammenfügen
\`\`\`
liste = ["2026", "06", "12"]
datum = "-".join(liste)   # "2026-06-12"
\`\`\``,
        example:`satz = input("Gib einen Satz ein: ")

woerter = satz.split()
print(f"Wörter: {len(woerter)}")
print(f"Erstes: {woerter[0]}")
print(f"Letztes: {woerter[-1]}")

# Ersten Buchstaben jedes Wortes
initialen = "".join([w[0].upper() for w in woerter])
print(f"Initialen: {initialen}")

# Satz rückwärts
print(f"Rückwärts: {satz[::-1]}")`,
        task:`Baue einen Geheimcode-Generator!

📋 Schritt für Schritt:
1. Frage nach einem Satz mit input()
2. Zerlege ihn mit split() in Wörter
3. Baue den Geheimcode: erster + letzter Buchstabe jedes Wortes, alles GROSS
4. Füge die Teile mit "-".join() zusammen
5. Zeige auch den kompletten Satz rückwärts ([::-1])

💡 Beispiel: "hallo welt" → Code "HO-WT"`,
        xp:30, tags:["Slicing","split()","join()","[::-1]"]
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
        task:`List-Comprehension-Training!

📋 Konvertiere diese 4 Aufgaben zu je EINER Zeile:
1. Alle durch 3 teilbaren Zahlen von 1 bis 50
2. Quadratzahlen von 1 bis 10
3. Alle Wörter mit mehr als 4 Zeichen aus: "der schnelle braune fuchs springt"
4. Celsius → Fahrenheit für [0, 20, 37, 100] (Formel: c * 9/5 + 32)

💡 Muster: [ausdruck for element in liste if bedingung]`,
        xp:35, tags:["list comprehension","filter","kompakter Code"]
      },
      {
        id:"p8", num:20, title:"Funktionen als Werte", sub:"Lambda, map() & filter()",
        story:"🥷 Funktionale Programmierung ist die Ninja-Kunst von Python. Lambda-Funktionen sind wegwerfbare Mini-Funktionen, map() und filter() verarbeiten ganze Listen in einem Atemzug.",
        theory:`## Lambda – Funktionen ohne Namen
\`\`\`
# Normal:
def quadrat(x): return x ** 2
# Lambda (gleiche Funktion!):
quadrat = lambda x: x ** 2

addieren = lambda a, b: a + b
print(addieren(3, 4))  # 7
\`\`\`

## map() – auf alle anwenden
\`\`\`
zahlen = [1, 2, 3, 4]
quadrate = list(map(lambda x: x**2, zahlen))
# [1, 4, 9, 16]
\`\`\`

## filter() – nur passende behalten
\`\`\`
gerade = list(filter(lambda x: x % 2 == 0, zahlen))
# [2, 4]
\`\`\`

## sorted() mit key ⭐
\`\`\`
namen = ["Bob", "alice", "Charlie"]
sorted(namen, key=lambda n: n.lower())
# Sortiert ohne Groß/Klein zu beachten

personen = [("Alex", 25), ("Ben", 19)]
sorted(personen, key=lambda p: p[1])
# Nach Alter sortiert!
\`\`\``,
        example:`produkte = [
    ("Laptop", 999), ("Maus", 25),
    ("Monitor", 349), ("Kabel", 9)
]

# Nach Preis sortieren
nach_preis = sorted(produkte, key=lambda p: p[1])
print("Günstigste zuerst:")
for name, preis in nach_preis:
    print(f"  {name}: {preis}€")

# Nur teure Produkte (> 100€)
teuer = list(filter(lambda p: p[1] > 100, produkte))
print(f"\\nTeuer: {[p[0] for p in teuer]}")

# Preise mit 19% MwSt
brutto = list(map(lambda p: round(p[1] * 1.19, 2), produkte))
print(f"Brutto-Preise: {brutto}")`,
        task:`Schüler-Daten-Pipeline bauen!

📋 Schritt für Schritt:
1. Liste mit 5 Tupeln: ("Name", Note) – z.B. ("Alex", 2.3)
2. Sortiere mit sorted() + lambda nach Note (beste zuerst)
3. Filtere mit filter() + lambda alle mit Note besser als 3.0
4. Erzeuge mit map() + lambda eine Liste nur mit den Namen in GROSS
5. Gib alle drei Ergebnisse aus

💡 filter() und map() geben Iteratoren zurück – mit list() umwandeln!`,
        xp:40, tags:["lambda","map()","filter()","sorted(key=)"]
      },
      {
        id:"p9", num:21, title:"Faule Fabriken", sub:"Generatoren & yield",
        story:"🏭 Eine normale Funktion produziert alles auf einmal und liefert dann. Ein Generator ist eine faule Fabrik: Er produziert erst, wenn du danach fragst – Stück für Stück. Perfekt für riesige Datenmengen.",
        theory:`## Generator mit yield
yield statt return – die Funktion pausiert und macht später weiter:
\`\`\`
def countdown(start):
    while start > 0:
        yield start
        start -= 1

for zahl in countdown(3):
    print(zahl)   # 3, 2, 1
\`\`\`

## Warum Generatoren?
\`\`\`
# Liste: ALLES sofort im Speicher
zahlen = [x**2 for x in range(1000000)]

# Generator: berechnet erst bei Bedarf!
zahlen = (x**2 for x in range(1000000))
\`\`\`
Runde Klammern = Generator Expression!

## next() – manuell abrufen
\`\`\`
gen = countdown(2)
print(next(gen))  # 2
print(next(gen))  # 1
\`\`\``,
        example:`def fibonacci():
    a, b = 0, 1
    while True:          # Unendlicher Generator!
        yield a
        a, b = b, a + b

fib = fibonacci()
erste_zehn = [next(fib) for _ in range(10)]
print(f"Fibonacci: {erste_zehn}")

# Generator Expression
quadrate = (x**2 for x in range(5))
print(f"Summe: {sum(quadrate)}")

def gerade_zahlen(limit):
    for x in range(0, limit + 1, 2):
        yield x

print(f"Gerade: {list(gerade_zahlen(10))}")`,
        task:`Baue eine Generator-Sammlung!

📋 Schritt für Schritt:
1. Generator countdown(n): zählt von n bis 0 (mit yield)
2. Generator quadrate(limit): liefert Quadratzahlen bis limit
3. Generator passwort_zeichen(): liefert unendlich zufällige Zeichen (import random, random.choice auf einem String mit Buchstaben+Zahlen)
4. Nutze alle drei: Countdown ausgeben, Quadrate als Liste, 8 Zeichen zu einem Passwort joinen

💡 Bei unendlichen Generatoren nie list() nutzen – immer next() oder eine begrenzte Schleife!`,
        xp:45, tags:["yield","Generator","next()","lazy evaluation"]
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

export { LEVELS, getLevel, COURSES };

// Nummern automatisch fortlaufend vergeben
let __n = 0;
for (const c of COURSES) for (const l of c.lessons) l.num = ++__n;

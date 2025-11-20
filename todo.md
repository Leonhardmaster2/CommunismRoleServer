

Projekt: Kulturrevolution Social-Deduction Game (lokal, QR-basiert)

Ziel: Ein vollständiges Offline-Game, das auf meinem Mac als lokaler Server läuft.
Alle Spieler scannen einen QR-Code → gelangen auf eine Webseite → bekommen ihre Rolle (= immer „Comrade“) und eine geheime Aufgabe.
Ein Admin-Dashboard steuert das ganze Spiel.

⸻

1. Systemarchitektur
	•	Node.js + Express für HTTP-Server
	•	Socket.IO für Echtzeit-Kommunikation
	•	Keine externen Dienste
	•	Läuft komplett lokal im LAN
	•	Die Spieler betreten das Spiel via QR-Code (Link: http://<local-ip>:3000/join)
	•	Browser-Only Frontend (HTML+JS)

⸻

2. Funktionen

Spielerfluss
	1.	Spieler scannt QR → /join
	2.	Server erzeugt PlayerID und speichert ihn
	3.	Weiterleitung auf /role/<playerID>
	4.	Seite zeigt:
	•	Titel: „Comrade“
	•	Feld „Your secret task“ (wird dynamisch serverseitig geschickt)
	5.	Seite wartet über WebSocket auf:
	•	newTask → zeigt neue Aufgabe
	•	dead → zeigt „You have been eliminated“
	•	systemMessage → Popup/Alert

Admin-Dashboard

Pfad: /admin

Buttons:
	•	“Start Game”
	•	“Assign Random Tasks to All”
	•	“Force Voting Phase” (broadcast message)
	•	“Reveal Voting Results” (broadcast message)
	•	“Kill Player X” (dropdown mit IDs)
	•	“Reset Game”
	•	Anzeige aller Spieler: alive / dead / connected

Alle Aktionen senden WebSocket-Kommandos an Clients.

⸻

3. Backend-Implementierung

Spieler-Management
	•	players = { playerID: { alive: true/false, socket: <socket-id> } }
	•	Generierung von IDs: kurze alphanumerische Strings
	•	Persistenz nur im RAM (keine DB; reicht für lokale Session)

Server Commands (MUSS IMPLEMENTIERT WERDEN)
	•	sendRole(playerID, text)
→ sendet eine Aufgabe an diesen Spieler
	•	broadcast(text)
→ sendet an alle
	•	kill(playerID)
→ setzt alive=false und schickt „dead“-Event
	•	resetGame()
→ löscht alle Spieler, leert Speicher

⸻

4. Routen

/join
	•	Generiert PlayerID
	•	Speichert in players
	•	Redirect zu /role/:id

/role/:id
	•	Liefert HTML/JS-Seite mit WebSocket-Client

/admin
	•	Admin-Panel-HTML (JS steuert WebSocket-Befehle)

⸻

5. Socket.IO Events

Client → Server
	•	register(playerID) beim Seitenstart
	•	vote(targetPlayerID) optional (falls Voting implementiert wird)

Server → Client
	•	newTask → Aufgabe anzeigen
	•	dead → Eliminierungsbildschirm
	•	systemMessage → Nachricht für alle

⸻

6. Aufgaben (Tasks)

Alle Spieler sind Revolutionäre, niemand weiß es.

Der Server soll beim Start zufällig Aufgaben generieren.
Beispiel-Set:

Touch your nose three times during the discussion.
Convince the group that whoever touches their nose three times is an enemy.
Force another player to touch their nose three times.
Stay silent for 60 seconds.
Ask three people why they look nervous.
Accuse someone loudly within the first 30 seconds.
Repeat everything one person says.
Complain that someone is acting suspiciously.
Look at the ceiling three times.
Try to get someone to defend you without asking directly.

Backend soll:
tasks[Math.floor(Math.random() * tasks.length)] verwenden.

⸻

7. Frontend-Spezifikation

role.html
	•	Überschrift: “Comrade”
	•	Text “Waiting for your secret task…”
	•	Dynamische Updates über Socket.IO
	•	Wenn Event dead, dann:
→ Replace body with “You have been eliminated.”

admin.html

Komponenten:
	•	Liste aller Spieler: ID, alive/dead, connected/disconnected
	•	Buttons für Commands
	•	WebSockets für Admin → Server → Clients

⸻

8. Start & Deployment
	•	Node-Projekt erstellen
	•	npm install express socket.io
	•	node server.js starten
	•	Firewall lokal erlauben
	•	QR-Code generieren mit lokalem IP-Link
z. B.: http://192.168.0.23:3000/join

⸻

9. Ordnerstruktur

project/
│ server.js
│ tasks.js (optional)
│ todo.md
└─public/
   │ role.html
   │ admin.html
   │ style.css (optional)
   └ client.js (optional)


⸻

10. Minimales Server-Verhalten

Der Code muss:
	•	automatisch Spieler verwalten
	•	WebSocket-Verbindungen sauber registrieren
	•	Rollen-Aufgaben versenden
	•	Kills steuern
	•	Admin-Dashboard synchronisieren

Keine unklaren Stellen, alles muss sofort lauffähig sein.


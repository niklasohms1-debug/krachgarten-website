const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const ICECAST_JSON_URL = 'http://localhost:8000/status-json.xsl';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const readData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// Icecast Titel-Sync im Hintergrund
async function updateCurrentTitleFromIcecast() {
    try {
        const response = await fetch(ICECAST_JSON_URL);
        if (!response.ok) return;
        const icecastData = await response.json();
        let source = icecastData.icestats.source;
        if (Array.isArray(source)) source = source[0];

        if (source && source.title) {
            const data = readData();
            if (data.currentTitle !== source.title) {
                data.currentTitle = source.title;
                writeData(data);
            }
        }
    } catch (e) {}
}
setInterval(updateCurrentTitleFromIcecast, 3000);

// ==========================================
// API ENDPUNKTE
// ==========================================

// 1. Öffentliche Daten (Homepage & Panels)
app.get('/api/data', (req, res) => res.json(readData()));

// 2. Wunsch/Gruß von der Homepage
app.post('/api/wish', (req, res) => {
    const { type, name, song, message } = req.body;
    if (!name) return res.status(400).json({ error: "Name ist ein Pflichtfeld!" });

    const data = readData();
    const newWish = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        type: type || "Musikwunsch",
        name,
        song: song || "-",
        message: message || "Keine Nachricht"
    };

    data.wishes.unshift(newWish);
    writeData(data);
    res.json({ success: true, message: "Eintrag erfolgreich gesendet!" });
});

// 3. HIER SIND DIE NEUEN TEAM-ROUTEN:
// Teammitglied hinzufügen
app.post('/api/admin/team', (req, res) => {
    const { password, name, role, department } = req.body;
    const data = readData();

    if (password !== data.passwords.admin) {
        return res.status(401).json({ error: "Nicht autorisiert!" });
    }

    const newMember = { id: Date.now(), name, role, department };
    if (!data.team) data.team = [];
    data.team.push(newMember);

    writeData(data);
    res.json({ success: true, message: "Mitglied hinzugefügt!" });
});

// Teammitglied löschen
app.delete('/api/admin/team/:id', (req, res) => {
    const { password } = req.body;
    const data = readData();

    if (password !== data.passwords.admin) {
        return res.status(401).json({ error: "Nicht autorisiert!" });
    }

    const id = parseInt(req.params.id);
    if (data.team) {
        data.team = data.team.filter(m => m.id !== id);
    }

    writeData(data);
    res.json({ success: true, message: "Mitglied gelöscht!" });
});

// 4. Einstellungen ändern (Admin)
app.post('/api/settings', (req, res) => {
    const { streamName, currentTitle } = req.body;
    const data = readData();
    
    if (streamName) data.streamName = streamName;
    if (currentTitle) data.currentTitle = currentTitle;
    
    writeData(data);
    res.json({ success: true, message: "Einstellungen gespeichert!" });
});

// 5. News schreiben (Admin)
app.post('/api/news', (req, res) => {
    const { title, text } = req.body;
    const data = readData();
    
    const newArticle = {
        id: Date.now(),
        date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }),
        title,
        text
    };
    
    data.news.unshift(newArticle);
    writeData(data);
    res.json({ success: true, message: "Artikel veröffentlicht!" });
});

// 6. Login-Prüfung
app.post('/api/login', (req, res) => {
    const { password, role } = req.body;
    const data = readData();
    const validPassword = role === 'admin' ? data.passwords.admin : data.passwords.dj;

    if (password === validPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Falsches Passwort!" });
    }
});

// 7. DJ Routen
app.post('/api/dj/title', (req, res) => {
    const { password, currentTitle } = req.body;
    const data = readData();

    if (password !== data.passwords.dj && password !== data.passwords.admin) {
        return res.status(401).json({ error: "Nicht autorisiert!" });
    }

    data.currentTitle = currentTitle;
    writeData(data);
    res.json({ success: true, message: "Sendungstitel aktualisiert!" });
});

app.post('/api/dj/schedule', (req, res) => {
    const { password, time, show, djName } = req.body;
    const data = readData();

    if (password !== data.passwords.dj && password !== data.passwords.admin) {
        return res.status(401).json({ error: "Nicht autorisiert!" });
    }

    data.schedule.push({ time, show: `${show} (mit ${djName})` });
    writeData(data);
    res.json({ success: true, message: "Eintrag im Sendeplan gespeichert!" });
});

// Server starten
app.listen(PORT, () => {
    console.log(`Radio-Website: http://localhost:${PORT}`);
    console.log(`DJ-Panel:      http://localhost:${PORT}/dj.html`);
    console.log(`Admin-Panel:   http://localhost:${PORT}/admin.html`);

// 1. Hier legst du Benutzername und Passwort fest:
const ADMIN_USER = "admin";
const ADMIN_PASS = "katzi123"; // <--- DEIN PASSWORT

const DJ_USER = "dj";
const DJ_PASS = "djpass123";
    
// 2. API-Endpunkt für den Admin-Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    // Prüfen, ob Benutzername UND Passwort übereinstimmen
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        return res.json({ success: true, message: "Login erfolgreich!" });
    } else {
        return res.status(401).json({ success: false, message: "Zugangsdaten falsch!" });
    }
    app.post('/api/dj/login', (req, res) => {
    const { username, password } = req.body;

    if (username === DJ_USER && password === DJ_PASS) {
        return res.json({ success: true, message: "DJ Login erfolgreich!" });
    }
    return res.status(401).json({ success: false, message: "Zugangsdaten falsch!" });
});
    
});

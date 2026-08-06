process.env.TZ = 'Europe/Berlin';

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const https = require('https');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// ORDNER & DATEIEN AUTOMATISCH PRÜFEN / ERSTELLEN
// ==========================================
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. AUTOMATISCH index_neu.html IM HABBO-DESIGN ERSTELLEN (FALLS AUF RENDER FEHLT)
const indexNeuPath = path.join(publicDir, 'index_neu.html');
if (!fs.existsSync(indexNeuPath)) {
    fs.writeFileSync(indexNeuPath, `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Krachgarten Radio | Dashboard V2</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Verdana', 'Segoe UI', Tahoma, Geneva, sans-serif;
            background: #0b4975 url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" opacity="0.12"><circle cx="20" cy="20" r="1.5" fill="%23fff"/><circle cx="80" cy="50" r="2" fill="%23fff"/><circle cx="40" cy="80" r="1" fill="%23fff"/></svg>') repeat;
            color: #222; min-height: 100vh; padding-bottom: 40px;
        }
        .page-wrapper { max-width: 980px; margin: 0 auto; padding: 10px 15px; }
        header { display: flex; align-items: center; justify-content: space-between; padding: 15px 10px; color: #fff; }
        .logo-area { display: flex; align-items: center; gap: 12px; }
        .logo-area h1 { font-size: 2.1rem; font-weight: 900; text-transform: uppercase; color: #fff; text-shadow: 2px 2px 0px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 3px 3px 6px rgba(0,0,0,0.6); }
        .logo-badge { background: linear-gradient(180deg, #ff9f43 0%, #ff5252 100%); color: #fff; font-size: 0.75rem; font-weight: bold; padding: 4px 8px; border-radius: 4px; border: 1px solid #ffffff33; }
        .speech-bubble { background: #ffffff; color: #333; padding: 8px 16px; border-radius: 18px; font-size: 0.85rem; font-weight: bold; box-shadow: 0 3px 6px rgba(0,0,0,0.3); position: relative; max-width: 320px; }
        .speech-bubble::after { content: ''; position: absolute; left: -10px; top: 50%; transform: translateY(-50%); border-width: 6px 10px 6px 0; border-style: solid; border-color: transparent #ffffff transparent transparent; }
        nav { background: linear-gradient(180deg, #ff6b35 0%, #d63031 100%); border: 2px solid #900c3f; border-radius: 8px 8px 0 0; display: flex; gap: 4px; padding: 4px 6px 0 6px; box-shadow: 0 4px 8px rgba(0,0,0,0.4); }
        .nav-tab { background: linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.1) 100%); color: #fff; border: 1px solid rgba(255,255,255,0.3); border-bottom: none; font-size: 0.85rem; font-weight: bold; padding: 8px 18px; border-radius: 6px 6px 0 0; cursor: pointer; transition: all 0.15s; }
        .nav-tab:hover, .nav-tab.active { background: #ffffff; color: #d63031; text-shadow: none; }
        .habbo-player-console { background: linear-gradient(180deg, #434953 0%, #242830 50%, #17191e 100%); border: 3px solid #111317; border-radius: 0 0 8px 8px; padding: 15px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 15px; box-shadow: 0 8px 20px rgba(0,0,0,0.5); flex-wrap: wrap; }
        .player-left { display: flex; align-items: center; gap: 12px; flex-grow: 1; }
        .player-avatar-box { width: 55px; height: 55px; background: #111317; border: 2px solid #555; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; box-shadow: inset 0 0 8px #000; }
        .track-details { color: #fff; display: flex; flex-direction: column; gap: 4px; }
        .track-artist { color: #ff9f43; font-size: 1.1rem; font-weight: bold; text-shadow: 1px 1px 2px #000; }
        .track-title { color: #dddddd; font-size: 0.95rem; }
        .player-controls { display: flex; align-items: center; gap: 15px; }
        .btn-einschalten { background: linear-gradient(180deg, #ff9f43 0%, #ee5253 100%); border: 2px solid #fff; color: #fff; font-size: 1rem; font-weight: bold; padding: 10px 22px; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.4); text-shadow: 1px 1px 2px rgba(0,0,0,0.6); }
        .btn-einschalten:hover { filter: brightness(1.1); transform: scale(1.03); }
        .btn-einschalten.playing { background: linear-gradient(180deg, #10ac84 0%, #1dd1a1 100%); color: #000; text-shadow: none; }
        .volume-container { display: flex; align-items: center; gap: 6px; color: #aaa; font-size: 0.85rem; }
        .volume-slider { width: 80px; accent-color: #ff9f43; cursor: pointer; }
        .content-grid { display: grid; grid-template-columns: 1fr 310px; gap: 20px; }
        @media (max-width: 850px) { .content-grid { grid-template-columns: 1fr; } }
        .habbo-card { background: #ffffff; border: 2px solid #083b60; border-radius: 8px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
        .card-header { background: linear-gradient(180deg, #ff6b35 0%, #e84118 100%); color: #ffffff; padding: 10px 15px; font-weight: bold; font-size: 0.95rem; text-shadow: 1px 1px 1px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #c23616; }
        .card-body { padding: 15px; color: #2c3e50; font-size: 0.88rem; line-height: 1.5; }
        .welcome-banner { background: linear-gradient(135deg, #1e3799 0%, #0c2461 100%); color: #fff; padding: 20px; border-radius: 6px; margin-bottom: 15px; display: flex; align-items: center; gap: 15px; border: 2px solid #4a69bd; }
        .welcome-banner h2 { font-size: 1.2rem; color: #f6b93b; margin-bottom: 5px; }
        .dj-post-header { background: linear-gradient(180deg, #353b48 0%, #2f3640 100%); color: #fff; padding: 12px; text-align: center; font-weight: 900; font-size: 1.1rem; letter-spacing: 1px; border-bottom: 3px solid #ff6b35; }
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; font-weight: bold; font-size: 0.8rem; margin-bottom: 4px; color: #2f3640; }
        .form-control { width: 100%; padding: 8px 10px; border: 1px solid #dcdde1; border-radius: 4px; font-size: 0.85rem; background: #f5f6fa; }
        .form-control:focus { outline: none; border-color: #ff6b35; background: #fff; }
        .btn-submit { width: 100%; background: linear-gradient(180deg, #ff9f43 0%, #ee5253 100%); color: #fff; border: none; padding: 10px; font-weight: bold; border-radius: 4px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        .btn-submit:hover { filter: brightness(1.08); }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        footer { text-align: center; color: #a4b0be; font-size: 0.8rem; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="page-wrapper">
        <header>
            <div class="logo-area">
                <h1>Krachgarten</h1>
                <span class="logo-badge">V2 BETA</span>
            </div>
            <div class="speech-bubble">💬 Willkommen bei Krachgarten! Die beste Musik rund um die Uhr.</div>
        </header>

        <nav>
            <button id="nav-startseite" class="nav-tab active" onclick="switchTab('startseite')">Startseite</button>
            <button id="nav-sendeplan" class="nav-tab" onclick="switchTab('sendeplan')">Sendeplan</button>
            <button id="nav-team" class="nav-tab" onclick="switchTab('team')">Team</button>
            <button id="nav-radio" class="nav-tab" onclick="switchTab('radio')">Radio / Historie</button>
            <button id="nav-community" class="nav-tab" onclick="switchTab('community')">Community</button>
        </nav>

        <div class="habbo-player-console">
            <div class="player-left">
                <div class="player-avatar-box">📻</div>
                <div class="track-details">
                    <div id="v2-artist" class="track-artist">Lade Künstler...</div>
                    <div id="v2-title" class="track-title">Lade Stream...</div>
                </div>
            </div>
            <div class="player-controls">
                <div class="volume-container">
                    <span>🔊</span>
                    <input type="range" id="v2-volume" class="volume-slider" min="0" max="1" step="0.01" value="0.8" oninput="setVolume(this.value)">
                </div>
                <button id="v2-play-btn" class="btn-einschalten" onclick="togglePlay()">▶️ Einschalten</button>
            </div>
            <audio id="v2-audio" src="https://stream.laut.fm/xoticradio" preload="none"></audio>
        </div>

        <div id="tab-startseite" class="tab-content active">
            <div class="content-grid">
                <div>
                    <div class="welcome-banner">
                        <div style="font-size: 2.5rem;">🎉</div>
                        <div>
                            <h2>Willkommen auf der neuen krachgarten Webseite!</h2>
                            <p>Hier findest du aktuelle News, unseren Sendeplan und die direkte Wunschbox ins Studio.</p>
                        </div>
                    </div>
                    <div class="habbo-card">
                        <div class="card-header">
                            <span>📌 Willkommen bei Krachgarten</span>
                            <span>OFFIZIELLER FANSENDER</span>
                        </div>
                        <div class="card-body">
                            <p>Bei <strong>Krachgarten</strong> bestimmst DU das Programm! Schreibe dem sendenden DJ einfach deine Musikwünsche, Grüße und Feedback über unsere Wunschbox.</p>
                        </div>
                    </div>
                    <div class="habbo-card">
                        <div class="card-header">
                            <span>📰 Aktuelle News & Mitteilungen</span>
                            <span style="font-size:0.75rem; font-weight:normal;">Live aus der Redaktion</span>
                        </div>
                        <div class="card-body"><div id="news-container"><p style="color: #7f8c8d; font-style: italic;">Lade News...</p></div></div>
                    </div>
                </div>
                <div>
                    <div class="habbo-card">
                        <div class="dj-post-header">✉️ DJ POST / WUNSCHBOX</div>
                        <div class="card-body">
                            <form onsubmit="sendWish(event)">
                                <div class="form-group"><label for="wish-name">Dein Name:</label><input type="text" id="wish-name" class="form-control" placeholder="Z. B. DJ_Fan" required></div>
                                <div class="form-group"><label for="wish-song">Musikwunsch / Interpret:</label><input type="text" id="wish-song" class="form-control" placeholder="Interpret - Songtitel" required></div>
                                <div class="form-group"><label for="wish-msg">Grussbotschaft:</label><textarea id="wish-msg" class="form-control" rows="3" placeholder="Deine Nachricht an den DJ..."></textarea></div>
                                <button type="submit" class="btn-submit">Absenden 🚀</button>
                            </form>
                        </div>
                    </div>
                    <div class="habbo-card">
                        <div class="card-header"><span>🎧 Status & Studio</span></div>
                        <div class="card-body" style="text-align: center;">
                            <p style="font-weight: bold; color: #10ac84; margin-bottom: 8px;">🟢 Stream ist online</p>
                            <p style="color: #7f8c8d; font-size: 0.8rem;">24/7 Krachgarten Live-Sendung</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="tab-sendeplan" class="tab-content">
            <div class="habbo-card">
                <div class="card-header"><span>📅 Aktueller Sendeplan</span><span>WAS LÄUFT WANN?</span></div>
                <div class="card-body"><div id="sendeplan-container"><p style="color: #7f8c8d; font-style: italic;">Lade Sendeplan...</p></div></div>
            </div>
        </div>

        <div id="tab-team" class="tab-content">
            <div class="habbo-card">
                <div class="card-header"><span>👥 Unser Radio Team</span><span>DIE KÖPFE HINTER KRACHGARTEN</span></div>
                <div class="card-body"><div id="team-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;"><p style="color: #7f8c8d; font-style: italic;">Lade Teammitglieder...</p></div></div>
            </div>
        </div>

        <div id="tab-radio" class="tab-content">
            <div class="habbo-card">
                <div class="card-header"><span>📜 Zuletzt gespeilte Songs (Historie)</span></div>
                <div class="card-body"><div id="history-container"><p style="color: #7f8c8d; font-style: italic;">Lade Song-Historie...</p></div></div>
            </div>
        </div>

        <div id="tab-community" class="tab-content">
            <div class="habbo-card">
                <div class="card-header"><span>🎉 Interaktive Reaktionen</span></div>
                <div class="card-body" style="text-align: center;">
                    <p style="margin-bottom: 15px; font-weight: bold;">Wie gefällt dir der aktuelle Stream?</p>
                    <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;" id="reactions-box">
                        <button onclick="sendReaction('🔥')" style="background:#f5f6fa; border:1px solid #dcdde1; padding:10px 15px; border-radius:8px; cursor:pointer; font-size:1.2rem;">🔥 <span id="react-🔥">0</span></button>
                        <button onclick="sendReaction('💖')" style="background:#f5f6fa; border:1px solid #dcdde1; padding:10px 15px; border-radius:8px; cursor:pointer; font-size:1.2rem;">💖 <span id="react-💖">0</span></button>
                        <button onclick="sendReaction('🎸')" style="background:#f5f6fa; border:1px solid #dcdde1; padding:10px 15px; border-radius:8px; cursor:pointer; font-size:1.2rem;">🎸 <span id="react-🎸">0</span></button>
                        <button onclick="sendReaction('🎉')" style="background:#f5f6fa; border:1px solid #dcdde1; padding:10px 15px; border-radius:8px; cursor:pointer; font-size:1.2rem;">🎉 <span id="react-🎉">0</span></button>
                        <button onclick="sendReaction('🍺')" style="background:#f5f6fa; border:1px solid #dcdde1; padding:10px 15px; border-radius:8px; cursor:pointer; font-size:1.2rem;">🍺 <span id="react-🍺">0</span></button>
                    </div>
                </div>
            </div>
        </div>

        <footer>&copy; Krachgarten Radio – Alle Rechte vorbehalten. Inspiriert vom HabboFun Design.</footer>
    </div>

    <script>
        const audio = document.getElementById('v2-audio');
        const playBtn = document.getElementById('v2-play-btn');
        const artistEl = document.getElementById('v2-artist');
        const titleEl = document.getElementById('v2-title');

        function escapeHtml(str) {
            return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        function switchTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
            const targetTab = document.getElementById('tab-' + tabName);
            const targetBtn = document.getElementById('nav-' + tabName);
            if (targetTab) targetTab.classList.add('active');
            if (targetBtn) targetBtn.classList.add('active');

            if (tabName === 'sendeplan') loadSchedule();
            if (tabName === 'team') loadTeam();
            if (tabName === 'radio') loadRadioHistory();
            if (tabName === 'community') loadReactions();
            if (tabName === 'startseite') loadNews();
        }

        function togglePlay() {
            if (audio.paused) {
                audio.play().then(() => {
                    playBtn.innerText = "⏸️ Pausieren";
                    playBtn.classList.add('playing');
                }).catch(e => console.error("Play Fehler:", e));
            } else {
                audio.pause();
                playBtn.innerText = "▶️ Einschalten";
                playBtn.classList.remove('playing');
            }
        }

        function setVolume(val) { if (audio) audio.volume = parseFloat(val); }

        async function loadStreamMetadata() {
            try {
                const res = await fetch('/api/lautfm/current');
                if (!res.ok) return;
                const song = await res.json();
                if (song && (song.title || song.artist)) {
                    let titleText = song.title || '';
                    let artistText = '';
                    if (song.artist) {
                        if (typeof song.artist === 'string') artistText = song.artist;
                        else if (typeof song.artist === 'object' && song.artist.name) artistText = song.artist.name;
                    }
                    if (!artistText && titleText.includes(' - ')) {
                        const parts = titleText.split(' - ');
                        artistText = parts[0].trim();
                        titleText = parts.slice(1).join(' - ').trim();
                    }
                    if (artistEl) artistEl.innerText = artistText || '🔴 On Air';
                    if (titleEl) titleEl.innerText = titleText || 'Krachgarten Stream';
                }
            } catch (e) { console.error("Metadaten Fehler:", e); }
        }

        async function loadNews() {
            try {
                const res = await fetch('/api/news');
                if (!res.ok) return;
                const newsList = await res.json();
                const container = document.getElementById('news-container');
                if (!newsList || newsList.length === 0) {
                    container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Keine News vorhanden.</p>';
                    return;
                }
                container.innerHTML = newsList.map(item => \`
                    <div style="padding: 12px 0; border-bottom: 1px dashed #dcdde1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:bold; color:#e84118; font-size:1rem;">\${escapeHtml(item.title || item.headline || 'Mitteilung')}</span>
                            <span style="font-size:0.78rem; color:#7f8c8d;">\${escapeHtml(item.date || '')}</span>
                        </div>
                        \${item.author ? \`<div style="font-size:0.75rem; color:#0b4975; font-weight:bold; margin-top:2px;">Von: \${escapeHtml(item.author)}</div>\` : ''}
                        <div style="font-size:0.88rem; color:#2c3e50; margin-top:6px; line-height:1.4;">\${escapeHtml(item.content || item.text || item.message || '')}</div>
                    </div>
                \`).join('');
            } catch (e) { console.error("News Fehler:", e); }
        }

        async function loadSchedule() {
            try {
                const res = await fetch('/api/schedule');
                if (!res.ok) return;
                const plan = await res.json();
                const container = document.getElementById('sendeplan-container');
                if (!plan || plan.length === 0) {
                    container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Aktuell sind keine Sendungen im Sendeplan eingetragen.</p>';
                    return;
                }
                container.innerHTML = plan.map(item => \`
                    <div style="background:#f5f6fa; border-left:4px solid #ff6b35; padding:12px 15px; margin-bottom:10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <div style="font-weight:bold; color:#2f3640; font-size:0.95rem;">\${escapeHtml(item.title || item.show || 'Live Show')}</div>
                            <div style="font-size:0.8rem; color:#e84118; font-weight:bold; margin-top:2px;">Moderation: \${escapeHtml(item.dj || item.name || 'AutoDJ')}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.85rem; font-weight:bold; color:#0b4975;">\${escapeHtml(item.day || '')}</div>
                            <div style="font-size:0.8rem; color:#7f8c8d;">\${escapeHtml(item.time || '')}</div>
                        </div>
                    </div>
                \`).join('');
            } catch (e) { console.error("Sendeplan Fehler:", e); }
        }

        async function loadTeam() {
            try {
                const res = await fetch('/api/team');
                if (!res.ok) return;
                const team = await res.json();
                const container = document.getElementById('team-container');
                if (!team || team.length === 0) {
                    container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Keine Teammitglieder eingetragen.</p>';
                    return;
                }
                container.innerHTML = team.map(item => \`
                    <div style="background:#f5f6fa; border:1px solid #dcdde1; padding:12px; border-radius:6px; display:flex; align-items:center; gap:12px;">
                        <div style="width:45px; height:45px; background:#0b4975; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.2rem; flex-shrink:0;">
                            \${escapeHtml((item.name || 'T')[0].toUpperCase())}
                        </div>
                        <div>
                            <div style="font-weight:bold; color:#2f3640; font-size:0.95rem;">\${escapeHtml(item.name || 'Teammitglied')}</div>
                            <div style="font-size:0.8rem; color:#ff6b35; font-weight:bold;">\${escapeHtml(item.role || 'DJ')}</div>
                            \${item.desc || item.about ? \`<div style="font-size:0.78rem; color:#7f8c8d; margin-top:2px;">\${escapeHtml(item.desc || item.about)}</div>\` : ''}
                        </div>
                    </div>
                \`).join('');
            } catch (e) { console.error("Team Fehler:", e); }
        }

        async function loadRadioHistory() {
            try {
                const res = await fetch('/api/lautfm/history');
                if (!res.ok) return;
                const history = await res.json();
                const container = document.getElementById('history-container');
                if (!history || history.length === 0) {
                    container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Keine Historie verfügbar.</p>';
                    return;
                }
                container.innerHTML = history.map((item, idx) => \`
                    <div style="padding:8px 0; border-bottom:1px dashed #dcdde1; display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:0.9rem;">
                            <strong>\${escapeHtml(item.artist?.name || item.artist || 'Unbekannt')}</strong> - \${escapeHtml(item.title || '')}
                        </div>
                        <div style="font-size:0.75rem; color:#7f8c8d;">#\${idx + 1}</div>
                    </div>
                \`).join('');
            } catch (e) { console.error("Historie Fehler:", e); }
        }

        async function loadReactions() {
            try {
                const res = await fetch('/api/data');
                if (!res.ok) return;
                const data = await res.json();
                if (data.reactions) {
                    for (const [emoji, count] of Object.entries(data.reactions)) {
                        const el = document.getElementById('react-' + emoji);
                        if (el) el.innerText = count;
                    }
                }
            } catch (e) {}
        }

        async function sendReaction(emoji) {
            try {
                const res = await fetch('/api/reactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ emoji })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.reactions && data.reactions[emoji] !== undefined) {
                        const el = document.getElementById('react-' + emoji);
                        if (el) el.innerText = data.reactions[emoji];
                    }
                }
            } catch (e) {}
        }

        async function sendWish(e) {
            e.preventDefault();
            const name = document.getElementById('wish-name').value;
            const song = document.getElementById('wish-song').value;
            const message = document.getElementById('wish-msg').value;
            try {
                const res = await fetch('/api/wishes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, song, message })
                });
                if (res.ok) {
                    alert('🎉 Dein Wunsch wurde erfolgreich an das DJ-Pult gesendet!');
                    document.getElementById('wish-song').value = '';
                    document.getElementById('wish-msg').value = '';
                } else { alert('Fehler beim Senden des Wunsches.'); }
            } catch (err) { alert('Netzwerkfehler beim Senden.'); }
        }

        loadStreamMetadata();
        setInterval(loadStreamMetadata, 3000);
        loadNews();
    </script>
</body>
</html>`);
    console.log("🛠️ index_neu.html wurde automatisch im neuen Habbo-Design in /public erstellt.");
}

// 2. AUTOMATISCH login.html ERSTELLEN (FALLS FEHLT)
const loginHtmlPath = path.join(publicDir, 'login.html');
if (!fs.existsSync(loginHtmlPath)) {
    fs.writeFileSync(loginHtmlPath, `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login | krachgarten</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #121214; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: #202024; padding: 30px; border-radius: 12px; border: 1px solid #29292e; text-align: center; max-width: 350px; width: 100%; }
        input { width: 100%; padding: 10px; margin: 15px 0; background: #121214; border: 1px solid #29292e; color: #fff; border-radius: 6px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #ff4757; border: none; color: #fff; font-weight: bold; border-radius: 6px; cursor: pointer; }
        button:hover { background: #e03e4d; }
    </style>
</head>
<body>
    <div class="card">
        <h2>🔒 Admin Login</h2>
        <p style="color: #a8a8b3; font-size: 0.85rem; margin-top: 5px;">Zugang zu index_neu.html</p>
        <input type="password" id="password" placeholder="Admin-Passwort">
        <button onclick="login()">Einloggen 🚀</button>
        <p id="err" style="color:#ff4757; display:none; margin-top:10px; font-size:0.85rem;">Passwort falsch!</p>
    </div>
    <script>
        async function login(){
            const password = document.getElementById('password').value;
            const res = await fetch('/api/dev-login', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ password }) 
            });
            if(res.ok) { 
                window.location.href = '/index_neu.html'; 
            } else { 
                document.getElementById('err').style.display = 'block'; 
            }
        }
    </script>
</body>
</html>`);
    console.log("🛠️ login.html wurde automatisch in /public erstellt.");
}

// ==========================================
// MULTER SPEICHER-KONFIGURATION
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || (file.mimetype.startsWith('video') ? '.mp4' : '.jpg');
        cb(null, `private_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500 MB Max
});

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(uploadsDir)); // DIRECT STREAM ROUTE

// ==========================================
// SCHUTZ FÜR DIE NEUE BAUSTELLE (index_neu.html)
// ==========================================

// 1. Dev-Login API
app.post('/api/dev-login', async (req, res) => {
    try {
        const { password } = req.body;
        const data = await getOrInitData();
        const adminPass = data.passwords?.admin || "admin123";

        if (password === adminPass) {
            res.cookie('dev_auth', 'authenticated_admin', {
                maxAge: 7 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                sameSite: 'lax'
            });
            return res.json({ success: true });
        }
        return res.status(401).json({ error: "Falsches Passwort" });
    } catch (err) {
        return res.status(500).json({ error: "Serverfehler beim Login" });
    }
});

// 2. Türsteher-Route: Prüft Auth vor Auslieferung von index_neu.html
app.get(['/index_neu', '/index_neu.html'], (req, res) => {
    if (req.cookies && req.cookies.dev_auth === 'authenticated_admin') {
        return res.sendFile(path.join(publicDir, 'index_neu.html'));
    }
    res.redirect('/login.html');
});

// Statische Ordner-Freigabe (NACH der Geschützten Route!)
app.use(express.static(publicDir, { extensions: ['html'] }));

// ==========================================
// MONGO DB & SCHEMAS
// ==========================================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://niklasohms1_db_user:DEIN_PASSWORT@cluster0.gesrdze.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Erfolgreich mit MongoDB verbunden!"))
    .catch(err => console.error("❌ MongoDB Verbindungsfehler:", err));

const radioSchema = new mongoose.Schema({
    streamName: { type: String, default: "KrachGarten" },
    currentTitle: { type: String, default: "DJ AIR - 24/7 NON STOP" },
    isLive: { type: Boolean, default: false },
    isAutoDj: { type: Boolean, default: true },
    djName: { type: String, default: "" },
    reactions: {
        type: Object,
        default: { '🔥': 0, '💖': 0, '🎸': 0, '🎉': 0, '🍺': 0 }
    },
    passwords: {
        type: Object,
        default: { admin: "admin123", dj: "dj123", editor: "news123" }
    },
    schedule: { type: Array, default: [] },
    wishes: { type: Array, default: [] },
    news: { type: Array, default: [] },
    team: { type: Array, default: [] },
    privateMedia: { type: Array, default: [] }
});

const RadioData = mongoose.model('RadioData', radioSchema);

const pushSubSchema = new mongoose.Schema({
    endpoint: String,
    keys: Object
});
const PushSub = mongoose.model('PushSub', pushSubSchema);

// ==========================================
// HILFSFUNKTIONEN
// ==========================================
async function getOrInitData() {
    let data = await RadioData.findOne();
    if (!data) {
        data = await RadioData.create({
            streamName: "KrachGarten",
            currentTitle: "DJ AIR - 24/7 NON STOP",
            isLive: false,
            isAutoDj: true,
            djName: "",
            reactions: { '🔥': 0, '💖': 0, '🎸': 0, '🎉': 0, '🍺': 0 },
            passwords: { admin: "admin123", dj: "dj123", editor: "news123" },
            schedule: [],
            wishes: [],
            news: [],
            team: [],
            privateMedia: []
        });
    }
    return data;
}

function getGermanDateTime() {
    const now = new Date();
    const germanTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
    
    const currentDate = germanTime.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    const currentTime = germanTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    return `${currentDate} um ${currentTime} Uhr`;
}

// ==========================================
// LOGIN ROUTEN (ADMIN, DJ, EDITOR)
// ==========================================
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    const data = await getOrInitData();
    const pass = data.passwords?.admin || "admin123";
    
    if (username === "admin" && password === pass) {
        return res.json({ success: true });
    }
    res.status(401).json({ error: "Zugangsdaten falsch" });
});

app.post('/api/dj/login', async (req, res) => {
    const { username, password } = req.body;
    const data = await getOrInitData();
    const pass = data.passwords?.dj || "dj123";
    
    if ((username === "dj" || username === "djstudio") && password === pass) {
        return res.json({ success: true });
    }
    res.status(401).json({ error: "Zugangsdaten falsch" });
});

app.post('/api/editor/login', async (req, res) => {
    const { username, password } = req.body;
    const data = await getOrInitData();
    const pass = data.passwords?.editor || "news123";
    
    if ((username === "redakteur" || username === "editor") && password === pass) {
        return res.json({ success: true });
    }
    res.status(401).json({ error: "Zugangsdaten falsch" });
});

// ==========================================
// ALLGEMEINE ROUTEN & ADMIN-ROUTEN
// ==========================================
app.get(['/api/data', '/api/admin/data'], async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden" });
    }
});

app.post(['/api/data', '/api/admin/data', '/api/settings', '/api/dj/title'], async (req, res) => {
    try {
        let data = await getOrInitData();
        Object.assign(data, req.body);
        data.markModified('passwords');
        data.markModified('schedule');
        data.markModified('wishes');
        data.markModified('news');
        data.markModified('team');
        data.markModified('reactions');
        data.markModified('privateMedia');
        await data.save();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern" });
    }
});

// ==========================================
// PRIVATER BEREICH (UPLOAD & DELETE)
// ==========================================
app.post('/api/admin/private/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Keine Datei hochgeladen" });
        }

        const title = req.body.title;
        const filePublicUrl = `/uploads/${req.file.filename}`;
        const isVideo = req.file.mimetype.startsWith('video');

        const data = await getOrInitData();
        if (!Array.isArray(data.privateMedia)) data.privateMedia = [];

        const newMedia = {
            id: String(Date.now()),
            url: filePublicUrl,
            title: title || (isVideo ? '🎥 Video' : '🖼️ Foto'),
            type: isVideo ? 'video' : 'image',
            mimeType: req.file.mimetype,
            date: getGermanDateTime()
        };

        data.privateMedia.unshift(newMedia);
        data.markModified('privateMedia');
        await data.save();

        res.json({ success: true, privateMedia: data.privateMedia });
    } catch (err) {
        console.error("Upload-Fehler:", err);
        res.status(500).json({ error: "Fehler beim Verarbeiten der Datei" });
    }
});

app.delete('/api/admin/private/:id', async (req, res) => {
    try {
        const data = await getOrInitData();
        const mediaId = req.params.id;

        if (Array.isArray(data.privateMedia)) {
            const itemToDelete = data.privateMedia.find(m => String(m.id) === String(mediaId));
            if (itemToDelete && itemToDelete.url && itemToDelete.url.startsWith('/uploads/')) {
                const localPath = path.join(publicDir, itemToDelete.url);
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                }
            }

            data.privateMedia = data.privateMedia.filter(m => String(m.id) !== String(mediaId));
            data.markModified('privateMedia');
            await data.save();
        }

        res.json({ success: true, privateMedia: data.privateMedia });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen der Datei" });
    }
});

// ==========================================
// EMOJI REAKTIONEN ROUTE
// ==========================================
app.post('/api/reactions', async (req, res) => {
    try {
        const { emoji } = req.body;
        const data = await getOrInitData();
        
        if (!data.reactions) {
            data.reactions = { '🔥': 0, '💖': 0, '🎸': 0, '🎉': 0, '🍺': 0 };
        }

        if (data.reactions[emoji] !== undefined) {
            data.reactions[emoji] = (data.reactions[emoji] || 0) + 1;
            data.markModified('reactions');
            await data.save();
        }

        res.json({ success: true, reactions: data.reactions });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern der Reaktion" });
    }
});

// ==========================================
// PUSH NOTIFICATION ROUTEN
// ==========================================
app.post('/api/push/subscribe', async (req, res) => {
    try {
        const subscription = req.body;
        if (subscription && subscription.endpoint) {
            const exists = await PushSub.findOne({ endpoint: subscription.endpoint });
            if (!exists) {
                await PushSub.create(subscription);
            }
        }
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Abonnieren" });
    }
});

// ==========================================
// TEAM ROUTEN
// ==========================================
app.get(['/api/team', '/api/admin/team'], async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.team || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden des Teams" });
    }
});

app.post(['/api/team', '/api/admin/team'], async (req, res) => {
    try {
        const data = await getOrInitData();
        if (Array.isArray(req.body)) {
            data.team = req.body;
        } else {
            const newMember = { id: Date.now(), ...req.body };
            data.team.push(newMember);
        }
        data.markModified('team');
        await data.save();
        res.json({ success: true, team: data.team });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Teams" });
    }
});

app.delete('/api/admin/team/:id', async (req, res) => {
    try {
        const data = await getOrInitData();
        data.team = data.team.filter(m => String(m.id) !== String(req.params.id));
        data.markModified('team');
        await data.save();
        res.json({ success: true, team: data.team });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen des Teammitglieds" });
    }
});

// ==========================================
// NEWS ROUTEN
// ==========================================
app.get(['/api/news', '/api/admin/news'], async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.news || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden der News" });
    }
});

app.post(['/api/news', '/api/admin/news'], async (req, res) => {
    try {
        const data = await getOrInitData();
        const defaultDateTime = getGermanDateTime();

        if (Array.isArray(req.body)) {
            data.news = req.body.map(item => ({
                ...item,
                date: (item.date && item.date !== "undefined") ? item.date : defaultDateTime
            }));
        } else {
            const newEntry = {
                id: Date.now(),
                ...req.body,
                date: (req.body.date && req.body.date !== "undefined") 
                    ? req.body.date 
                    : defaultDateTime
            };
            data.news.unshift(newEntry);
        }
        
        data.markModified('news');
        await data.save();
        res.json({ success: true, news: data.news });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern der News" });
    }
});

app.delete(['/api/news/:id', '/api/admin/news/:id'], async (req, res) => {
    try {
        const data = await getOrInitData();
        const newsId = req.params.id;
        
        data.news = data.news.filter(n => String(n.id) !== String(newsId));
        data.markModified('news');
        await data.save();
        
        res.json({ success: true, news: data.news });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen der News" });
    }
});

// ==========================================
// SENDEPLAN ROUTEN & AUTO-CLEANUP
// ==========================================
const schedulePaths = [
    '/api/schedule', '/api/admin/schedule', '/api/dj/schedule',
    '/api/sendeplan', '/api/admin/sendeplan', '/api/dj/sendeplan',
    '/api/plan', '/api/admin/plan', '/api/dj/plan'
];

function isShowExpired(entry) {
    if (!entry.endTime && !entry.time) return false;

    try {
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
        const dayInput = (entry.day || '').trim().toLowerCase();
        const daysOfWeek = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
        const currentDayIdx = now.getDay();

        if (dayInput === 'morgen') return false;
        
        if (daysOfWeek.includes(dayInput)) {
            const entryDayIdx = daysOfWeek.indexOf(dayInput);
            if (entryDayIdx > currentDayIdx) return false;
            if (entryDayIdx < currentDayIdx) return true; 
        }

        const dateMatch = dayInput.match(/(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/);
        if (dateMatch) {
            const day = parseInt(dateMatch[1], 10);
            const month = parseInt(dateMatch[2], 10) - 1;
            const year = dateMatch[3] ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3], 10) : parseInt(dateMatch[3], 10)) : now.getFullYear();

            const entryDate = new Date(year, month, day);
            const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (entryDate > todayDate) return false;
            if (entryDate < todayDate) return true; 
        }

        let endTimeStr = entry.endTime || entry.time.split('-')[1] || entry.time;
        endTimeStr = endTimeStr.trim();

        const [hours, minutes] = endTimeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return false;

        const showEndTime = new Date(now);
        showEndTime.setHours(hours, minutes, 0, 0);

        return now > showEndTime;

    } catch (e) {
        return false;
    }
}

async function cleanupExpiredSchedule() {
    try {
        const data = await getOrInitData();
        if (Array.isArray(data.schedule) && data.schedule.length > 0) {
            const initialLength = data.schedule.length;
            data.schedule = data.schedule.filter(entry => !isShowExpired(entry));
            
            if (data.schedule.length !== initialLength) {
                data.markModified('schedule');
                await data.save();
                console.log("🧹 Abgelaufene Sendung(en) automatisch entfernt.");
            }
        }
    } catch (err) {
        console.error("Fehler bei Sendeplan-Bereinigung:", err);
    }
}

setInterval(cleanupExpiredSchedule, 60 * 1000);

app.get(schedulePaths, async (req, res) => {
    try {
        await cleanupExpiredSchedule();
        const data = await getOrInitData();
        res.json(data.schedule || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden des Sendeplans" });
    }
});

app.post(schedulePaths, async (req, res) => {
    try {
        const data = await getOrInitData();
        if (!Array.isArray(data.schedule)) data.schedule = [];

        if (Array.isArray(req.body)) {
            data.schedule = req.body;
        } else if (req.body && typeof req.body === 'object') {
            const djName = req.body.dj || req.body.name || req.body.artist || "DJ";
            const newEntry = {
                id: Date.now(),
                ...req.body,
                dj: djName,
                name: djName
            };
            data.schedule.push(newEntry);
        }

        data.markModified('schedule');
        await data.save();
        res.json({ success: true, schedule: data.schedule });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Sendeplans" });
    }
});

app.delete(schedulePaths.map(p => `${p}/:id`), async (req, res) => {
    try {
        const data = await getOrInitData();
        const entryId = req.params.id;
        
        if (Array.isArray(data.schedule)) {
            data.schedule = data.schedule.filter(s => String(s.id) !== String(entryId));
            data.markModified('schedule');
            await data.save();
        }
        
        res.json({ success: true, schedule: data.schedule });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen der Sendung" });
    }
});

// ==========================================
// WÜNSCHE ROUTEN
// ==========================================
app.get(['/api/wishes', '/api/admin/wishes', '/api/wish', '/api/admin/wish'], async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.wishes || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden der Wünsche" });
    }
});

app.post(['/api/wishes', '/api/admin/wishes', '/api/wish', '/api/admin/wish'], async (req, res) => {
    try {
        const data = await getOrInitData();
        
        if (Array.isArray(req.body)) {
            data.wishes = req.body;
        } else {
            const now = new Date();
            const germanTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
            const currentTime = germanTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

            const newWish = {
                id: Date.now(),
                time: currentTime,
                type: req.body.type || "Musikwunsch",
                name: req.body.name || "Anonym",
                song: req.body.song || "",
                message: req.body.message || req.body.text || "",
                ...req.body
            };
            data.wishes.unshift(newWish);
        }
        
        data.markModified('wishes');
        await data.save();
        res.json({ success: true, wishes: data.wishes, wish: data.wishes[0] });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Wunsches" });
    }
});

app.delete(['/api/wishes/:id', '/api/admin/wishes/:id', '/api/wish/:id', '/api/admin/wish/:id'], async (req, res) => {
    try {
        const data = await getOrInitData();
        const wishId = req.params.id;
        
        data.wishes = data.wishes.filter(w => String(w.id) !== String(wishId));
        data.markModified('wishes');
        await data.save();
        
        res.json({ success: true, wishes: data.wishes });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen des Wunsches" });
    }
});

// ==========================================
// LAUT.FM API PROXY (FEHLERFREI & ROBUST)
// ==========================================
const LAUTFM_STATION = 'xoticradio';

function fetchLautFm(pathSuffix) {
    return new Promise((resolve) => {
        const cleanSuffix = pathSuffix.startsWith('/') ? pathSuffix : '/' + pathSuffix;
        const options = {
            hostname: 'api.laut.fm',
            path: `/station/${LAUTFM_STATION}${cleanSuffix}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        };

        https.get(options, (apiRes) => {
            let body = '';
            apiRes.on('data', chunk => body += chunk);
            apiRes.on('end', () => {
                try {
                    if (apiRes.statusCode === 200) {
                        resolve(JSON.parse(body));
                    } else {
                        console.error(`Laut.fm HTTP Status ${apiRes.statusCode} für ${cleanSuffix}`);
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.error("Laut.fm Verbindungsfehler:", err.message);
            resolve(null);
        });
    });
}

app.get('/api/lautfm/current', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    try {
        // 1. Primären Song abfragen
        let song = await fetchLautFm('/current_song');

        // 2. Prüfen, ob der gelieferte Song abgelaufen ist
        let isExpired = false;
        if (song && song.ends_at) {
            const endsAtMs = Date.parse(song.ends_at);
            if (!isNaN(endsAtMs) && Date.now() > endsAtMs + 3000) {
                isExpired = true;
            }
        }

        // 3. Falls leer oder abgelaufen -> aus Historie nachladen
        if (!song || !song.title || isExpired) {
            const history = await fetchLautFm('/last_songs');
            if (Array.isArray(history) && history.length > 0) {
                song = history[0];
            }
        }

        res.json(song || {});
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden des Songs" });
    }
});

app.get('/api/lautfm/history', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const history = await fetchLautFm('/last_songs');
    res.json(history || []);
});

app.get('/api/lautfm/station', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const station = await fetchLautFm('');
    res.json(station || {});
});

// SERVER START
app.listen(PORT, () => {
    console.log(`Radio-Server läuft auf Port ${PORT}`);
});

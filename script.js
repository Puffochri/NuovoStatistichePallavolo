const STORAGE_KEY = "volley_stats_pwa_pro";

let state = {
    teamA: "",
    teamB: "",
    matchDate: "",
    matchPlace: "",
    currentSet: 1,
    sets: {
        1: [],
        2: [],
        3: [],
        4: [],
        5: []
    },
    scores: {
        1: { A: 0, B: 0 },
        2: { A: 0, B: 0 },
        3: { A: 0, B: 0 },
        4: { A: 0, B: 0 },
        5: { A: 0, B: 0 }
    },
    rotation: [1, 2, 3, 4, 5, 6],
    sideSwitched: false
};

const fieldsOrder = [
    "attPos", "attNeg",
    "difPos", "difNeg",
    "battPos", "battNeg",
    "ricezPos", "ricezNeg",
    "muro", "muroPunto", "muroFuori",
    "papere"
];

document.addEventListener("DOMContentLoaded", () => {
    loadFromStorage();
    bindUI();
    renderAll();
    applySavedTheme();
});

function bindUI() {
    document.getElementById("addPlayer").addEventListener("click", addPlayer);
    document.getElementById("reset").addEventListener("click", resetAll);

    document.getElementById("teamA").addEventListener("input", e => {
        state.teamA = e.target.value;
        saveAndRenderHeader();
        renderScoreHeaderLabels();
    });
    document.getElementById("teamB").addEventListener("input", e => {
        state.teamB = e.target.value;
        saveAndRenderHeader();
        renderScoreHeaderLabels();
    });
    document.getElementById("matchDate").addEventListener("input", e => {
        state.matchDate = e.target.value;
        saveAndRenderHeader();
    });
    document.getElementById("matchPlace").addEventListener("input", e => {
        state.matchPlace = e.target.value;
        saveAndRenderHeader();
    });

    document.querySelectorAll(".set-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".set-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.currentSet = parseInt(btn.dataset.set, 10);
            document.getElementById("labelSet").textContent = state.currentSet;
            document.getElementById("labelSetReport").textContent = state.currentSet;
            renderPlayers();
            renderCourt(true);
            renderScores();
            saveToStorage();
        });
    });

    document.getElementById("pdfSet").addEventListener("click", () => exportPDF(false));
    document.getElementById("pdfFinale").addEventListener("click", () => exportPDF(true));
    document.getElementById("pdfPagelle").addEventListener("click", exportPagellePDF);


    document.getElementById("playersBody").addEventListener("click", handleTableClick);

    document.getElementById("themeToggle").addEventListener("click", toggleTheme);

    document.getElementById("rotateClockwise").addEventListener("click", () => {
        rotateClockwise();
        renderCourt(true);
        saveToStorage();
    });

    document.getElementById("switchSide").addEventListener("click", () => {
        state.sideSwitched = !state.sideSwitched;
        const court = document.getElementById("court");
        court.classList.toggle("switched", state.sideSwitched);
        renderCourt(true);
        saveToStorage();
    });

    document.querySelectorAll(".score-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const team = btn.dataset.team;
            const delta = parseInt(btn.dataset.delta, 10);
            adjustScore(team, delta);
        });
    });
}

function addPlayer() {
    const nameInput = document.getElementById("playerName");
    const roleInput = document.getElementById("playerRole");

    const name = nameInput.value.trim();
    const role = roleInput.value;

    if (!name) return;

    const player = {
        name,
        role,
        attPos: 0, attNeg: 0,
        difPos: 0, difNeg: 0,
        battPos: 0, battNeg: 0,
        ricezPos: 0, ricezNeg: 0,
        muro: 0, muroPunto: 0, muroFuori: 0,
        papere: 0
    };

    state.sets[state.currentSet].push(player);

    nameInput.value = "";
    roleInput.value = "P";

    renderPlayers(true);
    renderCourt(true);
    saveToStorage();
}

function handleTableClick(e) {
    const target = e.target;
    const row = target.closest("tr");
    if (!row) return;

    const index = parseInt(row.dataset.index, 10);
    const players = state.sets[state.currentSet];
    const player = players[index];

    if (target.classList.contains("plus") || target.classList.contains("minus")) {
        const field = target.dataset.field;
        if (!field) return;
        const delta = target.classList.contains("plus") ? 1 : -1;
        player[field] = Math.max(0, (player[field] || 0) + delta);
        renderPlayers();
        saveToStorage();
        row.classList.add("updated");
        setTimeout(() => row.classList.remove("updated"), 200);
    }

    if (target.classList.contains("delete")) {
        players.splice(index, 1);
        renderPlayers();
        renderCourt(true);
        saveToStorage();
    }
}

function renderAll() {
    document.getElementById("teamA").value = state.teamA;
    document.getElementById("teamB").value = state.teamB;
    document.getElementById("matchDate").value = state.matchDate || "";
    document.getElementById("matchPlace").value = state.matchPlace || "";
    saveAndRenderHeader(false);
    renderScoreHeaderLabels();

    document.getElementById("labelSet").textContent = state.currentSet;
    document.getElementById("labelSetReport").textContent = state.currentSet;
    document.querySelectorAll(".set-btn").forEach(btn => {
        btn.classList.toggle("active", parseInt(btn.dataset.set, 10) === state.currentSet);
    });

    const court = document.getElementById("court");
    court.classList.toggle("switched", state.sideSwitched);

    renderPlayers();
    renderCourt(false);
    renderScores();
}

function renderPlayers(scrollToBottom = false) {
    const tbody = document.getElementById("playersBody");
    tbody.innerHTML = "";

    const players = state.sets[state.currentSet];

    players.forEach((p, idx) => {
        const tr = document.createElement("tr");
        tr.dataset.index = idx;

        let html = `<td>${p.name}</td>`;
        html += `<td>${p.role || "-"}</td>`;

        fieldsOrder.forEach(field => {
            html += `
                <td>
                    <span class="minus" data-field="${field}">-</span>
                    <span class="value">${p[field]}</span>
                    <span class="plus" data-field="${field}">+</span>
                </td>
            `;
        });

        const perc = calcPercentages(p);
        const totalActions = fieldsOrder.reduce((sum, f) => sum + (p[f] || 0), 0);

        html += `
            <td>${perc.att.toFixed(0)}%</td>
            <td>${perc.dif.toFixed(0)}%</td>
            <td>${perc.bat.toFixed(0)}%</td>
            <td>${perc.rcz.toFixed(0)}%</td>
            <td>${perc.muro.toFixed(0)}%</td>
            <td>${totalActions}</td>
        `;

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });

    renderTotals();
    renderSummary();
    highlightBestPlayers();

    if (scrollToBottom) {
        const wrapper = document.querySelector(".table-wrapper");
        wrapper.scrollTop = wrapper.scrollHeight;
    }
}

function renderTotals() {
    const players = state.sets[state.currentSet];
    const totals = {
        attPos: 0, attNeg: 0,
        difPos: 0, difNeg: 0,
        battPos: 0, battNeg: 0,
        ricezPos: 0, ricezNeg: 0,
        muro: 0, muroPunto: 0, muroFuori: 0,
        papere: 0
    };

    players.forEach(p => {
        fieldsOrder.forEach(f => totals[f] += p[f]);
    });

    const row = document.getElementById("totalsRow");
    const cells = row.querySelectorAll("td");

    let i = 2; // 0=Totali,1=ruolo vuoto
    fieldsOrder.forEach(f => {
        cells[i].textContent = totals[f];
        i++;
    });

    const perc = calcPercentages(totals);
    cells[i++].textContent = perc.att.toFixed(0) + "%";
    cells[i++].textContent = perc.dif.toFixed(0) + "%";
    cells[i++].textContent = perc.bat.toFixed(0) + "%";
    cells[i++].textContent = perc.rcz.toFixed(0) + "%";
    cells[i++].textContent = perc.muro.toFixed(0) + "%";
}

function renderSummary() {
    const players = state.sets[state.currentSet];
    document.getElementById("summaryPlayers").textContent = players.length;

    let totalActions = 0;
    players.forEach(p => {
        fieldsOrder.forEach(f => totalActions += p[f]);
    });
    document.getElementById("summaryActions").textContent = totalActions;

    const bestAtt = getBestPlayerBy("att");
    const bestRcz = getBestPlayerBy("rcz");

    document.getElementById("summaryBestAtt").textContent = bestAtt || "-";
    document.getElementById("summaryBestRcz").textContent = bestRcz || "-";

    // MVP MOMENTANEO
    const mvp = getMVP();
    document.getElementById("summaryMVP").textContent = mvp || "-";
}


function getBestPlayerBy(type) {
    const players = state.sets[state.currentSet];
    let bestName = null;
    let bestVal = 0;

    players.forEach(p => {
        const perc = calcPercentages(p);
        const val = perc[type];
        const attempts = p.attPos + p.attNeg + p.ricezPos + p.ricezNeg;
        if (val > bestVal && attempts > 0) {
            bestVal = val;
            bestName = `${p.name} (${val.toFixed(0)}%)`;
        }
    });

    return bestName; 
}

function getMVP() {
    const players = state.sets[state.currentSet];
    let best = null;
    let bestScore = -999;

    players.forEach(p => {
        const score =
            (p.attPos * 1.2) +
            (p.difPos * 1.0) +
            (p.battPos * 1.0) +
            (p.ricezPos * 1.1) +
            (p.muroPunto * 1.5) -
            (p.attNeg * 1.0) -
            (p.difNeg * 0.8) -
            (p.battNeg * 0.8) -
            (p.ricezNeg * 0.8) -
            (p.papere * 2);

        if (score > bestScore) {
            bestScore = score;
            best = `${p.name} (${score.toFixed(1)})`;
        }
    });

    return best;
}


function highlightBestPlayers() {
    const players = state.sets[state.currentSet];
    let bestIndex = -1;
    let bestVal = 0;

    players.forEach((p, idx) => {
        const perc = calcPercentages(p);
        if (perc.att > bestVal && (p.attPos + p.attNeg) > 0) {
            bestVal = perc.att;
            bestIndex = idx;
        }
    });

    document.querySelectorAll("#playersBody tr").forEach((tr, idx) => {
        tr.classList.toggle("best-player", idx === bestIndex);
    });
}

function calcPercentages(obj) {
    const attTot = obj.attPos + obj.attNeg;
    const difTot = obj.difPos + obj.difNeg;
    const batTot = obj.battPos + obj.battNeg;
    const rczTot = obj.ricezPos + obj.ricezNeg;
    const muroTot = obj.muro + obj.muroPunto + obj.muroFuori;

    return {
        att: attTot ? (obj.attPos / attTot) * 100 : 0,
        dif: difTot ? (obj.difPos / difTot) * 100 : 0,
        bat: batTot ? (obj.battPos / batTot) * 100 : 0,
        rcz: rczTot ? (obj.ricezPos / rczTot) * 100 : 0,
        muro: muroTot ? (obj.muroPunto / muroTot) * 100 : 0
    };
}

/* CAMPO PRO: RUOLI, ROTAZIONI, LIBERO */

function renderCourt(withAnimation) {
    const court = document.getElementById("court");
    const sideA = court.querySelector(".court-side-a");
    const posDivs = sideA.querySelectorAll(".pos");

    posDivs.forEach(div => div.innerHTML = "");

    const players = state.sets[state.currentSet];
    const firstSix = players.slice(0, 6);

    // Mappa ruoli → posizioni fisse
    const roleToPos = {
        "P": [1],      // Palleggio
        "O": [2],      // Opposto
        "C": [3, 6],   // Centrali
        "B": [4, 5],   // Bande
        "L": ["libero"]
    };

    const assigned = {};

    // 1) Assegna i ruoli alle posizioni BASE
    firstSix.forEach(player => {
        if (player.role === "L") return;

        const positions = roleToPos[player.role];
        if (!positions) return;

        for (let pos of positions) {
            if (!assigned[pos]) {
                assigned[pos] = player;
                break;
            }
        }
    });

    // 2) Applica la rotazione alle posizioni
    const rotatedAssigned = {};
    Object.keys(assigned).forEach(basePos => {
        const player = assigned[basePos];

        // Trova la posizione ruotata
        const index = state.rotation.indexOf(parseInt(basePos));
        const rotatedPos = state.rotation[index];

        rotatedAssigned[rotatedPos] = player;
    });

    // 3) Libero sostituisce centrale in seconda linea (5, 6, 1)
    const libero = firstSix.find(p => p.role === "L");
    if (libero) {
        const backRow = [5, 6, 1];
        for (let pos of backRow) {
            if (rotatedAssigned[pos] && rotatedAssigned[pos].role === "C") {
                rotatedAssigned[pos] = libero;
                break;
            }
        }
    }

    // 4) Disegna i giocatori nelle posizioni ruotate
    Object.keys(rotatedAssigned).forEach(pos => {
        const player = rotatedAssigned[pos];
        const targetDiv = sideA.querySelector(`.pos-${pos}`);
        if (!targetDiv) return;

        const dot = document.createElement("div");
        dot.className = `player-dot role-${player.role}`;

        const nameSpan = document.createElement("div");
        nameSpan.className = "player-dot-name";
        nameSpan.textContent = player.name;

        const roleSpan = document.createElement("div");
        roleSpan.className = "player-dot-role";
        roleSpan.textContent = player.role;

        dot.appendChild(nameSpan);
        dot.appendChild(roleSpan);

        const indexInFirstSix = firstSix.indexOf(player);
        dot.onclick = () => openSubstitutionMenu(indexInFirstSix);

        targetDiv.appendChild(dot);
    });

    if (withAnimation) {
        court.classList.add("court-animate");
        setTimeout(() => court.classList.remove("court-animate"), 350);
    }
}



function rotateClockwise() {
    // Ruota le posizioni (1→6→5→4→3→2→1)
    const arr = state.rotation;
    const last = arr.pop();
    arr.unshift(last);

    // Dopo la rotazione, ridisegna il campo
    renderCourt(true);
    saveToStorage();
}


/* SOSTITUZIONI */

function substitutePlayer(outIndex, inIndex) {
    const players = state.sets[state.currentSet];
    if (!players[outIndex] || !players[inIndex]) return;

    const temp = players[outIndex];
    players[outIndex] = players[inIndex];
    players[inIndex] = temp;

    renderPlayers();
    renderCourt(true);
    saveToStorage();
}

function openSubstitutionMenu(positionIndex) {
    const players = state.sets[state.currentSet];
    const outPlayer = players[positionIndex];
    if (!outPlayer) return;

    const nameOut = outPlayer.name;

    const available = players
        .map((p, i) => ({ name: p.name, index: i }))
        .filter(p => p.index !== positionIndex);

    if (available.length === 0) {
        alert("Non ci sono altri giocatori per la sostituzione.");
        return;
    }

    const names = available.map(p => p.name).join("\n");

    const chosen = prompt(
        `Sostituzione:\nEsce: ${nameOut}\n\nChi entra? Scrivi il nome esattamente come in lista:\n\n${names}`
    );

    if (!chosen) return;

    const found = available.find(p => p.name === chosen);
    if (!found) {
        alert("Nome non valido.");
        return;
    }

    substitutePlayer(positionIndex, found.index);
}

/* PUNTEGGI SET */

function adjustScore(team, delta) {
    const set = state.currentSet;
    const score = state.scores[set][team];
    const newScore = Math.max(0, score + delta);
    state.scores[set][team] = newScore;
    renderScores();
    saveToStorage();
}

function renderScores() {
    const set = state.currentSet;
    const scoreA = state.scores[set].A;
    const scoreB = state.scores[set].B;

    document.getElementById("scoreA").textContent = scoreA;
    document.getElementById("scoreB").textContent = scoreB;

    const list = document.getElementById("setsResultList");
    list.innerHTML = "";

    for (let i = 1; i <= 5; i++) {
        const sA = state.scores[i].A;
        const sB = state.scores[i].B;
        if (sA === 0 && sB === 0) continue;

        const li = document.createElement("li");
        li.innerHTML = `Set ${i}: <span>${sA} - ${sB}</span>`;
        list.appendChild(li);
    }
}

function renderScoreHeaderLabels() {
    document.getElementById("labelTeamA_live").textContent = state.teamA || "Team A";
    document.getElementById("labelTeamB_live").textContent = state.teamB || "Team B";
}

/* STORAGE, TEMA, PDF */

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn("Impossibile salvare in localStorage", e);
    }
}

function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        state = Object.assign(state, parsed);
        for (let i = 1; i <= 5; i++) {
            if (!state.sets[i]) state.sets[i] = [];
            if (!state.scores[i]) state.scores[i] = { A: 0, B: 0 };
        }
        if (!state.rotation) state.rotation = [1,2,3,4,5,6];
        if (typeof state.sideSwitched !== "boolean") state.sideSwitched = false;
    } catch (e) {
        console.warn("Impossibile leggere da localStorage", e);
    }
}

function resetAll() {
    if (!confirm("Sei sicuro di voler cancellare tutti i dati su questo dispositivo?")) return;
    state = {
        teamA: "",
        teamB: "",
        matchDate: "",
        matchPlace: "",
        currentSet: 1,
        sets: {1: [], 2: [], 3: [], 4: [], 5: []},
        scores: {
            1: { A: 0, B: 0 },
            2: { A: 0, B: 0 },
            3: { A: 0, B: 0 },
            4: { A: 0, B: 0 },
            5: { A: 0, B: 0 }
        },
        rotation: [1,2,3,4,5,6],
        sideSwitched: false
    };
    saveToStorage();
    renderAll();
}

function saveAndRenderHeader(save = true) {
    document.getElementById("labelTeamA").textContent = state.teamA || "Team A";
    document.getElementById("labelTeamB").textContent = state.teamB || "Team B";
    document.getElementById("labelDate").textContent = state.matchDate || "-";
    document.getElementById("labelPlace").textContent = state.matchPlace || "-";
    if (save) saveToStorage();
}

/* PDF: STRUTTURA PULITA, ORIZZONTALE E PROFESSIONALE */

function exportPDF(isFinale) {
    const players = state.sets[state.currentSet];

    /* COPERTINA ELEGANTE */
    let html = `
        <div style="text-align:center; margin-bottom:25px;">
            <h1 style="margin:0; font-size:26px;">Statistiche Pallavolo</h1>
            <h2 style="margin:5px 0 10px; font-size:20px;">
                ${state.teamA || "Team A"} vs ${state.teamB || "Team B"}
            </h2>
            <p style="font-size:14px; margin:0;">
                <b>Set:</b> ${state.currentSet} &nbsp;&nbsp; 
                <b>Data:</b> ${state.matchDate || "-"} &nbsp;&nbsp; 
                <b>Luogo:</b> ${state.matchPlace || "-"}
            </p>
            <hr style="margin-top:20px; border:0; border-top:2px solid #333;">
        </div>
    `;

    /* INIZIO TABELLA MIGLIORATA */
    html += `
        <table style="
            width:100%;
            border-collapse:collapse;
            font-size:11px;
            text-align:center;
        ">
            <thead>
                <tr style="background:#e5e7eb;">
                    <th style="padding:6px; border:1px solid #ccc;">Giocatore</th>
                    <th style="padding:6px; border:1px solid #ccc;">Ruolo</th>
                    <th style="padding:6px; border:1px solid #ccc;">Att+</th>
                    <th style="padding:6px; border:1px solid #ccc;">Att-</th>
                    <th style="padding:6px; border:1px solid #ccc;">Dif+</th>
                    <th style="padding:6px; border:1px solid #ccc;">Dif-</th>
                    <th style="padding:6px; border:1px solid #ccc;">Bat+</th>
                    <th style="padding:6px; border:1px solid #ccc;">Bat-</th>
                    <th style="padding:6px; border:1px solid #ccc;">Rcz+</th>
                    <th style="padding:6px; border:1px solid #ccc;">Rcz-</th>
                    <th style="padding:6px; border:1px solid #ccc;">Muro</th>
                    <th style="padding:6px; border:1px solid #ccc;">MuroP</th>
                    <th style="padding:6px; border:1px solid #ccc;">MuroF</th>
                    <th style="padding:6px; border:1px solid #ccc;">Papere</th>
                    <th style="padding:6px; border:1px solid #ccc;">%Att</th>
                    <th style="padding:6px; border:1px solid #ccc;">%Dif</th>
                    <th style="padding:6px; border:1px solid #ccc;">%Bat</th>
                    <th style="padding:6px; border:1px solid #ccc;">%Rcz</th>
                    <th style="padding:6px; border:1px solid #ccc;">%Muro+</th>
                </tr>
            </thead>
            <tbody>
    `;

    /* RIGHE GIOCATORI */
    players.forEach((p, i) => {
        const perc = calcPercentages(p);

        html += `
            <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'};">
                <td style="padding:6px; border:1px solid #ddd;">${p.name}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.role || "-"}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.attPos}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.attNeg}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.difPos}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.difNeg}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.battPos}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.battNeg}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.ricezPos}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.ricezNeg}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.muro}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.muroPunto}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.muroFuori}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.papere}</td>
                <td style="padding:6px; border:1px solid #ddd;">${perc.att.toFixed(0)}%</td>
                <td style="padding:6px; border:1px solid #ddd;">${perc.dif.toFixed(0)}%</td>
                <td style="padding:6px; border:1px solid #ddd;">${perc.bat.toFixed(0)}%</td>
                <td style="padding:6px; border:1px solid #ddd;">${perc.rcz.toFixed(0)}%</td>
                <td style="padding:6px; border:1px solid #ddd;">${perc.muro.toFixed(0)}%</td>
            </tr>
        `;
    });

    /* TOTALI */
    const totals = {
        attPos: 0, attNeg: 0,
        difPos: 0, difNeg: 0,
        battPos: 0, battNeg: 0,
        ricezPos: 0, ricezNeg: 0,
        muro: 0, muroPunto: 0, muroFuori: 0,
        papere: 0
    };
    players.forEach(p => fieldsOrder.forEach(f => totals[f] += p[f]));
    const percTot = calcPercentages(totals);

    html += `
            <tr style="background:#d1d5db; font-weight:bold;">
                <td style="padding:6px; border:1px solid #aaa;">Totali</td>
                <td style="border:1px solid #aaa;"></td>
                <td style="border:1px solid #aaa;">${totals.attPos}</td>
                <td style="border:1px solid #aaa;">${totals.attNeg}</td>
                <td style="border:1px solid #aaa;">${totals.difPos}</td>
                <td style="border:1px solid #aaa;">${totals.difNeg}</td>
                <td style="border:1px solid #aaa;">${totals.battPos}</td>
                <td style="border:1px solid #aaa;">${totals.battNeg}</td>
                <td style="border:1px solid #aaa;">${totals.ricezPos}</td>
                <td style="border:1px solid #aaa;">${totals.ricezNeg}</td>
                <td style="border:1px solid #aaa;">${totals.muro}</td>
                <td style="border:1px solid #aaa;">${totals.muroPunto}</td>
                <td style="border:1px solid #aaa;">${totals.muroFuori}</td>
                <td style="border:1px solid #aaa;">${totals.papere}</td>
                <td style="border:1px solid #aaa;">${percTot.att.toFixed(0)}%</td>
                <td style="border:1px solid #aaa;">${percTot.dif.toFixed(0)}%</td>
                <td style="border:1px solid #aaa;">${percTot.bat.toFixed(0)}%</td>
                <td style="border:1px solid #aaa;">${percTot.rcz.toFixed(0)}%</td>
                <td style="border:1px solid #aaa;">${percTot.muro.toFixed(0)}%</td>
            </tr>
        </tbody>
        </table>
    `;

    /* GENERAZIONE PDF */
    const container = document.createElement("div");
    container.innerHTML = html;

    const opt = {
        margin: 5,
        filename: isFinale
            ? `statistiche_volley_finale_set${state.currentSet}.pdf`
            : `statistiche_volley_set${state.currentSet}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().from(container).set(opt).save();
}


function exportPagellePDF() {
    /* 1) SOMMO LE STATISTICHE DI TUTTI I SET */
    const allPlayersMap = {};

    for (let s = 1; s <= 5; s++) {
        const setPlayers = state.sets[s];

        setPlayers.forEach(p => {
            if (!allPlayersMap[p.name]) {
                allPlayersMap[p.name] = {
                    name: p.name,
                    role: p.role,
                    attPos: 0, attNeg: 0,
                    difPos: 0, difNeg: 0,
                    battPos: 0, battNeg: 0,
                    ricezPos: 0, ricezNeg: 0,
                    muro: 0, muroPunto: 0, muroFuori: 0,
                    papere: 0
                };
            }

            const agg = allPlayersMap[p.name];
            agg.attPos += p.attPos;
            agg.attNeg += p.attNeg;
            agg.difPos += p.difPos;
            agg.difNeg += p.difNeg;
            agg.battPos += p.battPos;
            agg.battNeg += p.battNeg;
            agg.ricezPos += p.ricezPos;
            agg.ricezNeg += p.ricezNeg;
            agg.muro += p.muro;
            agg.muroPunto += p.muroPunto;
            agg.muroFuori += p.muroFuori;
            agg.papere += p.papere;
        });
    }

    const players = Object.values(allPlayersMap);

    /* 2) COPERTINA PROFESSIONALE */
    let html = `
        <div style="text-align:center; margin-bottom:25px;">
            <h1 style="margin:0; font-size:26px;">Pagelle Finali della Partita</h1>
            <h2 style="margin:5px 0 10px; font-size:20px;">
                ${state.teamA || "Team A"} vs ${state.teamB || "Team B"}
            </h2>
            <p style="font-size:14px; margin:0;">
                <b>Data:</b> ${state.matchDate || "-"} &nbsp;&nbsp; 
                <b>Luogo:</b> ${state.matchPlace || "-"}
            </p>
            <p style="font-size:14px; margin-top:5px;"><b>Resoconto di tutti i set</b></p>
            <hr style="margin-top:20px; border:0; border-top:2px solid #333;">
        </div>
    `;

    /* 3) TABELLA MIGLIORATA */
    html += `
        <table style="
            width:100%;
            border-collapse:collapse;
            font-size:12px;
            text-align:center;
        ">
            <thead>
                <tr style="background:#e5e7eb;">
                    <th style="padding:6px; border:1px solid #ccc;">Giocatore</th>
                    <th style="padding:6px; border:1px solid #ccc;">Ruolo</th>
                    <th style="padding:6px; border:1px solid #ccc;">Voto</th>
                    <th style="padding:6px; border:1px solid #ccc;">Consiglio</th>
                    <th style="padding:6px; border:1px solid #ccc;">Motivazione</th>
                </tr>
            </thead>
            <tbody>
    `;

    /* 4) RIGHE GIOCATORI + COLORI VOTO */
    players.forEach((p, i) => {
        const score =
            (p.attPos * 1.2) +
            (p.difPos * 1.0) +
            (p.battPos * 1.0) +
            (p.ricezPos * 1.1) +
            (p.muroPunto * 1.5) -
            (p.attNeg * 1.0) -
            (p.difNeg * 0.8) -
            (p.battNeg * 0.8) -
            (p.ricezNeg * 0.8) -
            (p.papere * 2);

        const voto = Math.max(1, Math.min(10, (score / 8) + 6)).toFixed(1);

        let color = "#ef4444"; // rosso
        if (voto >= 8) color = "#22c55e";      // verde
        else if (voto >= 6.5) color = "#eab308"; // giallo
        else if (voto >= 5) color = "#f97316";   // arancione

        let consiglio = "";
        let motivazione = "";

        if (voto >= 8) {
            consiglio = "Continua così";
            motivazione = "Prestazione molto solida e costante.";
        } else if (voto >= 6.5) {
            consiglio = "Buon lavoro";
            motivazione = "Prestazione positiva con margini di crescita.";
        } else if (voto >= 5) {
            consiglio = "Lavora sulla continuità";
            motivazione = "Serve più precisione e meno errori.";
        } else {
            consiglio = "Serve più concentrazione";
            motivazione = "Troppi errori, migliorare gestione e tecnica.";
        }

        html += `
            <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'};">
                <td style="padding:6px; border:1px solid #ddd;">${p.name}</td>
                <td style="padding:6px; border:1px solid #ddd;">${p.role}</td>
                <td style="padding:6px; border:1px solid #ddd; font-weight:bold; color:${color};">${voto}</td>
                <td style="padding:6px; border:1px solid #ddd;">${consiglio}</td>
                <td style="padding:6px; border:1px solid #ddd;">${motivazione}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    /* 5) GENERAZIONE PDF ORIZZONTALE */
    const container = document.createElement("div");
    container.innerHTML = html;

    const opt = {
        margin: 5,
        filename: `pagelle_finali_partita.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().from(container).set(opt).save();
}



const STORAGE_KEY = "volley_stats_pwa_v4";

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
        role, // NUOVO
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
        html += `
            <td>${perc.att.toFixed(0)}%</td>
            <td>${perc.dif.toFixed(0)}%</td>
            <td>${perc.bat.toFixed(0)}%</td>
            <td>${perc.rcz.toFixed(0)}%</td>
            <td>${perc.muro.toFixed(0)}%</td>
            <td><span class="delete">🗑</span></td>
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

    let i = 1;
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
}

function getBestPlayerBy(type) {
    const players = state.sets[state.currentSet];
    let bestName = null;
    let bestVal = 0;

    players.forEach(p => {
        const perc = calcPercentages(p);
        const val = perc[type];
        if (val > bestVal && (p.attPos + p.attNeg + p.ricezPos + p.ricezNeg) > 0) {
            bestVal = val;
            bestName = `${p.name} (${val.toFixed(0)}%)`;
        }
    });

    return bestName;
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

/* CAMPO: ROTAZIONI, POSIZIONI, SOSTITUZIONI */

function renderCourt(withAnimation) {
    const court = document.getElementById("court");
    const sideA = court.querySelector(".court-side-a");
    const posDivs = sideA.querySelectorAll(".pos");

    posDivs.forEach(div => div.innerHTML = "");

    const players = state.sets[state.currentSet];
    const firstSix = players.slice(0, 6);

    // Mappa ruoli → posizioni
    const roleToPos = {
        "P": [1],      // Palleggio
        "O": [2],      // Opposto
        "C": [3, 6],   // Centrali
        "S": [4, 5],   // Schiacciatrici
        "L": ["libero"] // Libero gestito dopo
    };

    const assigned = {};

    // Trova centrali e libero
    const centrali = firstSix.filter(p => p.role === "C");
    const libero = firstSix.find(p => p.role === "L");

    // 1) Assegna ruoli normali (tranne libero)
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

    // 2) Libero sostituisce centrale in seconda linea (posizione 5 o 6)
    if (libero) {
        const secondLine = [5, 6];
        for (let pos of secondLine) {
            if (assigned[pos] && assigned[pos].role === "C") {
                assigned[pos] = libero;
                break;
            }
        }
    }

    // 3) Disegna i giocatori nelle posizioni
    Object.keys(assigned).forEach(pos => {
        const player = assigned[pos];
        const targetDiv = sideA.querySelector(`.pos-${pos}`);
        if (!targetDiv) return;

        const dot = document.createElement("div");
        dot.className = "player-dot";
        dot.textContent = player.name.length > 6 ? player.name.slice(0, 6) : player.name;

        dot.onclick = () => openSubstitutionMenu(firstSix.indexOf(player));

        targetDiv.appendChild(dot);
    });

    if (withAnimation) {
        court.classList.add("court-animate");
        setTimeout(() => court.classList.remove("court-animate"), 350);
    }
}


function rotateClockwise() {
    const arr = state.rotation;
    const last = arr.pop();
    arr.unshift(last);
}

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

/* PDF: STRUTTURA PULITA, ORIZZONTALE, SENZA +/– */

function exportPDF(isFinale) {
    const players = state.sets[state.currentSet];

    let html = `
        <h2>Statistiche Pallavolo - Set ${state.currentSet}</h2>
        <p>${state.teamA || "Team A"} - vs - ${state.teamB || "Team B"}</p>
        <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse; width:100%; font-size:10px;">
            <thead>
                <tr>
                    <th>Giocatore</th>
                    <th>Att+</th><th>Att-</th>
                    <th>Dif+</th><th>Dif-</th>
                    <th>Bat+</th><th>Bat-</th>
                    <th>Rcz+</th><th>Rcz-</th>
                    <th>Muro</th><th>MuroP</th><th>MuroF</th>
                    <th>Papere</th>
                    <th>%Att</th><th>%Dif</th><th>%Bat</th><th>%Rcz</th><th>%Muro+</th>
                </tr>
            </thead>
            <tbody>
    `;

    players.forEach(p => {
        const perc = calcPercentages(p);
        html += `
            <tr>
                <td>${p.name}</td>
                <td>${p.attPos}</td><td>${p.attNeg}</td>
                <td>${p.difPos}</td><td>${p.difNeg}</td>
                <td>${p.battPos}</td><td>${p.battNeg}</td>
                <td>${p.ricezPos}</td><td>${p.ricezNeg}</td>
                <td>${p.muro}</td><td>${p.muroPunto}</td><td>${p.muroFuori}</td>
                <td>${p.papere}</td>
                <td>${perc.att.toFixed(0)}%</td>
                <td>${perc.dif.toFixed(0)}%</td>
                <td>${perc.bat.toFixed(0)}%</td>
                <td>${perc.rcz.toFixed(0)}%</td>
                <td>${perc.muro.toFixed(0)}%</td>
            </tr>
        `;
    });

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
    const percTot = calcPercentages(totals);

    html += `
            <tr>
                <td><b>Totali</b></td>
                <td>${totals.attPos}</td><td>${totals.attNeg}</td>
                <td>${totals.difPos}</td><td>${totals.difNeg}</td>
                <td>${totals.battPos}</td><td>${totals.battNeg}</td>
                <td>${totals.ricezPos}</td><td>${totals.ricezNeg}</td>
                <td>${totals.muro}</td><td>${totals.muroPunto}</td><td>${totals.muroFuori}</td>
                <td>${totals.papere}</td>
                <td>${percTot.att.toFixed(0)}%</td>
                <td>${percTot.dif.toFixed(0)}%</td>
                <td>${percTot.bat.toFixed(0)}%</td>
                <td>${percTot.rcz.toFixed(0)}%</td>
                <td>${percTot.muro.toFixed(0)}%</td>
            </tr>
        </tbody>
        </table>
    `;

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

/* Tema chiaro/scuro */

function toggleTheme() {
    const isLight = document.body.classList.toggle("light");
    localStorage.setItem("volley_theme", isLight ? "light" : "dark");
}

function applySavedTheme() {
    const theme = localStorage.getItem("volley_theme");
    if (theme === "light") {
        document.body.classList.add("light");
    }
}

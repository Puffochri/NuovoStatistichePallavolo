const STORAGE_KEY = "volley_stats_v1";

let state = {
    teamA: "",
    teamB: "",
    currentSet: 1,
    // dati per set: {1: [players], 2: [...], ...}
    sets: {
        1: [],
        2: [],
        3: [],
        4: [],
        5: []
    }
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
});

function bindUI() {
    document.getElementById("addPlayer").addEventListener("click", addPlayer);
    document.getElementById("reset").addEventListener("click", resetAll);
    document.getElementById("teamA").addEventListener("input", e => {
        state.teamA = e.target.value;
        saveToStorage();
        syncHeaderTeams();
    });
    document.getElementById("teamB").addEventListener("input", e => {
        state.teamB = e.target.value;
        saveToStorage();
        syncHeaderTeams();
    });

    document.querySelectorAll(".set-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".set-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.currentSet = parseInt(btn.dataset.set, 10);
            document.getElementById("labelSet").textContent = state.currentSet;
            renderPlayers();
            saveToStorage();
        });
    });

    document.getElementById("pdfSet").addEventListener("click", () => exportPDF(false));
    document.getElementById("pdfFinale").addEventListener("click", () => exportPDF(true));

    // delega eventi +/-, delete
    document.getElementById("playersBody").addEventListener("click", handleTableClick);
}

function addPlayer() {
    const nameInput = document.getElementById("playerName");
    const name = nameInput.value.trim();
    if (!name) return;

    const player = {
        name,
        attPos: 0, attNeg: 0,
        difPos: 0, difNeg: 0,
        battPos: 0, battNeg: 0,
        ricezPos: 0, ricezNeg: 0,
        muro: 0, muroPunto: 0, muroFuori: 0,
        papere: 0
    };

    state.sets[state.currentSet].push(player);
    nameInput.value = "";
    renderPlayers();
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
    }

    if (target.classList.contains("delete")) {
        players.splice(index, 1);
        renderPlayers();
        saveToStorage();
    }
}

function renderAll() {
    document.getElementById("teamA").value = state.teamA;
    document.getElementById("teamB").value = state.teamB;
    syncHeaderTeams();
    document.getElementById("labelSet").textContent = state.currentSet;
    document.querySelectorAll(".set-btn").forEach(btn => {
        btn.classList.toggle("active", parseInt(btn.dataset.set, 10) === state.currentSet);
    });
    renderPlayers();
}

function renderPlayers() {
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

    // ordine: label, 12 valori, papere, 5 %, azioni
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
        // merge semplice
        state = Object.assign(state, parsed);
        // assicuro che ci siano tutti i set
        for (let i = 1; i <= 5; i++) {
            if (!state.sets[i]) state.sets[i] = [];
        }
    } catch (e) {
        console.warn("Impossibile leggere da localStorage", e);
    }
}

function resetAll() {
    if (!confirm("Sei sicuro di voler cancellare tutti i dati su questo dispositivo?")) return;
    state = {
        teamA: "",
        teamB: "",
        currentSet: 1,
        sets: {1: [], 2: [], 3: [], 4: [], 5: []}
    };
    saveToStorage();
    renderAll();
}

function syncHeaderTeams() {
    document.getElementById("labelTeamA").textContent = state.teamA || "Team A";
    document.getElementById("labelTeamB").textContent = state.teamB || "Team B";
}

function exportPDF(isFinale) {
    const element = document.getElementById("report");

    const opt = {
        margin:       5,
        filename:     isFinale ? 'statistiche_volley_finale.pdf' : `statistiche_volley_set${state.currentSet}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().from(element).set(opt).save();
}

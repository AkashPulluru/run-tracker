const backendUrl = 'http://localhost:5000/runs';
let userId = null;

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.style.backgroundColor = isError ? '#d9534f' : '#45a29e';
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

async function registerUser() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) return showToast("Username & password required", true);

    const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.user_id) {
        localStorage.setItem('userId', data.user_id);
        userId = data.user_id;
        showToast("Registered & logged in");
        getRuns();
        getLeaderboard();
    }
}

async function loginUser() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) return showToast("Username & password required", true);

    const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.user_id) {
        localStorage.setItem('userId', data.user_id);
        userId = data.user_id;
        showToast("Logged in");
        getRuns();
        getLeaderboard();
    } else {
        showToast("Login failed", true);
    }
}

async function logRun() {
    const distance = parseFloat(document.getElementById('distance').value);
    const duration = parseFloat(document.getElementById('duration').value);
    const date = document.getElementById('date').value;
    const notes = document.getElementById('notes').value;

    if (!userId || !distance || !duration || !date) {
        return showToast("All fields must be filled out correctly", true);
    }

    await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, distance, duration, date, notes })
    });

    showToast("Run logged");
    getRuns();
    getLeaderboard();
}

function logout() {
    localStorage.removeItem('userId');
    userId = null;
    showToast("Logged out");
    document.getElementById('runList').innerHTML = '';
    document.getElementById('summary').innerHTML = '';
    document.getElementById('leaderboard').innerHTML = '';
}

async function getRuns() {
    const response = await fetch(`http://localhost:5000/runs/${userId}`);
    const runs = await response.json();

    const runList = document.getElementById('runList');
    runList.innerHTML = '';

    let totalDistance = 0;
    let totalDuration = 0;

    const weekKeys = new Set();

    runs.forEach(run => {
        const item = document.createElement('li');
        const pace = (run.duration / run.distance).toFixed(2);
        const runDate = new Date(run.date);
        const weekKey = `${runDate.getFullYear()}-W${Math.ceil((runDate.getDate() + 6 - runDate.getDay()) / 7)}`;
        weekKeys.add(weekKey);

        item.innerHTML = `
            <span>
                <strong>${run.date}</strong> — ${run.distance} km in ${run.duration} min 
                <em>(${pace} min/km)</em><br>
                <small style="opacity:0.7">${run.notes || ''}</small>
            </span>
        `;

        const del = document.createElement('button');
        del.textContent = '✖';
        del.onclick = () => deleteRun(run.id);
        item.appendChild(del);

        runList.appendChild(item);
        totalDistance += run.distance;
        totalDuration += run.duration;
    });

    // Calculate streak
    let streak = 0;
    let current = new Date();
    while (true) {
        const weekKey = `${current.getFullYear()}-W${Math.ceil((current.getDate() + 6 - current.getDay()) / 7)}`;
        if (weekKeys.has(weekKey)) {
            streak++;
            current.setDate(current.getDate() - 7);
        } else {
            break;
        }
    }

    const pace = totalDistance > 0 ? (totalDuration / totalDistance).toFixed(2) : 0;
    document.getElementById('summary').innerHTML = `
        <h3>This Week</h3>
        Distance: ${totalDistance.toFixed(2)} km<br>
        Duration: ${totalDuration.toFixed(1)} min<br>
        Pace: ${pace} min/km<br>
        Calories: ${(0.06 * 70 * totalDuration).toFixed(0)} kcal<br>
        Weekly Streak: ${streak} week${streak === 1 ? '' : 's'}
    `;

    renderChart(runs);
}

async function deleteRun(id) {
    await fetch(`http://localhost:5000/runs/${id}`, { method: 'DELETE' });
    showToast("Run deleted");
    getRuns();
    getLeaderboard();
}

async function getLeaderboard() {
    const response = await fetch(`http://localhost:5000/runs`);
    const runs = await response.json();

    const userTotals = {};
    runs.forEach(r => {
        if (!userTotals[r.user_id]) userTotals[r.user_id] = 0;
        userTotals[r.user_id] += r.distance;
    });

    const leaderboard = Object.entries(userTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([user, dist], i) => `<li>#${i + 1} — User ${user} → ${dist.toFixed(1)} km</li>`)
        .join('');

    document.getElementById('leaderboard').innerHTML = `
        <h3>Leaderboard</h3>
        <ul style="list-style: none; padding-left: 0;">${leaderboard}</ul>
    `;
}

let chart;
function renderChart(runs) {
    const ctx = document.getElementById('runChart').getContext('2d');
    const labels = runs.map(r => r.date);
    const distances = runs.map(r => r.distance);
    const durations = runs.map(r => r.duration);
    const paces = runs.map(r => (r.duration / r.distance).toFixed(2));

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Distance (km)',
                    data: distances,
                    borderColor: '#66fcf1',
                    borderWidth: 2,
                    fill: false
                },
                {
                    label: 'Duration (min)',
                    data: durations,
                    borderColor: '#45a29e',
                    borderWidth: 2,
                    fill: false
                },
                {
                    label: 'Pace (min/km)',
                    data: paces,
                    borderColor: '#f39c12',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    fill: false,
                    yAxisID: 'paceAxis'
                }
            ]
        },
        options: {
            scales: {
                y: { beginAtZero: true },
                paceAxis: {
                    type: 'linear',
                    position: 'right',
                    ticks: { color: '#f39c12' },
                    grid: { drawOnChartArea: false }
                }
            },
            plugins: {
                legend: { labels: { color: 'white' } }
            }
        }
    });
}

window.onload = () => {
    const stored = localStorage.getItem('userId');
    if (stored) {
        userId = stored;
        getRuns();
        getLeaderboard();
    }
};

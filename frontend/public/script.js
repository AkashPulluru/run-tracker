const backendUrl = 'http://localhost:5000/runs';

let userId = null;

async function registerUser() {
    const username = document.getElementById('username').value;
    const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    const data = await response.json();
    userId = data.user_id;
    getRuns();
}


async function logRun() {
    const distance = document.getElementById('distance').value;
    const duration = document.getElementById('duration').value;
    const date = document.getElementById('date').value;
    const weight = 70; // assume 70kg or make this user-input later
    const calories = 0.06 * weight * duration;


    await fetch('http://localhost:5000/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, distance, duration, date })
    });

    getRuns();
}

async function getRuns() {
    const response = await fetch(`http://localhost:5000/runs/${userId}`);
    const runs = await response.json();

    const runList = document.getElementById('runList');
    runList.innerHTML = '';

    let totalDistance = 0;
    let totalDuration = 0;

    runs.forEach(run => {
        const item = document.createElement('li');
        item.textContent = `Date: ${run.date}, Distance: ${run.distance} km, Duration: ${run.duration} min`;

        const del = document.createElement('button');
        del.textContent = 'Delete';
        del.onclick = () => deleteRun(run.id);
        item.appendChild(del);

        runList.appendChild(item);

        totalDistance += run.distance;
        totalDuration += run.duration;
    });

    document.getElementById('summary').innerHTML = `
        <b>This Week</b><br>
        Distance: ${totalDistance.toFixed(2)} km<br>
        Duration: ${totalDuration.toFixed(1)} min<br>
        Calories: ${(0.06 * 70 * totalDuration).toFixed(0)} kcal
    `;


    renderChart(runs);
}

async function deleteRun(id) {
    await fetch(`http://localhost:5000/runs/${id}`, { method: 'DELETE' });
    getRuns();
}

let chart;

function renderChart(runs) {
    const ctx = document.getElementById('runChart').getContext('2d');

    const labels = runs.map(r => r.date);
    const distances = runs.map(r => r.distance);
    const durations = runs.map(r => r.duration);

    if (chart) chart.destroy();  // prevent multiple overlays

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Distance (km)',
                data: distances,
                borderWidth: 2
            }, {
                label: 'Duration (min)',
                data: durations,
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}


window.onload = getRuns;

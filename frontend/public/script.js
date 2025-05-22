const backendUrl = 'http://localhost:5000/runs';

async function logRun() {
    const distance = document.getElementById('distance').value;
    const duration = document.getElementById('duration').value;
    const date = document.getElementById('date').value;

    await fetch(backendUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ distance, duration, date })
    });

    getRuns();
}

async function getRuns() {
    const response = await fetch(backendUrl);
    const runs = await response.json();

    const runList = document.getElementById('runList');
    runList.innerHTML = '';

    runs.forEach(run => {
        const listItem = document.createElement('li');
        listItem.textContent = `Date: ${run.date}, Distance: ${run.distance} km, Duration: ${run.duration} min`;
        runList.appendChild(listItem);
    });
}

window.onload = getRuns;

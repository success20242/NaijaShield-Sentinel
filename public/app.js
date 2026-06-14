let lat = null;
let lng = null;

navigator.geolocation.getCurrentPosition(pos => {
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
});

async function report() {
    const location = document.getElementById('location').value;
    const description = document.getElementById('desc').value;

    await fetch('/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, description, lat, lng })
    });

    load();
}

async function load() {
    const incidents = await fetch('/incidents').then(r => r.json());
    const reports = await fetch('/reports').then(r => r.json());

    document.getElementById('incidents').innerHTML =
        incidents.map(i => `<li>${i.description}</li>`).join('');

    document.getElementById('reports').innerHTML =
        reports.map(r => `<li>${r.summary}</li>`).join('');
}

load();

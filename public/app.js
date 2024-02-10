document.getElementById('weatherForm').addEventListener('submit', function (event) {
    event.preventDefault();
    const cityInput = document.getElementById('cityInput');
    const cityName = cityInput.value.trim();

    fetch('/weather', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `city=${cityName}`,
    })
    .then((response) => response.json())
    .then((data) => {
    
        const weatherInfo = document.getElementById('weatherInfo');
        weatherInfo.innerHTML = `
            <h2>${data.name}, ${data.sys.country}</h2>
            <p>${data.weather[0].description}</p>
            <p>Temperature: ${data.main.temp} C</p>
            <p>Feels like: ${data.main.feels_like} C</p>
            <p>Humidity: ${data.main.humidity}%</p>
            <p>Pressure: ${data.main.pressure} hPa</p>
            <p>Wind Speed: ${data.wind.speed} m/s</p>
            <p>Coordinates: [${data.coord.lat}, ${data.coord.lon}]</p>
            <p>Country Code: ${data.sys.country}</p>
            <img src="http://openweathermap.org/img/w/${data.weather[0].icon}.png" alt="Weather Icon">
            
            <h3>Air Quality Information</h3>
            <p>Air Quality Index (AQI): ${data.airQuality.list[0].main.aqi}</p>
            
            <h3>Time Zone Information</h3>
            <p>Time Zone ID: ${data.timeZone.timeZoneId}</p>
        `;

    
        displayMap(data.coord.lat, data.coord.lon);
    })
    .catch((error) => console.error('Error:', error));
});

function displayMap(lat, lon) {
 
    const map = L.map('map').setView([lat, lon], 10);

   
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.marker([lat, lon]).addTo(map)
        .bindPopup('City Location')
        .openPopup();
}

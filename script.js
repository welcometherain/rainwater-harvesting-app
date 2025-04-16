// Map variables
let map;
let drawingManager;
let selectedShape = null;
let currentPolygon = null;
let savedAreas = [];
let searchBox;

// Initialize map
function initMap() {
    // Default location (United States)
    const defaultLocation = { lat: 39.8283, lng: -98.5795 };

    // Create map with tilt disabled
    map = new google.maps.Map(document.getElementById('map-container'), {
        center: defaultLocation,
        zoom: 5,
        mapTypeId: 'satellite',
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        tilt: 0, // Disable the 45-degree tilt
        styles: document.documentElement.classList.contains('dark') ? [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }
        ] : []
    });

    // Create drawing manager
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            editable: true
        }
    });

    drawingManager.setMap(map);

    // Add event listener for when polygon is completed
    google.maps.event.addListener(drawingManager, 'polygoncomplete', function (polygon) {
        // Clear any existing polygons
        if (currentPolygon) {
            currentPolygon.setMap(null);
        }

        currentPolygon = polygon;
        selectedShape = polygon;
        drawingManager.setDrawingMode(null);

        // Calculate area
        const area = google.maps.geometry.spherical.computeArea(polygon.getPath());
        // Convert from square meters to square feet
        const areaInSquareFeet = area * 10.7639;

        document.getElementById('measured-area').textContent = Math.round(areaInSquareFeet).toLocaleString() + ' sq ft';
        document.getElementById('area-save-form').classList.remove('hidden');
        document.getElementById('no-areas').classList.add('hidden');

        // Add listeners for when the polygon is modified
        google.maps.event.addListener(polygon.getPath(), 'set_at', updateArea);
        google.maps.event.addListener(polygon.getPath(), 'insert_at', updateArea);

        function updateArea() {
            const updatedArea = google.maps.geometry.spherical.computeArea(polygon.getPath());
            const updatedAreaInSquareFeet = updatedArea * 10.7639;
            document.getElementById('measured-area').textContent = Math.round(updatedAreaInSquareFeet).toLocaleString() + ' sq ft';
        }
    });

    // Set up search functionality
    const searchInput = document.getElementById('map-search-input');
    const searchButton = document.getElementById('map-search-button');

    searchButton.addEventListener('click', function () {
        searchLocation(searchInput.value);
    });

    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchLocation(searchInput.value);
        }
    });

    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setCenter(userLocation);
            map.setZoom(18); // Zoom in to a level where buildings are visible
        }, function () {
            // Location access denied or error
            console.log('Unable to get current location.');
        });
    }
}

// Search for a location
function searchLocation(address) {
    if (!address) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 'address': address }, function (results, status) {
        if (status === 'OK') {
            map.setCenter(results[0].geometry.location);
            map.setZoom(18);
        } else {
            alert('Geocode was not successful. You may need a valid Google Maps API key for this feature.');
        }
    });
}

// Initialize the map when the page loads
window.addEventListener('load', initMap);

// Handle map action buttons
document.getElementById('draw-polygon').addEventListener('click', function () {
    clearCurrentDrawing();
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
});

document.getElementById('clear-drawing').addEventListener('click', clearCurrentDrawing);

// Toggle search box
document.getElementById('toggle-search').addEventListener('click', function () {
    const searchBox = document.querySelector('.map-search-container');
    searchBox.classList.toggle('hidden');
});

function clearCurrentDrawing() {
    if (currentPolygon) {
        currentPolygon.setMap(null);
        currentPolygon = null;
    }
    document.getElementById('area-save-form').classList.add('hidden');
    if (savedAreas.length === 0) {
        document.getElementById('no-areas').classList.remove('hidden');
    }
    drawingManager.setDrawingMode(null);
}

// Save area
document.getElementById('save-area').addEventListener('click', function () {
    const areaName = document.getElementById('area-name').value.trim();

    if (!areaName) {
        alert('Please enter a name for this area.');
        return;
    }

    if (!currentPolygon) {
        alert('No area has been drawn on the map.');
        return;
    }

    const area = google.maps.geometry.spherical.computeArea(currentPolygon.getPath());
    const areaInSquareFeet = area * 10.7639;

    // Save the polygon's path coordinates (needed to recreate the polygon later)
    const pathArray = [];
    currentPolygon.getPath().forEach(function (point) {
        pathArray.push({ lat: point.lat(), lng: point.lng() });
    });

    const savedArea = {
        name: areaName,
        area: areaInSquareFeet,
        path: pathArray,
        polygon: currentPolygon, // Store the polygon itself
    };

    savedAreas.push(savedArea);

    currentPolygon = null;

    updateSavedAreasList();
    updateTotalArea();
    clearCurrentDrawing();
    document.getElementById('area-name').value = '';
});

// Update saved areas list
function updateSavedAreasList() {
    const savedAreasList = document.getElementById('saved-areas-list');
    savedAreasList.innerHTML = ''; // Clear the list

    if (savedAreas.length > 0) {
        document.getElementById('no-areas').classList.add('hidden');
    } else {
        document.getElementById('no-areas').classList.remove('hidden');
    }

    savedAreas.forEach(function (savedArea, index) {
        const listItem = document.createElement('li');
        listItem.className = 'p-3 area-list-item';
        listItem.id = 'area-' + index;

        listItem.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <span class="font-medium">${savedArea.name}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">${Math.round(savedArea.area).toLocaleString()} sq ft</span>
                </div>
                <button class="delete-area-btn ml-2 text-xs text-red-600 hover:underline">
                    Delete
                </button>
            </div>
        `;

        // Delete button functionality
        const deleteButton = listItem.querySelector('.delete-area-btn');
        deleteButton.addEventListener('click', function () {
            // Remove the polygon from the map
            savedArea.polygon.setMap(null);

            // Remove the item from the array
            savedAreas.splice(index, 1);

            // Update the list
            updateSavedAreasList();
            updateTotalArea();
        });

        listItem.addEventListener('click', function () {
            // Deselect all other items
            savedAreasList.querySelectorAll('.area-list-item').forEach(function(item) {
                item.classList.remove('selected');
            });

            // Select this item
            listItem.classList.add('selected');

            // Center the map on this area
            const bounds = new google.maps.LatLngBounds();
            savedArea.path.forEach(function(point) {
                bounds.extend(new google.maps.LatLng(point.lat, point.lng));
            });
            map.fitBounds(bounds);
        });

        savedAreasList.appendChild(listItem);
    });
}

// Update total area
function updateTotalArea() {
    let totalArea = 0;
    savedAreas.forEach(function (savedArea) {
        totalArea += savedArea.area;
    });
    document.getElementById('total-area-value').textContent = Math.round(totalArea).toLocaleString() + ' sq ft';

    // Show the total area container if there are saved areas, otherwise hide it
    const totalAreaContainer = document.getElementById('total-area');
    if (savedAreas.length > 0) {
        totalAreaContainer.classList.remove('hidden');
    } else {
        totalAreaContainer.classList.add('hidden');
    }
}

// Use in calculator
document.getElementById('use-in-calculator').addEventListener('click', function() {
    let totalArea = 0;
    savedAreas.forEach(function (savedArea) {
        totalArea += savedArea.area;
    });

    document.getElementById('area').value = Math.round(totalArea);
});

// Tab navigation
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Deactivate all tabs and tab contents
        tabButtons.forEach(btn => {
            btn.classList.remove('border-primary', 'text-primary');
            btn.classList.add('border-transparent', 'hover:text-primary');
        });
        tabContents.forEach(content => {
            content.classList.add('hidden');
        });

        // Activate selected tab and content
        button.classList.remove('border-transparent', 'hover:text-primary');
        button.classList.add('border-primary', 'text-primary');
        document.getElementById(button.id.replace('tab-', '') + '-tab').classList.remove('hidden');
    });
});

// Zip code search
document.getElementById('search-zipcode').addEventListener('click', function () {
    const zipCode = document.getElementById('zipcode').value.trim();
    if (!zipCode) {
        alert('Please enter a zip code or location.');
        return;
    }
    fetchRainfallData(zipCode);
});

// Fetch rainfall data
function fetchRainfallData(zipCode) {
    document.getElementById('zipcode-loading').classList.remove('hidden');
    document.getElementById('zipcode-data').classList.add('hidden');
    document.getElementById('zipcode-error').classList.add('hidden');
    document.getElementById('zipcode-result').classList.add('hidden');

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${zipCode}&count=1&language=en&format=json`;
    fetch(url)
    .then(response => response.json())
    .then(data => {
        if (data.results && data.results.length > 0) {
            const location = data.results[0];
            const latitude = location.latitude;
            const longitude = location.longitude;
            const locationName = `${location.name}, ${location.admin1 || location.country}`;
            document.getElementById('zipcode-display').textContent = locationName;
            document.getElementById('zipcode-location').textContent = `Rainfall Data for: `;
            
            fetchMonthlyRainfall(latitude, longitude);
            
            document.getElementById('zipcode-result').classList.remove('hidden');
        } else {
            document.getElementById('zipcode-loading').classList.add('hidden');
            document.getElementById('zipcode-error').classList.remove('hidden');
        }
    })
    .catch(() => {
        document.getElementById('zipcode-loading').classList.add('hidden');
        document.getElementById('zipcode-error').classList.remove('hidden');
    });
}

function fetchMonthlyRainfall(latitude, longitude) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const monthlyUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&monthly=precipitation_sum&timezone=auto`;
    fetch(monthlyUrl)
    .then(response => response.json())
    .then(data => {
        if (data.monthly && data.monthly.precipitation_sum) {
            const monthlyData = data.monthly.precipitation_sum;
            const averageAnnual = monthlyData.reduce((acc, val) => acc + val, 0) / monthlyData.length / 25.4;
            document.getElementById('zipcode-annual').textContent = `${averageAnnual.toFixed(1)} in`;

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthlyContainer = document.getElementById('zipcode-data');
            monthlyContainer.innerHTML = '';

            monthlyData.forEach((amount, index) => {
                const amountInInches = (amount / 25.4).toFixed(1);
                const monthlyDiv = document.createElement('div');
                monthlyDiv.className = 'border border-gray-200 dark:border-gray-700 rounded-md p-2';
                monthlyDiv.innerHTML = `
                    <span class="block text-xs text-gray-500 dark:text-gray-400">${monthNames[index]}</span>
                    <span class="font-medium">${amountInInches} in</span>
                `;
                monthlyContainer.appendChild(monthlyDiv);
            });

            document.getElementById('zipcode-loading').classList.add('hidden');
            document.getElementById('zipcode-data').classList.remove('hidden');
        } else {
            document.getElementById('zipcode-loading').classList.add('hidden');
            document.getElementById('zipcode-error').classList.remove('hidden');
        }
    })
    .catch(() => {
        document.getElementById('zipcode-loading').classList.add('hidden');
        document.getElementById('zipcode-error').classList.remove('hidden');
    });
}

// City locations data
const locations = [
    { name: "San Diego, CA", latitude: 32.7157, longitude: -117.1611 },
    { name: "Los Angeles, CA", latitude: 34.0522, longitude: -118.2437 },
    { name: "San Francisco, CA", latitude: 37.7749, longitude: -122.4194 },
    { name: "Seattle, WA", latitude: 47.6062, longitude: -122.3321 },
    { name: "Portland, OR", latitude: 45.5051, longitude: -122.6750 },
    { name: "Denver, CO", latitude: 39.7392, longitude: -104.9903 },
    { name: "Phoenix, AZ", latitude: 33.4484, longitude: -112.0740 },
    { name: "Dallas, TX", latitude: 32.7767, longitude: -96.7970 },
    { name: "Houston, TX", latitude: 29.7604, longitude: -95.3698 },
    { name: "Chicago, IL", latitude: 41.8781, longitude: -87.6298 },
    { name: "New York, NY", latitude: 40.7128, longitude: -74.0060 },
    { name: "Boston, MA", latitude: 42.3601, longitude: -71.0589 },
    { name: "Miami, FL", latitude: 25.7617, longitude: -80.1918 },
    { name: "Atlanta, GA", latitude: 33.7490, longitude: -84.3880 },
    { name: "Washington, D.C.", latitude: 38.9072, longitude: -77.0369 }
];

// Populate city list
const locationSelect = document.getElementById('location');
locations.forEach(loc => {
    const option = document.createElement('option');
    option.value = JSON.stringify(loc); // Store the entire object as JSON string
    option.textContent = loc.name;
    locationSelect.appendChild(option);
});

// Custom rainfall
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const customDataInputs = document.getElementById('custom-data-inputs');
monthNames.forEach((month, index) => {
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `custom-${month.toLowerCase()}`;
    input.placeholder = month;
    input.value = 0;
    input.className = 'p-2 border rounded-md text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white';
    customDataInputs.appendChild(input);
});

// Reset Custom Data
document.getElementById('reset-custom').addEventListener('click', function () {
    monthNames.forEach(month => {
        const input = document.getElementById(`custom-${month.toLowerCase()}`);
        if (input) {
            input.value = 0;
        }
    });
});

// Form submission
const calculatorForm = document.getElementById('calculator-form');
calculatorForm.addEventListener('submit', function (event) {
    event.preventDefault();

    // Hide no-results and display results
    document.getElementById('no-results').classList.add('hidden');
    document.getElementById('results-container').classList.remove('hidden');

    const activeTab = document.querySelector('.tab-btn.border-primary');
    let locationName = '';
    let monthlyRainfall = [];

    if (activeTab.id === 'tab-zipcode') {
        locationName = document.getElementById('zipcode-display').textContent;

        const monthlySpans = document.querySelectorAll('#zipcode-data .font-medium');
        monthlyRainfall = Array.from(monthlySpans).map(span => parseFloat(span.textContent.replace(' in', '')));
    } else if (activeTab.id === 'tab-city') {
        const selectedLocation = JSON.parse(locationSelect.value);
        locationName = selectedLocation.name;
    } else if (activeTab.id === 'tab-custom') {
        locationName = 'Custom Location';
        monthNames.forEach(month => {
            const amount = parseFloat(document.getElementById(`custom-${month.toLowerCase()}`).value);
            monthlyRainfall.push(amount);
        });
    }

    const collectionArea = parseFloat(document.getElementById('area').value);
    const systemEfficiency = parseFloat(document.getElementById('efficiency').value);

    // Annual rainfall calculation
    const totalRainfall = monthlyRainfall.reduce((acc, val) => acc + val, 0);
    document.getElementById('result-annual-rainfall').textContent = `${totalRainfall.toFixed(1)} in`;

    // Annual collection calculation
    const annualCollection = (totalRainfall * collectionArea * 0.623 * (systemEfficiency / 100)).toFixed(0);
    document.getElementById('result-annual-collection').textContent = `${annualCollection} gal`;

    // Display results details
    document.getElementById('result-location').textContent = locationName;
    document.getElementById('result-area').textContent = collectionArea.toLocaleString();
    document.getElementById('result-efficiency').textContent = systemEfficiency;

    // Chart creation
    const ctx = document.getElementById('rainfall-chart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthNames,
            datasets: [{
                label: 'Monthly Rainfall (in)',
                data: monthlyRainfall,
                backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Rainfall (in)'
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Update table
    const resultsTableBody = document.getElementById('results-table-body');
    resultsTableBody.innerHTML = '';

    monthNames.forEach((month, index) => {
        const monthlyCollection = (monthlyRainfall[index] * collectionArea * 0.623 * (systemEfficiency / 100)).toFixed(0);
        const row = resultsTableBody.insertRow();
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        const cell3 = row.insertCell(2);

        cell1.className = 'px-6 py-3 whitespace-nowrap';
        cell2.className = 'px-6 py-3 whitespace-nowrap text-right';
        cell3.className = 'px-6 py-3 whitespace-nowrap text-right';

        cell1.textContent = month;
        cell2.textContent = monthlyRainfall[index].toFixed(1);
        cell3.textContent = monthlyCollection;
    });

    // Scroll to results
    document.getElementById('results-container').scrollIntoView({ behavior: 'smooth' });
});

const mainMap = L.map('map').setView([28.6139, 77.2090], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(mainMap);
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    function (position) {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      mainMap.setView([userLat, userLng], 15);
      L.marker([userLat, userLng], {
        icon: L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64113.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        })
      }).addTo(mainMap).bindPopup("You are here").openPopup();
    },
    function (error) {
      console.log("Geolocation not allowed or failed.", error);
    }
  );
}
let reportMap, reportMarker;
function initReportMap(center) {
  if (reportMap) {
    reportMap.invalidateSize();
    if (center) reportMap.setView(center, 16);
    return;
  }
  reportMap = L.map('reportMap').setView(center || [28.6139, 77.2090], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(reportMap);
  reportMap.on('click', function(e) {
    if (reportMarker) reportMap.removeLayer(reportMarker);
    reportMarker = L.marker(e.latlng).addTo(reportMap);
    document.getElementById('incidentLatLng').value = `${e.latlng.lat},${e.latlng.lng}`;
  });
}
document.getElementById('openReportBtn')?.addEventListener('click', () => {
  document.getElementById('reportModal').classList.remove('hidden');
  document.getElementById('mainMapContainer').style.display = 'none';
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        setTimeout(() => {
          initReportMap([userLat, userLng]);
          reportMap.invalidateSize();
          if (reportMarker) reportMap.removeLayer(reportMarker);
          reportMarker = L.marker([userLat, userLng]).addTo(reportMap);
          document.getElementById('incidentLatLng').value = `${userLat},${userLng}`;
          document.getElementById('incidentLocation').value = `Lat: ${userLat}, Lng: ${userLng}`;
          document.getElementById('incidentLatLng').readOnly = true;
          document.getElementById('incidentLocation').readOnly = true;
        }, 200);
      },
      function (error) {
        setTimeout(() => {
          initReportMap();
          reportMap.invalidateSize();
        }, 200);
      }
    );
  } else {
    setTimeout(() => {
      initReportMap();
      reportMap.invalidateSize();
    }, 200);
  }
});

document.getElementById('closeReportModal')?.addEventListener('click', () => {
  document.getElementById('reportModal').classList.add('hidden');
  document.getElementById('reportMsg').classList.add('hidden');
  document.getElementById('reportForm').reset();
  if (reportMarker) { reportMap.removeLayer(reportMarker); }
  document.getElementById('mainMapContainer').style.display = 'block';
  document.getElementById('incidentLatLng').readOnly = false;
  document.getElementById('incidentLocation').readOnly = false;
});

document.getElementById('reportForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const location = document.getElementById('incidentLocation').value;
  const description = document.getElementById('incidentDesc').value;
  const latlng = document.getElementById('incidentLatLng').value;
  const msgDiv = document.getElementById('reportMsg');

  try {
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, description, latlng })
    });
    const data = await res.json();
    msgDiv.classList.remove('hidden');
    msgDiv.textContent = data.message;

    setTimeout(() => {
      document.getElementById('reportModal').classList.add('hidden');
      msgDiv.classList.add('hidden');
      document.getElementById('reportForm').reset();
      if (reportMarker) reportMap.removeLayer(reportMarker);
      document.getElementById('mainMapContainer').style.display = 'block';
      document.getElementById('incidentLatLng').readOnly = false;
      document.getElementById('incidentLocation').readOnly = false;
    }, 1200);

  } catch (error) {
    msgDiv.classList.remove('hidden');
    msgDiv.textContent = "Failed to report incident. Try again.";
  }
});

async function fetchAlerts() {
  try {
    const response = await fetch('/api/alerts');
    const data = await response.json();
    if (data.success) {
      const alertsList = document.getElementById('alertsList');
      alertsList.innerHTML = '';
      data.data.slice().reverse().forEach(incident => {
        let loc = incident.location || '';
        if (incident.latlng) {
          loc += ` (${incident.latlng})`;
        }
        const li = document.createElement('li');
        li.textContent = `[!] Incident reported at ${loc}: ${incident.description}`;
        li.className = 'text-red-600';
        alertsList.appendChild(li);
      });
    }
  } catch (error) {
    console.error('Error fetching alerts:', error);
  }
}
setInterval(fetchAlerts, 5000);
fetchAlerts();
const TOMTOM_API_KEY = '0tpxP3BjtxwC2uTmruozqFT8VlHzit0b';
let routeLayer;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(mainMap);

const trafficFlowLayer = L.tileLayer(
  `https://api.tomtom.com/map/1/tile/flow/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`,
  { opacity: 0.7, attribution: '© TomTom Traffic' }
).addTo(mainMap);

const trafficToggle = document.getElementById('trafficToggle');
if (trafficToggle) {
  trafficToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      trafficFlowLayer.addTo(mainMap);
    } else {
      mainMap.removeLayer(trafficFlowLayer);
    }
  });
}

document.getElementById('startTypeCurrent').addEventListener('change', function() {
  const fromInput = document.getElementById('fromInput');
  fromInput.value = '';
  fromInput.readOnly = true;
  fromInput.classList.add('bg-gray-100');
  fromInput.placeholder = 'Your Location';
});
document.getElementById('startTypeOther').addEventListener('change', function() {
  const fromInput = document.getElementById('fromInput');
  fromInput.value = '';
  fromInput.readOnly = false;
  fromInput.classList.remove('bg-gray-100');
  fromInput.placeholder = 'Start Location';
});

async function geocode(address) {
  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(address)}.json?key=${TOMTOM_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    const pos = data.results[0].position;
    return [pos.lat, pos.lon];
  }
  throw new Error('Location not found');
}

document.getElementById('findRouteBtn')?.addEventListener('click', async () => {
  const msgDiv = document.getElementById('routeMsg');
  msgDiv.classList.add('hidden');
  msgDiv.textContent = '';

  const useCurrent = document.getElementById('startTypeCurrent').checked;
  const fromInput = document.getElementById('fromInput');
  const toInput = document.getElementById('toInput').value;

  if (!toInput) {
    msgDiv.textContent = 'Please enter a destination.';
    msgDiv.classList.remove('hidden');
    return;
  }

  let startCoords;
  try {
    if (useCurrent) {
      if (!navigator.geolocation) throw new Error('Geolocation not supported.');
      startCoords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve([pos.coords.latitude, pos.coords.longitude]),
          err => reject(new Error("Could not get your current location."))
        );
      });
      fromInput.value = `${startCoords[0]}, ${startCoords[1]}`;
    } else {
      if (!fromInput.value) throw new Error('Please enter a start location.');
      startCoords = await geocode(fromInput.value);
    }

    const endCoords = await geocode(toInput);

    console.log('Start coords:', startCoords, 'End coords:', endCoords);

    if (
      !startCoords || !endCoords ||
      isNaN(startCoords[0]) || isNaN(startCoords[1]) ||
      isNaN(endCoords[0]) || isNaN(endCoords[1])
    ) {
      throw new Error('Invalid coordinates for routing.');
    }

    const tomtomUrl = `https://api.tomtom.com/routing/1/calculateRoute/${startCoords[0]},${startCoords[1]}:${endCoords[0]},${endCoords[1]}/json?key=${TOMTOM_API_KEY}&travelMode=pedestrian&avoid=unpavedRoads`;

    console.log('TomTom URL:', tomtomUrl);

    const res = await fetch(tomtomUrl);
    const data = await res.json();

    if (!data.routes || data.routes.length === 0) throw new Error('No route found.');

    if (routeLayer) mainMap.removeLayer(routeLayer);

    const coords = data.routes[0].legs[0].points.map(pt => [pt.latitude, pt.longitude]);
    routeLayer = L.polyline(coords, { color: 'blue', weight: 5 }).addTo(mainMap);
    mainMap.fitBounds(routeLayer.getBounds());

  } catch (err) {
    msgDiv.textContent = err.message || 'Failed to find route.';
    msgDiv.classList.remove('hidden');
    console.error(err);
  }
});

document.getElementById('tagSafeBtn').addEventListener('click', async () => {
  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    try {
      const res = await fetch('/api/tag-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, status: 'safe' })
      });
      const data = await res.json();
      alert(data.message || "Location tagged as SAFE!");
    } catch (err) {
      alert("Failed to tag location as safe.");
    }
  }, () => {
    alert("Could not get your current location.");
  });
});

document.getElementById('tagUnsafeBtn').addEventListener('click', async () => {
  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    try {
      const res = await fetch('/api/tag-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, status: 'unsafe' })
      });
      const data = await res.json();
      alert(data.message || "Location tagged as UNSAFE!");
    } catch (err) {
      alert("Failed to tag location as unsafe.");
    }
  }, () => {
    alert("Could not get your current location.");
  });
});
let reviews = [];

function renderStars(rating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= rating ? "★" : "☆";
  }
  return `<span class="ml-2 text-yellow-500">${stars}</span>`;
}

function renderReviews() {
  const reviewsList = document.getElementById("reviewsList");
  if (!reviewsList) return;
  reviewsList.innerHTML = "";
  if (reviews.length === 0) {
    reviewsList.innerHTML = `<div class="text-gray-400 text-sm">No reviews yet. Be the first to add one!</div>`;
    return;
  }
  reviews.forEach(review => {
    const div = document.createElement("div");
    div.innerHTML = `
      <span class="font-semibold">${review.area}</span>
      ${renderStars(review.rating)}
      <p class="text-xs text-gray-500">"${review.text}"</p>
    `;
    reviewsList.appendChild(div);
  });
}

function openReviewModal() {
  document.getElementById("reviewModal").classList.remove("hidden");
  document.getElementById("reviewMsg").classList.add("hidden");
  document.getElementById("reviewForm").reset();
  const mapContainer = document.getElementById('mainMapContainer');
  if (mapContainer) mapContainer.style.display = 'none';
}
function closeReviewModal() {
  document.getElementById("reviewModal").classList.add("hidden");
  const mapContainer = document.getElementById('mainMapContainer');
  if (mapContainer) mapContainer.style.display = '';
}

document.addEventListener("DOMContentLoaded", function() {
  renderReviews();

  const addBtn = document.getElementById("addReviewBtn");
  if (addBtn) addBtn.addEventListener("click", openReviewModal);

  const closeBtn = document.getElementById("closeReviewModal");
  if (closeBtn) closeBtn.addEventListener("click", closeReviewModal);

  const form = document.getElementById("reviewForm");
  if (form) {
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      const area = document.getElementById("reviewArea").value.trim();
      const rating = parseInt(document.getElementById("reviewRating").value, 10);
      const text = document.getElementById("reviewText").value.trim();

      if (!area || !rating || !text) {
        showReviewMsg("Please fill all fields.", "red");
        return;
      }

      reviews.unshift({ area, rating, text });
      renderReviews();
      showReviewMsg("Review added!", "green");
      setTimeout(closeReviewModal, 800);
    });
  }
});

function showReviewMsg(msg, color) {
  const msgDiv = document.getElementById("reviewMsg");
  if (!msgDiv) return;
  msgDiv.textContent = msg;
  msgDiv.classList.remove("hidden", "text-green-600", "text-red-600");
  msgDiv.classList.add(color === "green" ? "text-green-600" : "text-red-600");
}

document.addEventListener("DOMContentLoaded", function() {
  const toggleBtn = document.getElementById('toggleActionPanelBtn');
  const actionPanel = document.getElementById('actionPanel');
  if (toggleBtn && actionPanel) {
    toggleBtn.addEventListener('click', () => {
      actionPanel.classList.toggle('hidden');
    });
  }

  document.getElementById('sosBtn')?.addEventListener('click', () => {
    alert('SOS sent!');
  });
  document.getElementById('safeBtn')?.addEventListener('click', () => {
    alert('Location marked as Safe.');
  });
  document.getElementById('unsafeBtn')?.addEventListener('click', () => {
    alert('Location marked as Unsafe.');
  });
  document.getElementById('reportBtn')?.addEventListener('click', () => {
    document.getElementById('reportModal')?.classList.remove('hidden');
  });
});

const voiceBtn = document.getElementById('voiceInputBtn');
const voiceText = document.getElementById('voiceText');

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;

  voiceBtn.addEventListener('click', () => {
    voiceBtn.disabled = true;
    voiceBtn.innerHTML = '<i class="fas fa-microphone text-gray-700 animate-pulse"></i> Listening...';
    recognition.start();
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    voiceText.value = transcript;
    voiceBtn.innerHTML = '<i class="fas fa-microphone text-gray-700"></i> Voice Input';
    voiceBtn.disabled = false;
  };

  recognition.onerror = (event) => {
    voiceBtn.innerHTML = '<i class="fas fa-microphone text-gray-700"></i> Voice Input';
    voiceBtn.disabled = false;
    alert('Voice input error: ' + event.error);
  };

  recognition.onend = () => {
    if (voiceBtn.disabled) {
      voiceBtn.innerHTML = '<i class="fas fa-microphone text-gray-700"></i> Voice Input';
      voiceBtn.disabled = false;
    }
  };
} else {
  voiceBtn.disabled = true;
  voiceBtn.innerHTML = '<i class="fas fa-microphone-slash text-gray-700"></i> Not Supported';
}

const saveBtn = document.getElementById('saveVoiceBtn');
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    const text = voiceText.value.trim();
    if (!text) {
      alert('No voice text to save!');
      return;
    }
    fetch('/api/save-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_text: text })
    })
    .then(res => res.json())
    .then(data => {
      alert('Voice text saved!');
      voiceText.value = '';
    })
    .catch(err => {
      alert('Error saving voice text.');
    });
  });
}
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', function() {
      const answer = this.nextElementSibling;
      const icon = this.querySelector('.faq-icon');
      answer.classList.toggle('hidden');
      if (answer.classList.contains('hidden')) {
        icon.innerHTML = '&#43;';
        icon.classList.remove('rotate-45');
      } else {
        icon.innerHTML = '&#8722;';
        icon.classList.add('rotate-45');
      }
    });
  });
  document.getElementById('sosBtn').addEventListener('click', function() {
  window.location.href = 'tel:112';

  navigator.geolocation.getCurrentPosition(function(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    const waMessage = encodeURIComponent(
      `SOS! I need help. My location: https://maps.google.com/?q=${lat},${lng}`
    );
    window.open(`https://wa.me/TRUSTED_PHONE_NUMBER?text=${waMessage}`);
  });
});
const ACCESS_KEY = 'p_r8VUQEwxQie-rlOTABWk5dWItTycNs2bisCLX0l9k'; 
const QUERY = ['no rape cases against women', 'women empowerment'];
const IMAGE_COUNT = 5;
fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(QUERY.join(' '))}&per_page=${IMAGE_COUNT}&client_id=${ACCESS_KEY}`)
  .then(response => response.json())
  .then(data => {
    const images = data.results.map(img => img.urls.regular);
    let current = 0;
    function showImage(index) {
      document.getElementById('carousel-image').src = images[index];
      document.getElementById('carousel-dots').innerHTML = images.map((_, i) =>
        `<span data-idx="${i}" style="
          width: 12px; height: 12px; border-radius: 50%; display: inline-block;
          background: ${i === index ? '#2563eb' : '#ccc'}; cursor: pointer;">
        </span>`
      ).join('');
    }
    showImage(current);
    document.getElementById('carousel-dots').onclick = function(e) {
      if (e.target.dataset.idx) {
        current = parseInt(e.target.dataset.idx);
        showImage(current);
      }
    };
    setInterval(() => {
      current = (current + 1) % images.length;
      showImage(current);
    }, 2000);
  });
  



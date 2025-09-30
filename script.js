//Server Url Debug
const serverURL_Debug = 'http://127.0.0.1:5000';

// Results UI elements
const resultsTableWrapper = document.getElementById('resultsTableWrapper');
const resultsBody = document.getElementById('resultsBody');
const noResultsMessage = document.getElementById('noResultsMessage');
const autoDetectCheckbox = document.getElementById('autoDetect');
const locationInput = document.getElementById('location');
let toggleLocationHandler = null;

function resetResultsDisplay() {
  if (resultsBody) {
    resultsBody.innerHTML = '';
  }
  if (resultsTableWrapper) {
    resultsTableWrapper.classList.add('hidden');
  }
  if (noResultsMessage) {
    noResultsMessage.classList.add('hidden');
    noResultsMessage.textContent = 'No record found.';
  }
}

function showNoResults(message = 'No record found.') {
  if (!noResultsMessage) return;
  if (resultsTableWrapper) {
    resultsTableWrapper.classList.add('hidden');
  }
  if (resultsBody) {
    resultsBody.innerHTML = '';
  }
  noResultsMessage.textContent = message;
  noResultsMessage.classList.remove('hidden');
}

function normalizeEvents(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.events)) return payload.events;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload._embedded && Array.isArray(payload._embedded.events)) return payload._embedded.events;
  return [];
}

function formatEventDate(event) {
  const date = event?.dates?.start?.localDate || event?.date || event?.datetime || event?.startDate || '';
  const time = event?.dates?.start?.localTime || event?.time || event?.startTime || '';
  if (!date && !time) return 'N/A';
  return time ? `${date} ${time}` : date;
}

function getEventIcon(event) {
  if (Array.isArray(event?.images) && event.images.length) {
    // prefer image with ratio close to 4:3 if available
    const preferred = event.images.find(img => img?.ratio === '3_2') || event.images[0];
    return preferred?.url || '';
  }
  return event?.icon || event?.image || '';
}

function getEventGenre(event) {
  return event?.classifications?.[0]?.segment?.name
    || event?.genre
    || event?.type
    || 'N/A';
}

function getEventVenue(event) {
  return event?._embedded?.venues?.[0]?.name
    || event?.venue
    || event?.location
    || 'N/A';
}

function renderResults(payload) {
  const events = normalizeEvents(payload);
  if (!events.length) {
    showNoResults();
    return;
  }

  if (!resultsBody || !resultsTableWrapper || !noResultsMessage) {
    console.warn('Results table elements not found in DOM.');
    return;
  }

  const fragment = document.createDocumentFragment();
  events.forEach(event => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-800/60 transition-colors';

    const dateCell = document.createElement('td');
    dateCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-200';
    dateCell.textContent = formatEventDate(event);
    row.appendChild(dateCell);

    const iconCell = document.createElement('td');
    iconCell.className = 'px-6 py-4 text-sm';
    const iconUrl = getEventIcon(event);
    if (iconUrl) {
      const img = document.createElement('img');
      img.src = iconUrl;
      img.alt = event?.name ? `${event.name} poster` : 'Event poster';
      img.className = 'h-12 w-12 rounded object-cover border border-gray-700';
      iconCell.appendChild(img);
    } else {
      iconCell.textContent = '—';
      iconCell.classList.add('text-gray-400');
    }
    row.appendChild(iconCell);

    const nameCell = document.createElement('td');
    nameCell.className = 'px-6 py-4 text-sm font-semibold text-white';
    nameCell.textContent = event?.name || 'Untitled event';
    row.appendChild(nameCell);

    const genreCell = document.createElement('td');
    genreCell.className = 'px-6 py-4 text-sm text-gray-300';
    genreCell.textContent = getEventGenre(event);
    row.appendChild(genreCell);

    const venueCell = document.createElement('td');
    venueCell.className = 'px-6 py-4 text-sm text-gray-300';
    venueCell.textContent = getEventVenue(event);
    row.appendChild(venueCell);

    fragment.appendChild(row);
  });

  resultsBody.innerHTML = '';
  resultsBody.appendChild(fragment);
  noResultsMessage.classList.add('hidden');
  resultsTableWrapper.classList.remove('hidden');
}

//Submit button
document.getElementById("inputform")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    resetResultsDisplay();
    const keyword = document.getElementById("keyword").value.trim();
    const distance = document.getElementById("distance").value.trim();
    const category = document.getElementById("category").value.trim();
    const location = document.getElementById("location").value.trim();
    console.log({ keyword, distance, category, location });
    if (!keyword && !location) {
      alert("Please enter a keyword and location");
      return;
    }
    if (!keyword) {
      alert("Please enter a keyword");
      return;
    }
    if (!location) {
      alert("Please enter a location");
      return;
    }

    const params = new URLSearchParams({
      keyword,
      distance,
      category,
      location    
    });

    if (autoDetectCheckbox && autoDetectCheckbox.checked) {
      params.append('autoDetect', 'true');
    }

    const url = `${serverURL_Debug}/submit?${params.toString()}`;
    console.log('GET URL:', url);

    fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Success', data);
        renderResults(data);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        showNoResults('Failed to fetch events.');
        alert('Error fetching results. Check console.');
      });
  });


// Clear button 
const clearBtn = document.getElementById("clear");
clearBtn.addEventListener("click", function (e) {
    e.preventDefault();
    const form = document.getElementById("inputform");
    if (!form) return;
    form.reset();
    resetResultsDisplay();

    if (autoDetectCheckbox) {
      autoDetectCheckbox.checked = false;
    }
    if (toggleLocationHandler) {
      toggleLocationHandler();
    } else if (locationInput) {
      locationInput.hidden = false;
    }

    console.log("Form cleared (reset to default values)");
});

// Toggle location input based on Auto-Detect checkbox
if (autoDetectCheckbox && locationInput) {
    toggleLocationHandler = () => {
    const on = autoDetectCheckbox.checked;
        if (on) {
            locationInput.hidden = true;
            locationInput.value = ""; // blank when auto-detecting
            getLocationByIP().then(loc => {
                locationInput.value = loc;
            }).catch(err => {
                console.error("Error fetching location:", err);
                locationInput.value = "Error fetching location";
            });
        } else {
            locationInput.hidden = false;
            locationInput.value = ""; // blank when manual input
        }
    };
  autoDetectCheckbox.addEventListener("change", toggleLocationHandler);
    // initialize state on load
    toggleLocationHandler();
}

const ipinfo_url_with_token = "https://ipinfo.io/?token=d8eeb3713deeb3";
async function getLocationByIP() {
    const response = await fetch(ipinfo_url_with_token);
    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
    const json = await response.json();
    console.log("IP Info:", json);
    return json.loc;
}
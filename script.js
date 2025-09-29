//Server Url Debug
const serverURL_Debug = 'http://127.0.0.1:5000'

//Submit button
document.getElementById("inputform")
  .addEventListener("submit", function (e) {
    e.preventDefault();
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
      latitude,
      longitude
    });

    const autoDetect = document.getElementById('autoDetect');
    if (autoDetect && autoDetect.checked) {
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
        // TODO: render results into the page
      })
      .catch(err => {
        console.error('Fetch error:', err);
        alert('Error fetching results. Check console.');
      });
  });


// Clear button 
const clearBtn = document.getElementById("clear");
clearBtn.addEventListener("click", function (e) {
    e.preventDefault();
    const form = document.getElementById("inputform");
    // Reset form back to original default values 
    const autoDetect = document.getElementById("autoDetect");
    autoDetect.checked = false; // uncheck auto-detect
    const locationInput = document.getElementById("location");
    locationInput.hidden = false;
    form.reset();
    console.log("Form cleared (reset to default values)");

});

// Toggle location input based on Auto-Detect checkbox
const autoDetect = document.getElementById("autoDetect");
const locationInput = document.getElementById("location");
if (autoDetect && locationInput) {
    const toggleLocation = () => {
        const on = autoDetect.checked;
        if (on) {
            locationInput.hidden = on;

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
    autoDetect.addEventListener("change", toggleLocation);
    // initialize state on load
    toggleLocation();
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
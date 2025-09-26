//Submit button
document.getElementById("inputform")
        .addEventListener("submit", 
            function(e)     
            {
                e.preventDefault();
                const keyword = document.getElementById("keyword").value;
                const distance = document.getElementById("distance").value;
                const category = document.getElementById("category").value;
                const location = document.getElementById("location").value;
                console.log({ keyword, distance, category, location });
                if(!keyword && !location){
                    alert("Please enter a keyword and location");
                    return;
                }
                if(!keyword){
                    alert("Please enter a keyword");
                    return;
                }
                if(!location){
                    alert("Please enter a location");
                    return;
                }
                // const data = { username: document.getElementById("username").value };
                // fetch("/api/submit", {
                //     method: "POST",
                //     headers: { "Content-Type": "application/json" },
                //     body: JSON.stringify(data)
                // })
                // .then(res => res.json())
                // .then(result => console.log(result));
            }
        );

// Clear button 
const clearBtn = document.getElementById("clear");
clearBtn.addEventListener("click", function(e){
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
            getLocation().then(loc => {
                locationInput.value = loc;
            }).catch(err => {
                console.error("Error fetching location:", err);
                locationInput.value = "Error fetching location";
            });
        }else{
            locationInput.hidden = false;
            locationInput.value = ""; // blank when manual input
        }
    };
    autoDetect.addEventListener("change", toggleLocation);
    // initialize state on load
    toggleLocation();
}

const ipinfo_url_with_token = "https://ipinfo.io/?token=d8eeb3713deeb3";
async function getLocation(){
    const response = await fetch(ipinfo_url_with_token);
    if (!response.ok) {
        throw new Error("Network response was not ok");
    }
    const json = await response.json();
    return json.loc;
}
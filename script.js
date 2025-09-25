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
        form.reset();
        console.log("Form cleared (reset to default values)");
   
});

// Toggle location input based on Auto-Detect checkbox
const autoDetect = document.getElementById("autoDetect");
const locationInput = document.getElementById("location");
if (autoDetect && locationInput) {
    const toggleLocation = () => {
        const on = autoDetect.checked;
        locationInput.disabled = on;
        if (on) {
            locationInput.value = ""; // blank when auto-detecting
        }
    };
    autoDetect.addEventListener("change", toggleLocation);
    // initialize state on load
    toggleLocation();
}
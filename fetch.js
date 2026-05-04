const dataUrl = 'https://raw.githubusercontent.com/thapasanjay23/TMO_Chabahil/refs/heads/main/license.json';

async function searchLicense(searchNumber) {
    try {
        const response = await fetch(dataUrl);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const licenses = await response.json();

        // Assuming your JSON is an array of objects like [{ "licenseNumber": "123", "status": "Active" }]
        const result = licenses.find(item => item.licenseNumber === searchNumber);

        if (result) {
            console.log("License Found:", result);
            // Update your HTML here to show the status
        } else {
            console.log("No license found with that number.");
        }

    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}
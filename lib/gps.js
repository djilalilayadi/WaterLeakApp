import * as Location from 'expo-location';

function withTimeout(promise, ms) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Location request timed out')), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

/**
 * Gets the user's current latitude and longitude.
 * Asks for permission first if not already granted.
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export async function getUserLocation() {
    try {
        // Request permission to access location
        let { status } = await Location.requestForegroundPermissionsAsync();

        // If permission is not granted, we cannot get the location
        if (status !== 'granted') {
            console.error('Permission to access location was denied');
            return null;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
            console.error('Location services are disabled');
            return null;
        }

        // Get the current position of the device
        // accuracy: LocationAccuracy.Balanced is usually good for general use without high battery drain
        let location = null;
        try {
            location = await withTimeout(Location.getCurrentPositionAsync({}), 8000);
        } catch (e) {
            // Fall back to last known location instead of hanging the UI forever
            try {
                location = await Location.getLastKnownPositionAsync({});
            } catch {
                location = null;
            }
        }

        if (!location?.coords) {
            return null;
        }

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        };
    } catch (error) {
        console.error('Error getting user location:', error);
        return null;
    }
}

/**
 * Calculates the distance between two points on Earth using the Haversine formula.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Finds the nearest technician from a list.
 * @param {number} clientLat User's latitude
 * @param {number} clientLng User's longitude
 * @param {Array} technicians List of technicians with latitude and longitude properties
 * @returns {Object | null} The closest technician object
 */
export function findNearestTechnician(clientLat, clientLng, technicians) {
    if (!technicians || technicians.length === 0) return null;

    let closestTech = null;
    let minDistance = Infinity;

    // Loop through all technicians to find the one with the smallest distance
    technicians.forEach(tech => {
        // Determine which property name is used for lat/lng (handling variations like lat/longitude)
        const techLat = tech.latitude || tech.lat;
        const techLng = tech.longitude || tech.lng || tech.long;

        if (techLat && techLng) {
            const distance = calculateDistance(clientLat, clientLng, techLat, techLng);

            // If this distance is smaller than the current minimum, update
            if (distance < minDistance) {
                minDistance = distance;
                closestTech = { ...tech, distance }; // Store distance with tech for reference
            }
        }
    });

    return closestTech;
}

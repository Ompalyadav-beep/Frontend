// --- Configuration ---
// Dynamically determine API base URL based on environment
const PRODUCTION_API_URL = 'https://backend-6-lnvt.onrender.com';
const LOCAL_API_URL = 'http://127.0.0.1:5000';

// Auto-detect environment: use local URL if on localhost, otherwise use production
const isLocalhost = window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1' ||
                   window.location.hostname === '';

const API_BASE_URL = isLocalhost ? LOCAL_API_URL : PRODUCTION_API_URL;
console.log(`Using API base URL: ${API_BASE_URL}`);

let allVideos = []; // Global store for videos fetched from /api/videos (trending)

// --- API Request Helper ---
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {},
        // credentials: 'include', // ❌ REMOVE this line — not needed without login
    };

    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

        if (response.status === 401) {
            console.warn('Unauthorized access — ignoring since login is disabled.');
            return null;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.error(`API Error ${response.status}:`, errorData);
            throw new Error(`API Error: ${response.status} - ${errorData.error || errorData.message || 'Unknown error'}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return response.json();
        } else {
            if (response.status === 204) return null;
            return response.text();
        }
    } catch (error) {
        console.error(`Error during API request to ${endpoint}:`, error.message);
        throw error;
    }
}

// --- Video Fetching and Rendering (for /api/videos - trending_IN.csv) ---
async function fetchAndRenderTrendingVideos() {
    const videoGridEl = document.getElementById('video-grid');
    try {
        allVideos = await apiRequest('/api/videos');
        if (allVideos && Array.isArray(allVideos)) {
            renderVideoCards(allVideos, 'video-grid');
        } else {
            console.warn("/api/videos did not return an array:", allVideos);
            if(videoGridEl) videoGridEl.innerHTML = '<p>No trending videos found or error loading data.</p>';
            allVideos = [];
        }
    } catch (error) {
        console.error("Failed to fetch or render trending videos:", error.message);
        if(videoGridEl) videoGridEl.innerHTML = `<p>Error loading trending videos: ${error.message}.</p>`;
    }
}

// Generic function to render video cards
function renderVideoCards(videosToRender, containerId, isScraped = false) {
    const grid = document.getElementById(containerId);
    if (!grid) {
        console.error(`Container with ID "${containerId}" not found for rendering video cards.`);
        return;
    }
    grid.innerHTML = '';

    if (!videosToRender || videosToRender.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color: var(--text-color);">No videos to display for this query.</p>';
        return;
    }

    videosToRender.forEach(video => {
        // Extract videoId directly if available, or from URL
        let videoId = video.videoId || null;
        let videoUrl = video.url || video.link || null;

        // If we have videoId but no URL, construct the URL
        if (videoId && !videoUrl) {
            videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }

        // If we still don't have a URL, log and skip
        if (!videoUrl) {
            console.warn('Skipping video with no URL/link/videoId:', video);
            return;
        }

        // If we have URL but no videoId, try to extract it
        if (!videoId && videoUrl) {
            try {
                if (videoUrl.includes('youtube.com/watch?v=')) {
                    videoId = new URL(videoUrl).searchParams.get('v');
                }
            } catch (e) {
                console.warn('Could not parse videoId from URL:', videoUrl, e);
            }
        }

        let thumbnailUrl = video.thumbnail;
        if (!thumbnailUrl && videoId) {
            thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        } else if (!thumbnailUrl) {
            thumbnailUrl = 'placeholder_thumbnail.jpg'; // You should have a placeholder image
        }

        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <a href="${videoUrl}" target="_blank" rel="noopener noreferrer">
                <img class="thumbnail" src="${thumbnailUrl}" alt="Video thumbnail for ${video.title || 'Video'}" onerror="this.onerror=null;this.src='placeholder_thumbnail.jpg'; this.alt='Fallback thumbnail';">
            </a>
            <div class="video-info">
                <div class="video-title">${video.title || 'N/A'}</div>
                <div class="channel">
                    <i class="fas fa-user-circle"></i> ${video.channel || video.channelTitle || 'N/A'}
                </div>
                ${isScraped ? '' : `
                    <div class="views-time">
                        <span><i class="fas fa-eye"></i> ${video.views || 'N/A'}</span>
                        <span><i class="fas fa-calendar-alt"></i> ${video.published || 'N/A'}</span>
                    </div>
                `}
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- Search Filter for locally stored 'allVideos' (live input box in header) ---
const searchInputLiveFilterEl = document.getElementById('searchInput');
if (searchInputLiveFilterEl) {
    searchInputLiveFilterEl.addEventListener('input', e => {
        const keyword = e.target.value.toLowerCase();
        if (!allVideos || allVideos.length === 0) {
            return;
        }
        const filtered = allVideos.filter(video =>
            (video.title && video.title.toLowerCase().includes(keyword)) ||
            (video.channel && video.channel.toLowerCase().includes(keyword))
        );
        renderVideoCards(filtered, 'video-grid');
    });
}

// --- Manual Search (using backend /search and /scrape_youtube from Search Section) ---
async function handleManualSearch() {
    const queryInput = document.getElementById("searchQuery");
    const resultsDiv = document.getElementById("results");

    if (!queryInput || !resultsDiv) {
        console.error("Manual search input field ('searchQuery') or results container ('results') not found.");
        if(resultsDiv) resultsDiv.innerHTML = "<p>Search elements missing on page. Contact support.</p>";
        return;
    }
    const query = queryInput.value.trim();
    if (!query) {
        resultsDiv.innerHTML = "<p style='text-align:center; color: var(--text-color);'>Please enter a search term in the box above.</p>";
        return;
    }
    resultsDiv.innerHTML = "<p style='text-align:center; color: var(--text-color);'>Searching on server...</p>";

    try {
        const searchData = await apiRequest(`/search?query=${encodeURIComponent(query)}`);
        if (searchData.not_found) {
            resultsDiv.innerHTML = `<p style='text-align:center; color: var(--text-color);'>No results found in our trending data for "<strong>${searchData.query}</strong>".</p>`;
            const scrapeButton = document.createElement("button");
            scrapeButton.className = 'btn'; // Use general .btn styling
            scrapeButton.innerHTML = `<i class="fab fa-youtube"></i> Search on YouTube for "${searchData.query}"`;
            scrapeButton.style.margin = "10px auto"; // Center button
            scrapeButton.style.display = "block";

            // Add gradient specific to this button if desired or use a default
            const tempBefore = document.createElement('span'); // For ::before styling if not using CSS class directly
            tempBefore.style.background = 'linear-gradient(45deg, #ff0000, #ff8c00)'; // YouTube-like gradient
            Object.assign(tempBefore.style, { position: 'absolute', top:0, left:0, width:'100%', height:'100%', zIndex:'-1', borderRadius:'25px', transition:'all 0.3s ease'});
            scrapeButton.appendChild(tempBefore);


            scrapeButton.onclick = async () => {
                resultsDiv.innerHTML = "<p style='text-align:center; color: var(--text-color);'>Searching on YouTube...</p>";
                try {
                    const scrapedData = await apiRequest(`/scrape_youtube?query=${encodeURIComponent(searchData.query)}`);
                    if (scrapedData.results && scrapedData.results.length > 0) {
                        renderVideoCards(scrapedData.results, "results", true);
                    } else {
                        resultsDiv.innerHTML = `<p style='text-align:center; color: var(--text-color);'>No videos found on YouTube for "<strong>${searchData.query}</strong>".</p>`;
                    }
                } catch (scrapeError) {
                    resultsDiv.innerHTML = `<p style='text-align:center; color:red;'>Error scraping YouTube: ${scrapeError.message}</p>`;
                }
            };
            resultsDiv.appendChild(scrapeButton);
        } else {
            renderVideoCards(searchData.results, "results", false); // Render results from /search
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p style='text-align:center; color:red;'>Server search failed: ${error.message}</p>`;
    }
}

// --- Refresh Button for Trending Data ---
const refreshButtonEl = document.getElementById('refreshButton');
if (refreshButtonEl) {
    refreshButtonEl.addEventListener('click', async () => {
        const confirmRefresh = confirm("Are you sure you want to refresh trending videos from the server? This can take a moment.");
        if (!confirmRefresh) return;

        alert("Refreshing trending data... The page will update once done.");

        try {
            const result = await apiRequest('/refresh', 'POST');
            alert(result.message || "Refresh request sent. Data will be updated shortly.");
            // Re-fetch trending videos to update the grid
            await fetchAndRenderTrendingVideos();
        } catch (error) {
            alert(`Failed to refresh: ${error.message}`);
        }
    });
}

// --- Initial Load Logic ---
async function initializeApp() {
    // Only load trending videos if on the main page (index.html)
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        await fetchAndRenderTrendingVideos();
    }
}

// Run the app initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

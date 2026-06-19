// State Management
let allReleases = []; // Flattened array of all sub-updates
let selectedUpdateId = null;
let currentFilterType = 'all';
let currentSearchQuery = '';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const feedContainer = document.getElementById('release-notes-feed');
const searchInput = document.getElementById('search-input');
const filterTags = document.querySelectorAll('.filter-tag');
const resultsCount = document.getElementById('results-count');
const lastUpdatedTime = document.getElementById('last-updated-time');

// Tweet Composer Elements
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountSpan = document.getElementById('char-count');
const charProgressCircle = document.getElementById('char-progress');
const tweetBtn = document.getElementById('tweet-btn');
const clearComposerBtn = document.getElementById('clear-composer');
const selectedMeta = document.getElementById('selected-meta');

// Circle Circumference Constants
const CIRCLE_RADIUS = 10;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~62.83

// Initial setup of progress ring SVG
if (charProgressCircle) {
    charProgressCircle.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
    charProgressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
}

// Toast Notifications Helper
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Fetch Releases from Backend API
async function fetchReleases(forceRefresh = false) {
    try {
        setLoadingState(true);
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Flatten entries (dates) into single list of updates
        allReleases = [];
        let updateCounter = 0;
        
        if (data.entries && Array.isArray(data.entries)) {
            data.entries.forEach(entry => {
                if (entry.updates && Array.isArray(entry.updates)) {
                    entry.updates.forEach(update => {
                        allReleases.push({
                            id: `update-${updateCounter++}`,
                            date: entry.date,
                            link: entry.link,
                            type: update.type,
                            html: update.html,
                            text: update.text
                        });
                    });
                }
            });
        }
        
        // Update last updated timestamp
        if (data.fetched_at) {
            const timeString = new Date(data.fetched_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            lastUpdatedTime.textContent = `Last synced: ${timeString}`;
        }
        
        renderFeed();
        
        if (forceRefresh) {
            showToast("Release notes refreshed!");
        }
    } catch (error) {
        console.error("Error fetching release notes:", error);
        feedContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #f87171; border: 1px dashed #ef4444; border-radius: 12px; background: rgba(239, 68, 68, 0.05)">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
                <p style="font-weight: 600;">Failed to load release notes</p>
                <p style="font-size: 0.85rem; color: #9ca3af; margin-top: 0.25rem;">${error.message}</p>
                <button class="btn btn-primary" style="margin-top: 1rem;" onclick="fetchReleases(true)">Try Again</button>
            </div>
        `;
    } finally {
        setLoadingState(false);
    }
}

// Set loading UI state
function setLoadingState(isLoading) {
    if (isLoading) {
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        
        // Display Skeletons if loading from scratch
        if (allReleases.length === 0) {
            feedContainer.innerHTML = `
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            `;
        }
    } else {
        refreshIcon.classList.remove('spinning');
        refreshBtn.disabled = false;
    }
}

// Render Feed based on Filters and Search
function renderFeed() {
    // Filter
    let filtered = allReleases.filter(item => {
        const matchesType = currentFilterType === 'all' || item.type.toLowerCase() === currentFilterType.toLowerCase();
        
        // Search inside HTML, type, date, or plaintext
        const query = currentSearchQuery.toLowerCase();
        const matchesSearch = !query || 
            item.date.toLowerCase().includes(query) ||
            item.type.toLowerCase().includes(query) ||
            item.text.toLowerCase().includes(query);
            
        return matchesType && matchesSearch;
    });

    resultsCount.textContent = `Showing ${filtered.length} update${filtered.length === 1 ? '' : 's'}`;

    if (filtered.length === 0) {
        feedContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
                <i class="fa-regular fa-folder-open" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p style="font-weight: 500;">No updates found</p>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Try adjusting your filters or search keywords.</p>
            </div>
        `;
        return;
    }

    // Grouping by Date for visual presentation
    let currentGroupDate = "";
    let feedHTML = "";

    filtered.forEach(item => {
        if (item.date !== currentGroupDate) {
            currentGroupDate = item.date;
            feedHTML += `<div class="date-group-header">${currentGroupDate}</div>`;
        }

        const isSelected = item.id === selectedUpdateId;
        const badgeClass = `badge-${item.type.toLowerCase()}`;
        const finalBadgeClass = ['feature', 'announcement', 'issue', 'deprecation'].includes(item.type.toLowerCase()) ? badgeClass : 'badge-default';

        feedHTML += `
            <div class="update-card ${isSelected ? 'selected' : ''}" data-id="${item.id}">
                <div class="card-header">
                    <div class="card-tags">
                        <span class="badge ${finalBadgeClass}">${item.type}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon btn-tweet-shortcut" data-id="${item.id}" title="Quick Draft Tweet">
                            <i class="fa-brands fa-x-twitter"></i>
                        </button>
                        <div class="btn-select-indicator">
                            <i class="fa-solid fa-check"></i>
                        </div>
                    </div>
                </div>
                <div class="card-content">
                    ${item.html}
                </div>
            </div>
        `;
    });

    feedContainer.innerHTML = feedHTML;

    // Attach Click Event Handlers to cards
    document.querySelectorAll('.update-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // If user clicked the shortcut tweet button on the card, we handle it separately
            if (e.target.closest('.btn-tweet-shortcut')) {
                e.stopPropagation();
                const id = e.target.closest('.btn-tweet-shortcut').dataset.id;
                selectUpdate(id);
                showToast("Draft loaded into composer!");
                return;
            }
            
            const id = card.dataset.id;
            selectUpdate(id);
        });
    });
}

// Select an update to draft a Tweet
function selectUpdate(id) {
    if (selectedUpdateId === id) {
        // Toggle off if clicking the same selected card
        clearSelection();
        return;
    }

    selectedUpdateId = id;
    
    // Toggle active selection states in DOM
    document.querySelectorAll('.update-card').forEach(c => {
        if (c.dataset.id === id) {
            c.classList.add('selected');
        } else {
            c.classList.remove('selected');
        }
    });

    const update = allReleases.find(item => item.id === id);
    if (!update) return;

    // Generate Default Tweet Text
    // Format: "BigQuery Update ([Date]) - [Type]: [Text] #BigQuery #GoogleCloud [Link]"
    // Twitter character limit is 280.
    const hashtagText = " #BigQuery #GoogleCloud";
    const linkText = `\n${update.link}`;
    
    // We compute maximum length allowed for the core update description text
    const prefix = `BigQuery Update (${update.date}) | ${update.type.toUpperCase()}:\n`;
    
    // Combined boilerplate size
    const boilerplateLen = prefix.length + hashtagText.length + linkText.length;
    const maxDescLen = 280 - boilerplateLen;
    
    let descText = update.text;
    if (descText.length > maxDescLen) {
        descText = descText.substring(0, maxDescLen - 3) + "...";
    }

    const tweetText = `${prefix}${descText}${hashtagText}${linkText}`;

    // Enable Textarea & Load text
    tweetTextarea.disabled = false;
    tweetTextarea.value = tweetText;
    
    selectedMeta.innerHTML = `
        <span style="font-weight:600; color: var(--accent-primary-hover)">Selected Update:</span>
        <span style="font-size: 0.75rem; display:block; margin-top:2px;">${update.date} - ${update.type}</span>
    `;
    selectedMeta.classList.add('active');
    
    updateCharacterCount();
    tweetTextarea.focus();
}

// Clear selected release
function clearSelection() {
    selectedUpdateId = null;
    document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
    
    tweetTextarea.value = "";
    tweetTextarea.disabled = true;
    
    selectedMeta.innerHTML = `<span class="placeholder-text">Select a release note to draft a tweet.</span>`;
    selectedMeta.classList.remove('active');
    
    updateCharacterCount();
}

// Update Character Counter & Button disabled state
function updateCharacterCount() {
    const textLength = tweetTextarea.value.length;
    const remaining = 280 - textLength;
    
    charCountSpan.textContent = remaining;
    
    if (textLength === 0 || remaining < 0) {
        tweetBtn.disabled = true;
        charCountSpan.style.color = 'var(--text-muted)';
    } else {
        tweetBtn.disabled = false;
        if (remaining <= 20) {
            charCountSpan.style.color = 'var(--accent-danger)';
            charProgressCircle.style.stroke = 'var(--accent-danger)';
        } else if (remaining <= 50) {
            charCountSpan.style.color = 'var(--accent-warning)';
            charProgressCircle.style.stroke = 'var(--accent-warning)';
        } else {
            charCountSpan.style.color = 'var(--text-secondary)';
            charProgressCircle.style.stroke = 'var(--accent-primary)';
        }
    }

    // Update circular progress ring
    const percent = Math.min(100, (textLength / 280) * 100);
    const offset = CIRCLE_CIRCUMFERENCE - (percent / 100) * CIRCLE_CIRCUMFERENCE;
    charProgressCircle.style.strokeDashoffset = offset;
}

// Open Twitter web intent
function openTwitterIntent() {
    const text = tweetTextarea.value;
    if (!text || text.length > 280) return;
    
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
}

// Event Listeners
refreshBtn.addEventListener('click', () => fetchReleases(true));

searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    renderFeed();
});

filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
        filterTags.forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        currentFilterType = tag.dataset.type;
        renderFeed();
    });
});

tweetTextarea.addEventListener('input', updateCharacterCount);

tweetBtn.addEventListener('click', openTwitterIntent);

clearComposerBtn.addEventListener('click', clearSelection);

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
});

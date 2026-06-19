// Frontend Application Logic for BigQuery Release Insights

document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let state = {
        title: 'BigQuery - Release notes',
        updated: '',
        rawEntries: [],     // Raw entries from API
        parsedUpdates: [],   // Split individual updates
        filteredUpdates: [], // After search and type filters
        selectedUpdateId: null,
        composer: {
            text: '',
            includeLink: true,
            includeHashtags: true,
            customized: false // If user manually edited the textarea
        }
    };

    // DOM Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const spinnerIcon = btnRefresh.querySelector('.spinner-icon');
    const btnText = btnRefresh.querySelector('.btn-text');
    const lastUpdatedTime = document.getElementById('last-updated-time');
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const filterType = document.getElementById('filter-type');
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    const btnErrorClose = document.getElementById('btn-error-close');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const emptyState = document.getElementById('empty-state');
    const timelineContainer = document.getElementById('timeline-container');

    // Composer Elements
    const tweetTextarea = document.getElementById('tweet-textarea');
    const toggleLink = document.getElementById('toggle-link');
    const toggleHashtags = document.getElementById('toggle-hashtags');
    const charCountText = document.getElementById('char-count-text');
    const progressRingBar = document.getElementById('progress-ring-bar');
    const btnTweet = document.getElementById('btn-tweet');
    const selectedTitle = document.getElementById('selected-title');
    const selectedPreviewContent = document.getElementById('selected-preview-content');

    // Progress Ring configurations
    const circleRadius = 12;
    const circleCircumference = 2 * Math.PI * circleRadius;
    progressRingBar.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
    progressRingBar.style.strokeDashoffset = circleCircumference;

    // --- 1. Fetch & Parse Functions ---

    async function loadReleaseNotes() {
        showLoadingState(true);
        hideError();
        
        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.details || data.error);
            }

            state.title = data.title;
            state.updated = data.updated;
            state.rawEntries = data.entries;
            
            // Format Last Updated Text
            if (state.updated) {
                const date = new Date(state.updated);
                lastUpdatedTime.innerText = `Updated ${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            } else {
                lastUpdatedTime.innerText = 'Connected';
            }

            // Parse entries
            parseRawEntries();
            applyFilters();
            
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showError(`Failed to load release notes: ${error.message}`);
            lastUpdatedTime.innerText = 'Error loading';
            showEmptyState();
        } finally {
            showLoadingState(false);
        }
    }

    // Split Atom <entry> HTML content by H3 tags into separate sub-updates
    function parseRawEntries() {
        const updates = [];
        const parser = new DOMParser();

        state.rawEntries.forEach((entry, entryIndex) => {
            const doc = parser.parseFromString(entry.content, 'text/html');
            const children = Array.from(doc.body.children);
            
            let currentUpdate = null;
            let subIdCounter = 0;

            children.forEach((child) => {
                if (child.tagName === 'H3') {
                    // Push previous update before starting new one
                    if (currentUpdate) {
                        updates.push(currentUpdate);
                    }
                    
                    const typeText = child.innerText.trim();
                    subIdCounter++;
                    
                    currentUpdate = {
                        id: `${entry.id}_sub_${subIdCounter}`,
                        dateStr: entry.title,
                        dateObj: new Date(entry.updated),
                        link: entry.link,
                        type: normalizeUpdateType(typeText),
                        html: '',
                        text: ''
                    };
                } else {
                    // If no H3 preceding (rare), create fallback group
                    if (!currentUpdate) {
                        subIdCounter++;
                        currentUpdate = {
                            id: `${entry.id}_sub_${subIdCounter}`,
                            dateStr: entry.title,
                            dateObj: new Date(entry.updated),
                            link: entry.link,
                            type: 'OTHER',
                            html: '',
                            text: ''
                        };
                    }
                    
                    currentUpdate.html += child.outerHTML;
                    currentUpdate.text += child.innerText.trim() + ' ';
                }
            });

            // Push final sub-update
            if (currentUpdate) {
                updates.push(currentUpdate);
            }
        });

        state.parsedUpdates = updates;
    }

    function normalizeUpdateType(typeText) {
        const text = typeText.toUpperCase();
        if (text.includes('FEATURE')) return 'FEATURE';
        if (text.includes('ISSUE') || text.includes('BUG') || text.includes('FIX')) return 'ISSUE';
        if (text.includes('ANNOUNCEMENT')) return 'ANNOUNCEMENT';
        return 'OTHER';
    }

    // --- 2. Filter & Render Functions ---

    function applyFilters() {
        const query = searchInput.value.toLowerCase().trim();
        const type = filterType.value;

        state.filteredUpdates = state.parsedUpdates.filter(update => {
            // 1. Filter by Type
            if (type !== 'ALL' && update.type !== type) {
                return false;
            }

            // 2. Filter by search query (date, type, description text)
            if (query !== '') {
                const searchStr = `${update.dateStr} ${update.type} ${update.text}`.toLowerCase();
                if (!searchStr.includes(query)) {
                    return false;
                }
            }
            return true;
        });

        renderTimeline();
    }

    function renderTimeline() {
        timelineContainer.innerHTML = '';
        
        if (state.filteredUpdates.length === 0) {
            showEmptyState();
            return;
        }

        emptyState.classList.add('hidden');
        timelineContainer.classList.remove('hidden');

        // Group the updates by Date string
        const groupedByDate = {};
        state.filteredUpdates.forEach(update => {
            if (!groupedByDate[update.dateStr]) {
                groupedByDate[update.dateStr] = [];
            }
            groupedByDate[update.dateStr].push(update);
        });

        // Loop over dates
        Object.entries(groupedByDate).forEach(([dateStr, updates]) => {
            const dayEl = document.createElement('div');
            dayEl.className = 'timeline-day';

            const headerEl = document.createElement('div');
            headerEl.className = 'day-header';
            headerEl.innerHTML = `
                <div class="day-dot"></div>
                <div class="day-date">${dateStr}</div>
            `;
            dayEl.appendChild(headerEl);

            const updatesContainer = document.createElement('div');
            updatesContainer.className = 'day-updates';

            updates.forEach(update => {
                const isSelected = state.selectedUpdateId === update.id;
                
                const cardEl = document.createElement('div');
                cardEl.className = `update-card ${isSelected ? 'selected' : ''}`;
                cardEl.dataset.id = update.id;

                const displayType = getDisplayTypeName(update.type);
                const badgeClass = update.type.toLowerCase();

                cardEl.innerHTML = `
                    <div class="card-meta">
                        <span class="type-badge ${badgeClass}">
                            ${getBadgeIcon(update.type)} ${displayType}
                        </span>
                        <div class="select-indicator">
                            <span>${isSelected ? 'Selected' : 'Select to share'}</span>
                            <i class="fa-solid ${isSelected ? 'fa-circle-check' : 'fa-circle'}"></i>
                        </div>
                    </div>
                    <div class="update-description">
                        ${update.html}
                    </div>
                    <div class="card-footer">
                        <button class="btn-card-tweet" data-tweet-id="${update.id}">
                            <i class="fa-brands fa-x-twitter"></i> Tweet
                        </button>
                    </div>
                `;

                // Handle click to select card
                cardEl.addEventListener('click', (e) => {
                    // Prevent trigger if they click the inline Tweet button directly
                    if (e.target.closest('.btn-card-tweet')) return;
                    selectUpdate(update.id);
                });

                // Handle clicking the specific Tweet button
                const cardTweetBtn = cardEl.querySelector('.btn-card-tweet');
                cardTweetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectUpdate(update.id);
                    // Trigger sharing immediately
                    triggerShare();
                });

                updatesContainer.appendChild(cardEl);
            });

            dayEl.appendChild(updatesContainer);
            timelineContainer.appendChild(dayEl);
        });
    }

    function getDisplayTypeName(type) {
        switch(type) {
            case 'FEATURE': return 'Feature';
            case 'ISSUE': return 'Issue / Fix';
            case 'ANNOUNCEMENT': return 'Announcement';
            default: return 'Update';
        }
    }

    function getBadgeIcon(type) {
        switch(type) {
            case 'FEATURE': return '<i class="fa-solid fa-wand-magic-sparkles"></i>';
            case 'ISSUE': return '<i class="fa-solid fa-bug-slash"></i>';
            case 'ANNOUNCEMENT': return '<i class="fa-solid fa-bullhorn"></i>';
            default: return '<i class="fa-solid fa-circle-info"></i>';
        }
    }

    // --- 3. Selection & Composer Engine ---

    function selectUpdate(id) {
        state.selectedUpdateId = id;
        state.composer.customized = false; // Reset manual customization flag
        
        // Re-render timeline to update selections
        renderTimeline();

        // Load details into Composer
        const update = state.parsedUpdates.find(u => u.id === id);
        if (!update) return;

        // Render Selection Info Panel
        selectedTitle.innerText = `${getDisplayTypeName(update.type)} • ${update.dateStr}`;
        selectedPreviewContent.innerHTML = update.html;

        // Generate Draft Text
        generateTweetDraft();
    }

    function generateTweetDraft() {
        if (!state.selectedUpdateId) return;

        const update = state.parsedUpdates.find(u => u.id === state.selectedUpdateId);
        if (!update) return;

        // Strip HTML Tags to clean up standard text for draft
        let cleanText = update.text
            .replace(/\s+/g, ' ') // normalize whitespace
            .trim();
        
        // Truncate cleanText if it's too long, leaving room for URL and hashtags
        const maxCleanTextLen = 160;
        if (cleanText.length > maxCleanTextLen) {
            cleanText = cleanText.substring(0, maxCleanTextLen) + '...';
        }

        let typeLabel = '';
        if (update.type === 'FEATURE') typeLabel = '🚀 New Feature: ';
        else if (update.type === 'ISSUE') typeLabel = '🛠️ Fix/Issue: ';
        else if (update.type === 'ANNOUNCEMENT') typeLabel = '📢 Announcement: ';
        else typeLabel = '📝 BQ Update: ';

        let draft = `${typeLabel}${cleanText}`;

        // Append Link
        if (state.composer.includeLink && update.link) {
            draft += `\n\nRead more: ${update.link}`;
        }

        // Append Hashtags
        if (state.composer.includeHashtags) {
            draft += `\n\n#BigQuery #GoogleCloud #GCP`;
        }

        state.composer.text = draft;
        tweetTextarea.value = draft;

        updateComposerMetrics();
    }

    function updateComposerMetrics() {
        const text = tweetTextarea.value;
        const length = text.length;
        const limit = 280;
        const remaining = limit - length;

        // Update Text
        charCountText.innerText = remaining;

        // Update UI states based on limit
        if (remaining < 0) {
            charCountText.className = 'danger';
            btnTweet.disabled = true;
        } else if (remaining <= 20) {
            charCountText.className = 'warning';
            btnTweet.disabled = false;
        } else {
            charCountText.className = '';
            btnTweet.disabled = length === 0;
        }

        // Update SVG Progress Ring
        const percentage = Math.min(length / limit, 1);
        const offset = circleCircumference - (percentage * circleCircumference);
        progressRingBar.style.strokeDashoffset = offset;

        // Change Progress Ring Color
        if (percentage >= 1) {
            progressRingBar.style.stroke = '#ef4444'; // Red
        } else if (percentage >= 0.9) {
            progressRingBar.style.stroke = '#fbbf24'; // Amber
        } else {
            progressRingBar.style.stroke = '#6366f1'; // Indigo
        }
    }

    function triggerShare() {
        const text = tweetTextarea.value;
        if (!text || text.length > 280) return;

        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
    }

    // --- 4. Event Listeners ---

    // Refresh Button Click
    btnRefresh.addEventListener('click', loadReleaseNotes);

    // Search Input
    searchInput.addEventListener('input', () => {
        const val = searchInput.value;
        if (val.trim() !== '') {
            searchClearBtn.classList.remove('hidden');
        } else {
            searchClearBtn.classList.add('hidden');
        }
        applyFilters();
    });

    // Clear Search Input
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchClearBtn.classList.add('hidden');
        applyFilters();
        searchInput.focus();
    });

    // Type Filter Select
    filterType.addEventListener('change', applyFilters);

    // Textarea manual edits
    tweetTextarea.addEventListener('input', () => {
        state.composer.customized = true;
        updateComposerMetrics();
    });

    // Toggle Include Link
    toggleLink.addEventListener('click', () => {
        state.composer.includeLink = !state.composer.includeLink;
        toggleLink.classList.toggle('active', state.composer.includeLink);
        generateTweetDraft();
    });

    // Toggle Include Hashtags
    toggleHashtags.addEventListener('click', () => {
        state.composer.includeHashtags = !state.composer.includeHashtags;
        toggleHashtags.classList.toggle('active', state.composer.includeHashtags);
        generateTweetDraft();
    });

    // Tweet Button Click
    btnTweet.addEventListener('click', triggerShare);

    // Error Close Button Click
    btnErrorClose.addEventListener('click', hideError);

    // --- 5. UI Helpers ---

    function showLoadingState(isLoading) {
        if (isLoading) {
            spinnerIcon.classList.remove('hidden');
            btnText.innerHTML = 'Loading...';
            btnRefresh.disabled = true;
            skeletonLoader.classList.remove('hidden');
            timelineContainer.classList.add('hidden');
            emptyState.classList.add('hidden');
            
            // Adjust sidebar status dot
            const statusDot = document.querySelector('.status-dot');
            statusDot.className = 'status-dot loading';
        } else {
            spinnerIcon.classList.add('hidden');
            btnText.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Refresh';
            btnRefresh.disabled = false;
            skeletonLoader.classList.add('hidden');
            
            // Adjust sidebar status dot
            const statusDot = document.querySelector('.status-dot');
            if (errorBanner.classList.contains('hidden')) {
                statusDot.className = 'status-dot online';
            } else {
                statusDot.className = 'status-dot error';
            }
        }
    }

    function showEmptyState() {
        timelineContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }

    function showError(message) {
        errorMessage.innerText = message;
        errorBanner.classList.remove('hidden');
        
        const statusDot = document.querySelector('.status-dot');
        statusDot.className = 'status-dot error';
    }

    function hideError() {
        errorBanner.classList.add('hidden');
    }

    // --- Initial Boot ---
    loadReleaseNotes();
});

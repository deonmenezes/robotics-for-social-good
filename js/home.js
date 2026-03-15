var navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', function () {
        navbar.classList.toggle('scrolled', window.scrollY > 16);
    });
}

var mobileToggle = document.getElementById('mobileToggle');
var navLinks = document.querySelector('.nav-links');
if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', function () {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.padding = '18px 24px 24px';
        navLinks.style.flexDirection = 'column';
        navLinks.style.gap = '14px';
        navLinks.style.background = '#f4efe6';
        navLinks.style.borderBottom = '2px solid #111111';
    });
}

function prettifyName(filename) {
    return String(filename || '')
        .replace(/\.(mp4|mov|avi|mkv|webm)$/i, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, function (char) { return char.toUpperCase(); });
}

function prettifyCategory(category) {
    return String(category || 'general-robotics')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, function (char) { return char.toUpperCase(); });
}

function cleanSummary(summary) {
    var text = String(summary || '')
        .replace(/\\n/g, ' ')
        .replace(/\[[\d:-]+\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!text) {
        return 'No summary yet.';
    }
    return text.length > 180 ? text.slice(0, 177) + '...' : text;
}

function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) {
        return;
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () {
        toast.classList.remove('show');
    }, 3500);
}

async function loadShowcase() {
    var grid = document.getElementById('showcaseGrid');
    var filtersEl = document.getElementById('showcaseFilters');
    var searchForm = document.getElementById('showcaseSearchForm');
    var searchInput = document.getElementById('showcaseSearchInput');
    var sortEl = document.getElementById('showcaseSorts');
    var resultsCount = document.getElementById('libraryResults');
    var emptyState = document.getElementById('showcaseEmpty');
    var heroDatasetCount = document.getElementById('heroDatasetCount');
    var heroCategoryCount = document.getElementById('heroCategoryCount');
    var activeCollectionName = document.getElementById('activeCollectionName');
    var heroFingerprint = document.getElementById('heroFingerprint');
    var collectionNote = document.getElementById('heroCollectionNote');

    if (!grid || !window.RFSGDatasets) {
        return;
    }

    try {
        var payload = await window.RFSGDatasets.loadDatasetCollection();
        var videos = payload.videos || [];
        var collection = payload.collection || {};
        var state = {
            filter: 'all',
            sort: 'confidence',
            query: '',
        };

        if (heroDatasetCount) {
            heroDatasetCount.textContent = String(videos.length);
        }
        if (heroCategoryCount) {
            heroCategoryCount.textContent = String(new Set(videos.map(function (video) {
                return video.use_case || 'general-robotics';
            })).size);
        }
        if (activeCollectionName) {
            activeCollectionName.textContent = collection.name || 'Main Library';
        }
        if (heroFingerprint) {
            heroFingerprint.textContent = collection.api_key_fingerprint || 'local';
        }
        if (collectionNote) {
            collectionNote.textContent = collection.generated_at
                ? 'Generated ' + new Date(collection.generated_at).toLocaleDateString()
                : 'Public pages only read generated JSON. Your actual API key stays in .env.';
        }

        var categories = Array.from(new Set(videos.map(function (video) {
            return video.use_case || 'general-robotics';
        }))).sort();

        categories.forEach(function (category) {
            var button = document.createElement('button');
            button.className = 'filter-btn';
            button.type = 'button';
            button.dataset.filter = category;
            button.textContent = prettifyCategory(category);
            filtersEl.appendChild(button);
        });

        function getFilteredVideos() {
            var query = state.query.trim().toLowerCase();
            var filtered = videos.filter(function (video) {
                var categoryMatch = state.filter === 'all' || video.use_case === state.filter;
                if (!categoryMatch) {
                    return false;
                }
                if (!query) {
                    return true;
                }

                var haystack = [
                    video.filename,
                    video.source,
                    video.use_case,
                    video.use_case_title,
                    video.summary,
                    video.nomadic_summary
                ].concat(video.event_labels || []).filter(Boolean).join(' ').toLowerCase();

                return haystack.indexOf(query) !== -1;
            });

            filtered.sort(function (a, b) {
                if (state.sort === 'events') {
                    return (b.event_count || 0) - (a.event_count || 0) || (b.confidence || 0) - (a.confidence || 0);
                }
                if (state.sort === 'name') {
                    return prettifyName(a.filename).localeCompare(prettifyName(b.filename));
                }
                return (b.confidence || 0) - (a.confidence || 0) || (b.event_count || 0) - (a.event_count || 0);
            });

            return filtered;
        }

        function renderCards() {
            var filtered = getFilteredVideos();
            grid.innerHTML = '';

            if (resultsCount) {
                resultsCount.textContent = filtered.length + ' videos in ' + (state.filter === 'all' ? 'all categories' : prettifyCategory(state.filter));
            }

            if (emptyState) {
                emptyState.style.display = filtered.length ? 'none' : 'block';
            }

            filtered.forEach(function (video) {
                var article = document.createElement('article');
                var previewPath = window.RFSGDatasets.getPreviewPath(video.filename);
                var hasPreview = Boolean(previewPath);
                var thumb = video.thumbnail ? 'assets/' + video.thumbnail : '';
                var tags = (video.event_labels || []).slice(0, 4);

                article.className = 'library-card';
                article.innerHTML = ''
                    + '<div class="library-card-media">'
                    + (thumb
                        ? '<img src="' + thumb + '" alt="' + prettifyName(video.filename) + '" loading="lazy">'
                        : '<div class="media-fallback">No Thumb</div>')
                    + '</div>'
                    + '<div class="library-card-body">'
                    + '<div class="library-card-top">'
                    + '<div>'
                    + '<p class="library-card-kicker">' + (video.source || 'dataset') + '</p>'
                    + '<h3 class="library-card-title">' + prettifyName(video.filename) + '</h3>'
                    + '</div>'
                    + '<span class="library-card-chip">' + prettifyCategory(video.use_case_title || video.use_case) + '</span>'
                    + '</div>'
                    + '<p class="library-card-summary">' + cleanSummary(video.summary || video.nomadic_summary) + '</p>'
                    + (tags.length
                        ? '<div class="library-card-tags">' + tags.map(function (tag) {
                            return '<span class="library-card-tag">' + tag + '</span>';
                        }).join('') + '</div>'
                        : '')
                    + '<div class="library-card-meta">'
                    + '<span class="library-card-stat">' + (video.confidence || 0) + '% confidence</span>'
                    + '<span class="library-card-stat">' + (video.event_count || 0) + ' events</span>'
                    + '</div>'
                    + '<div class="library-card-actions">'
                    + '<a class="primary-link" href="explore.html?dataset=' + encodeURIComponent(collection.id || 'labels') + '">Open Details</a>'
                    + (hasPreview ? '<a class="secondary-link" href="' + previewPath + '">Preview Video</a>' : '')
                    + '</div>'
                    + '</div>';

                grid.appendChild(article);
            });
        }

        filtersEl.addEventListener('click', function (event) {
            var button = event.target.closest('.filter-btn');
            if (!button) {
                return;
            }
            filtersEl.querySelectorAll('.filter-btn').forEach(function (item) {
                item.classList.remove('active');
            });
            button.classList.add('active');
            state.filter = button.dataset.filter;
            renderCards();
        });

        if (sortEl) {
            sortEl.addEventListener('click', function (event) {
                var button = event.target.closest('.sort-btn');
                if (!button) {
                    return;
                }
                sortEl.querySelectorAll('.sort-btn').forEach(function (item) {
                    item.classList.remove('active');
                });
                button.classList.add('active');
                state.sort = button.dataset.sort;
                renderCards();
            });
        }

        if (searchForm && searchInput) {
            searchForm.addEventListener('submit', function (event) {
                event.preventDefault();
                state.query = searchInput.value;
                renderCards();
                if (state.query.trim()) {
                    showToast('Filtered library for "' + state.query.trim() + '".');
                }
            });

            searchInput.addEventListener('input', function () {
                state.query = searchInput.value;
                renderCards();
            });
        }

        renderCards();
    } catch (error) {
        console.error('Could not load showcase', error);
        grid.innerHTML = '<p>Could not load dataset library.</p>';
    }
}

loadShowcase();

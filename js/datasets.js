(function () {
    function loadSimulatedEntries() {
        try {
            var stored = localStorage.getItem('rfsg_simulated_entries');
            var parsed = stored ? JSON.parse(stored) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
            return [];
        }
    }

    function mergeSimulatedEntries(payload) {
        var simulated = loadSimulatedEntries();
        if (!simulated.length) {
            return payload;
        }

        var merged = {};
        (payload.videos || []).forEach(function (item) {
            merged[item.filename] = item;
        });
        simulated.forEach(function (item) {
            merged[item.filename] = item;
        });

        payload.videos = Object.values(merged).sort(function (a, b) {
            return (b.confidence || 0) - (a.confidence || 0) || (b.event_count || 0) - (a.event_count || 0);
        });
        return payload;
    }

    function getPreviewPath(filename) {
        var stem = String(filename || '').replace(/\.(mp4|mov|avi|mkv|webm)$/i, '');
        return stem ? 'assets/previews/' + stem + '.mp4' : '';
    }

    function normalizePayload(payload, fallbackCollection) {
        if (Array.isArray(payload)) {
            return {
                collection: fallbackCollection || {
                    id: 'labels',
                    name: 'Main Library',
                    api_key_fingerprint: 'local',
                },
                videos: payload,
            };
        }

        return {
            collection: payload.collection || fallbackCollection || {
                id: 'labels',
                name: 'Main Library',
                api_key_fingerprint: 'local',
            },
            videos: payload.videos || [],
        };
    }

    async function fetchJson(path) {
        var response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('Could not load ' + path);
        }
        return response.json();
    }

    async function loadDatasetCollection() {
        try {
            var manifest = await fetchJson('data/manifest.json');
            var params = new URLSearchParams(window.location.search);
            var requestedId = params.get('dataset');
            var collections = manifest.collections || [];
            var selected = collections.find(function (item) {
                return item.id === requestedId;
            }) || collections.find(function (item) {
                return item.id === manifest.default_collection;
            }) || collections[0];

            if (selected && selected.path) {
                var payload = await fetchJson(selected.path);
                var normalized = normalizePayload(payload, selected);
                normalized.manifest = manifest;
                return mergeSimulatedEntries(normalized);
            }
        } catch (error) {
            console.warn('Generated collection manifest unavailable, falling back to labels.json.', error);
        }

        var labels = await fetchJson('labels.json');
        return mergeSimulatedEntries(normalizePayload(labels, {
            id: 'labels',
            name: 'Main Library',
            api_key_fingerprint: 'local',
            path: 'labels.json',
        }));
    }

    window.RFSGDatasets = {
        getPreviewPath: getPreviewPath,
        loadDatasetCollection: loadDatasetCollection,
    };
}());

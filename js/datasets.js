(function () {
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
            var apiPayload = await fetchJson('/api/datasets');
            return normalizePayload(apiPayload, apiPayload.collection);
        } catch (error) {
            console.warn('API dataset feed unavailable, falling back to static files.', error);
        }

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
                return normalized;
            }
        } catch (error) {
            console.warn('Generated collection manifest unavailable, falling back to labels.json.', error);
        }

        var labels = await fetchJson('labels.json');
        return normalizePayload(labels, {
            id: 'labels',
            name: 'Main Library',
            api_key_fingerprint: 'local',
            path: 'labels.json',
        });
    }

    window.RFSGDatasets = {
        getPreviewPath: getPreviewPath,
        loadDatasetCollection: loadDatasetCollection,
    };
}());

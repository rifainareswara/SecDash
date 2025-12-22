// Background Service Worker for Activity Tracker Extension

// Default configuration
let config = {
    serverUrl: '',
    clientId: '',
    enabled: true,
    deviceName: ''
};

// Load config from storage
chrome.storage.sync.get(['serverUrl', 'clientId', 'enabled', 'deviceName'], (result) => {
    if (result.serverUrl) config.serverUrl = result.serverUrl;
    if (result.clientId) config.clientId = result.clientId;
    if (result.deviceName) config.deviceName = result.deviceName;
    config.enabled = result.enabled !== false;

    // Generate client ID if not exists
    if (!config.clientId) {
        config.clientId = 'ext-' + Math.random().toString(36).substr(2, 12);
        chrome.storage.sync.set({ clientId: config.clientId });
    }
});

// Report activity to server
async function reportActivity(tab) {
    if (!config.enabled || !config.serverUrl || !tab.url) return;

    // Skip chrome:// and extension pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

    try {
        const response = await fetch(config.serverUrl + '/api/activity-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Id': config.clientId
            },
            body: JSON.stringify({
                url: tab.url,
                title: tab.title || '',
                client_id: config.clientId,
                device_name: config.deviceName || 'Browser Extension',
                timestamp: new Date().toISOString()
            })
        });

        console.log('Activity reported:', tab.url);
    } catch (error) {
        console.error('Failed to report activity:', error);
    }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        reportActivity(tab);
    }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    reportActivity(tab);
});

// Listen for config updates from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateConfig') {
        config = { ...config, ...message.config };
        chrome.storage.sync.set(config);
        sendResponse({ success: true });
    } else if (message.type === 'getConfig') {
        sendResponse(config);
    } else if (message.type === 'testConnection') {
        testConnection().then(result => sendResponse(result));
        return true; // Keep channel open for async response
    }
});

async function testConnection() {
    if (!config.serverUrl) return { success: false, error: 'No server URL configured' };

    try {
        const response = await fetch(config.serverUrl + '/api/activity-logs?limit=1');
        const data = await response.json();
        return { success: data.success, message: 'Connected successfully' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

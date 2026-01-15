// Background Service Worker for Activity Tracker Extension
// PIN-Protected Version

// Default configuration
let config = {
    serverUrl: '',
    clientId: '',
    enabled: true,
    deviceName: '',
    pinProtected: false // Whether PIN protection is enabled on server
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

    // Check if PIN protection is enabled on server
    checkPinProtection();
});

// Check if server has PIN protection enabled
async function checkPinProtection() {
    if (!config.serverUrl) return;
    
    try {
        const response = await fetch(config.serverUrl + '/api/agent-pin/status');
        const data = await response.json();
        config.pinProtected = data.hasPin || false;
        chrome.storage.sync.set({ pinProtected: config.pinProtected });
    } catch (error) {
        console.log('Could not check PIN status:', error);
    }
}

// Verify PIN with server
async function verifyPin(pin) {
    if (!config.serverUrl) {
        return { success: false, error: 'No server URL configured' };
    }

    try {
        const response = await fetch(config.serverUrl + '/api/agent-pin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });
        const data = await response.json();
        return { success: data.verified, message: data.message };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

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
        // If trying to disable and PIN protected, verify first
        if (message.config.enabled === false && config.pinProtected && !message.pinVerified) {
            sendResponse({ success: false, requirePin: true });
            return;
        }
        
        config = { ...config, ...message.config };
        chrome.storage.sync.set(config);
        sendResponse({ success: true });
    } else if (message.type === 'getConfig') {
        sendResponse(config);
    } else if (message.type === 'testConnection') {
        testConnection().then(result => sendResponse(result));
        return true;
    } else if (message.type === 'verifyPin') {
        verifyPin(message.pin).then(result => sendResponse(result));
        return true;
    } else if (message.type === 'checkPinStatus') {
        checkPinProtection().then(() => sendResponse({ pinProtected: config.pinProtected }));
        return true;
    }
});

async function testConnection() {
    if (!config.serverUrl) return { success: false, error: 'No server URL configured' };

    try {
        const response = await fetch(config.serverUrl + '/api/activity-logs?limit=1');
        const data = await response.json();
        
        // Also check PIN status
        await checkPinProtection();
        
        return { success: data.success, message: 'Connected successfully', pinProtected: config.pinProtected };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Activity Tracker Agent
 * =====================
 * 
 * A lightweight browser tracking script for the VPN Dashboard.
 * Can be used as:
 * 1. Browser Extension (Manifest V3)
 * 2. Injected script
 * 3. Bookmarklet
 * 
 * Configuration:
 * - SERVER_URL: Your dashboard server URL
 * - CLIENT_ID: Unique device identifier (auto-generated if not set)
 * - DEVICE_NAME: Optional device name for identification
 */

(function () {
    'use strict';

    // Configuration - Update SERVER_URL to your dashboard URL
    const CONFIG = {
        SERVER_URL: window.ACTIVITY_TRACKER_SERVER || window.location.origin,
        CLIENT_ID: localStorage.getItem('activity_tracker_client_id') || generateClientId(),
        DEVICE_NAME: window.ACTIVITY_TRACKER_DEVICE_NAME || navigator.userAgent.split(' ').slice(0, 3).join(' '),
        REPORT_INTERVAL: 5000, // Report every 5 seconds while active
        DEBUG: false
    };

    // Save client ID for persistence
    try {
        localStorage.setItem('activity_tracker_client_id', CONFIG.CLIENT_ID);
    } catch (e) {
        // localStorage not available
    }

    function generateClientId() {
        return 'device-' + Math.random().toString(36).substr(2, 12);
    }

    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log('[ActivityTracker]', ...args);
        }
    }

    function reportActivity(url, title) {
        const data = {
            url: url || window.location.href,
            title: title || document.title,
            client_id: CONFIG.CLIENT_ID,
            device_name: CONFIG.DEVICE_NAME,
            timestamp: new Date().toISOString()
        };

        log('Reporting:', data.url);

        fetch(CONFIG.SERVER_URL + '/api/activity-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Client-Id': CONFIG.CLIENT_ID,
                'X-Device-Token': CONFIG.CLIENT_ID
            },
            body: JSON.stringify(data),
            mode: 'cors',
            credentials: 'omit'
        })
            .then(res => res.json())
            .then(data => log('Reported successfully'))
            .catch(err => log('Report failed:', err.message));
    }

    // Track initial page load
    let lastUrl = window.location.href;
    reportActivity();

    // Track navigation changes (SPA support)
    const observer = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            reportActivity();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Track history changes
    const originalPushState = history.pushState;
    history.pushState = function () {
        originalPushState.apply(history, arguments);
        reportActivity();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function () {
        originalReplaceState.apply(history, arguments);
        reportActivity();
    };

    window.addEventListener('popstate', () => reportActivity());

    // Export for external access
    window.ActivityTracker = {
        getClientId: () => CONFIG.CLIENT_ID,
        setServerUrl: (url) => { CONFIG.SERVER_URL = url; },
        setDeviceName: (name) => { CONFIG.DEVICE_NAME = name; },
        report: () => reportActivity(),
        enableDebug: () => { CONFIG.DEBUG = true; }
    };

    console.log('✅ Activity Tracker Active');
    console.log('   Client ID:', CONFIG.CLIENT_ID);
    console.log('   Server:', CONFIG.SERVER_URL);
})();

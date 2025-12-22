// Popup JavaScript for Activity Tracker Extension

document.addEventListener('DOMContentLoaded', () => {
    const serverUrlInput = document.getElementById('serverUrl');
    const deviceNameInput = document.getElementById('deviceName');
    const toggleEnabled = document.getElementById('toggleEnabled');
    const saveBtn = document.getElementById('saveBtn');
    const testBtn = document.getElementById('testBtn');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const clientIdSpan = document.getElementById('clientId');
    const messageDiv = document.getElementById('message');

    let config = {
        serverUrl: '',
        deviceName: '',
        enabled: true,
        clientId: ''
    };

    // Load current config
    chrome.runtime.sendMessage({ type: 'getConfig' }, (response) => {
        if (response) {
            config = response;
            serverUrlInput.value = config.serverUrl || '';
            deviceNameInput.value = config.deviceName || '';
            clientIdSpan.textContent = config.clientId || '-';
            updateToggle(config.enabled);
            updateStatus();
        }
    });

    function updateToggle(enabled) {
        if (enabled) {
            toggleEnabled.classList.add('active');
        } else {
            toggleEnabled.classList.remove('active');
        }
        config.enabled = enabled;
    }

    function updateStatus() {
        if (config.enabled && config.serverUrl) {
            statusDot.classList.remove('inactive');
            statusText.textContent = 'Active - Tracking enabled';
        } else if (!config.serverUrl) {
            statusDot.classList.add('inactive');
            statusText.textContent = 'Not configured';
        } else {
            statusDot.classList.add('inactive');
            statusText.textContent = 'Tracking disabled';
        }
    }

    function showMessage(text, type) {
        messageDiv.innerHTML = `<div class="message ${type}">${text}</div>`;
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 3000);
    }

    toggleEnabled.addEventListener('click', () => {
        updateToggle(!config.enabled);
        updateStatus();
    });

    saveBtn.addEventListener('click', () => {
        config.serverUrl = serverUrlInput.value.trim();
        config.deviceName = deviceNameInput.value.trim();

        chrome.runtime.sendMessage({
            type: 'updateConfig',
            config: config
        }, (response) => {
            if (response && response.success) {
                showMessage('Settings saved!', 'success');
                updateStatus();
            } else {
                showMessage('Failed to save settings', 'error');
            }
        });
    });

    testBtn.addEventListener('click', () => {
        config.serverUrl = serverUrlInput.value.trim();

        if (!config.serverUrl) {
            showMessage('Please enter server URL first', 'error');
            return;
        }

        testBtn.textContent = 'Testing...';
        testBtn.disabled = true;

        chrome.runtime.sendMessage({ type: 'testConnection' }, (response) => {
            testBtn.textContent = 'Test Connection';
            testBtn.disabled = false;

            if (response && response.success) {
                showMessage('Connection successful!', 'success');
            } else {
                showMessage(response?.error || 'Connection failed', 'error');
            }
        });
    });
});

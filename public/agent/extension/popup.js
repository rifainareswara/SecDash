// Popup JavaScript for Activity Tracker Extension
// PIN-Protected Version

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
    const protectedBadge = document.getElementById('protectedBadge');
    
    // PIN Modal elements
    const pinModal = document.getElementById('pinModal');
    const pinInput = document.getElementById('pinInput');
    const pinError = document.getElementById('pinError');
    const verifyPinBtn = document.getElementById('verifyPinBtn');
    const cancelPinBtn = document.getElementById('cancelPinBtn');

    let config = {
        serverUrl: '',
        deviceName: '',
        enabled: true,
        clientId: '',
        pinProtected: false
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
            
            // Check PIN protection
            if (config.pinProtected) {
                showProtectedBadge();
            }
        }
    });

    function showProtectedBadge() {
        protectedBadge.style.display = 'inline';
        toggleEnabled.classList.add('locked');
    }

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

    // Toggle click handler with PIN protection
    toggleEnabled.addEventListener('click', () => {
        // If trying to disable and PIN protected, show PIN modal
        if (config.enabled && config.pinProtected) {
            showPinModal();
            return;
        }
        
        updateToggle(!config.enabled);
        updateStatus();
    });

    // Show PIN modal
    function showPinModal() {
        pinModal.classList.add('show');
        pinInput.value = '';
        pinError.style.display = 'none';
        pinInput.focus();
    }

    // Hide PIN modal
    function hidePinModal() {
        pinModal.classList.remove('show');
        pinInput.value = '';
        pinError.style.display = 'none';
    }

    // Cancel PIN
    cancelPinBtn.addEventListener('click', hidePinModal);

    // Verify PIN
    verifyPinBtn.addEventListener('click', async () => {
        const pin = pinInput.value.trim();
        if (!pin) {
            pinError.textContent = 'Please enter PIN';
            pinError.style.display = 'block';
            return;
        }

        verifyPinBtn.textContent = 'Verifying...';
        verifyPinBtn.disabled = true;

        chrome.runtime.sendMessage({ type: 'verifyPin', pin }, (response) => {
            verifyPinBtn.textContent = 'Verify';
            verifyPinBtn.disabled = false;

            if (response && response.success) {
                // PIN verified - disable tracking
                hidePinModal();
                config.enabled = false;
                updateToggle(false);
                updateStatus();
                
                // Save config with pinVerified flag
                chrome.runtime.sendMessage({
                    type: 'updateConfig',
                    config: { enabled: false },
                    pinVerified: true
                });
                
                showMessage('PIN verified - Tracking disabled', 'success');
            } else {
                pinError.textContent = response?.message || 'Invalid PIN';
                pinError.style.display = 'block';
            }
        });
    });

    // Enter key on PIN input
    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verifyPinBtn.click();
        }
    });

    // Save button
    saveBtn.addEventListener('click', () => {
        config.serverUrl = serverUrlInput.value.trim();
        config.deviceName = deviceNameInput.value.trim();

        // If trying to save with disabled and PIN protected, require PIN
        if (!config.enabled && config.pinProtected) {
            showMessage('PIN required to disable tracking', 'error');
            config.enabled = true;
            updateToggle(true);
            return;
        }

        chrome.runtime.sendMessage({
            type: 'updateConfig',
            config: config
        }, (response) => {
            if (response && response.success) {
                showMessage('Settings saved!', 'success');
                updateStatus();
                
                // Refresh PIN protection status
                chrome.runtime.sendMessage({ type: 'checkPinStatus' }, (res) => {
                    if (res && res.pinProtected) {
                        config.pinProtected = true;
                        showProtectedBadge();
                    }
                });
            } else if (response && response.requirePin) {
                showMessage('PIN required to disable tracking', 'error');
            } else {
                showMessage('Failed to save settings', 'error');
            }
        });
    });

    // Test connection
    testBtn.addEventListener('click', () => {
        config.serverUrl = serverUrlInput.value.trim();

        if (!config.serverUrl) {
            showMessage('Please enter server URL first', 'error');
            return;
        }

        testBtn.textContent = 'Testing...';
        testBtn.disabled = true;

        chrome.runtime.sendMessage({
            type: 'testConnection',
            url: config.serverUrl
        }, (response) => {
            testBtn.textContent = 'Test Connection';
            testBtn.disabled = false;

            if (response && response.success) {
                showMessage('Connection successful!', 'success');
                
                // Update PIN protection status
                if (response.pinProtected) {
                    config.pinProtected = true;
                    showProtectedBadge();
                    showMessage('Connected! PIN protection is active.', 'success');
                }
            } else {
                showMessage(response?.error || 'Connection failed', 'error');
            }
        });
    });
});

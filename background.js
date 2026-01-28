browser.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'log') {
        // handle incoming log messages
        // write to an array of log messages on a FIFO principle
        get_prop('log', []).then((current_log) => {
            if (current_log.length > 500) {
                current_log.shift();
            }
            current_log.push({
                timestamp: Date.now(),
                text: message.log
            });
            return set_prop('log', current_log);
        }).then((log) => { }).catch((err) => { console.log(`Logging error: ${err}`); });
    } else if (message.action === 'get-tab-id') {
        // return the tab ID of the sender's tab
        // this can be used to retrieve the tab ID from a content script (which
        // has no access to the tabs API)
        return sendResponse({action: 'return-tab-id', id: sender.tab.id});
    }
});

setInterval(async function () {
    // set extension icon based on status
    const [tab] = await browser.tabs.query({active: true, currentWindow: true});
    if(!tab) {
        return;
    }

    const running_tab = await get_prop('scrolling');
    if(!running_tab) {
        // no active tab; not scrolling anywhere
        browser.browserAction.setIcon({path: 'images/icon-inactive.png'})
    } else if (running_tab !== tab.id) {
        // there is a running tab but we are not viewing it: semi-active
        browser.browserAction.setIcon({path: 'images/icon-semiactive.png'})
    } else {
        // there is a running tab and we are viewing it; active
        browser.browserAction.setIcon({path: 'images/icon-active.png'})
    }
}, 250);
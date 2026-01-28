const button_start = document.querySelector('button#start');
const button_stop = document.querySelector('button#stop');
const button_clear = document.querySelector('button#clear');

// start button: set currently active tab as the tab to scroll in and send a
// message to the content script
button_start.addEventListener('click', async () => {
    const [tab] = await browser.tabs.query({active: true, currentWindow: true});
    await set_prop('scrolling', tab.id);
    await set_prop('timeout', false);
    try {
        // send a message to the content script running in that tab
        await browser.tabs.sendMessage(tab.id, {action: 'start'});
        write_log("Started scrolling.");
    } catch (e) {
        write_log(`❌ Error sending message '${message.action}' to tab: ${e.message}. Your active tab needs to be an x.com search result page.`);
    }
});

// stop: unset active tab ID and timeout, content script will handle the rest
button_stop.addEventListener('click', async () => { // Event listener for the stop button
    await set_prop('scrolling', false);
    await set_prop('timeout', false);
    write_log("Stopping scroll...");
});

// clear log - just delete the logs from storage
button_clear.addEventListener('click', async () => {
    await clear_log();
})

// when scrolling but looking at another tab, clicking this link in the popup
// switches to the tab that is being scrolled in
document.querySelector('a#tab-title').addEventListener('click', (e) => {
    e.preventDefault();
    get_prop('scrolling', false).then((running_tab_id) => {
        browser.tabs.update(running_tab_id, {active: true});
    });
});

let old_log;
setInterval(sync_state, 250);

/**
 * Update interface
 *
 * Since the popup interface is reset every time the popup is closed, this
 * function sets the interface contents to reflect the current state of the
 * tool, and is called every so often.
 *
 * @returns {Promise<void>}
 */
async function sync_state() {
    const log_container = document.querySelector('#logs');
    const log = await get_prop('log', []);
    const [tab] = await browser.tabs.query({active: true, currentWindow: true});

    // set timeout ticker
    const timeout = await get_prop('timeout', 0);
    let timeout_remaining;
    if (timeout) {
        timeout_remaining = Math.round((timeout - Date.now()) / 1000);
    }
    if (timeout_remaining) {
        document.querySelector('#countdown-seconds').textContent = timeout_remaining;
        document.querySelector('#timeout').setAttribute('aria-hidden', 'false');
    } else {
        document.querySelector('#timeout').setAttribute('aria-hidden', 'true');
    }

    // check if there is a tab that is being scrolled in
    let running_tab_id = await get_prop('scrolling', false);
    let running_tab;
    try {
        running_tab = await browser.tabs.get(running_tab_id);
    } catch (e) {
        running_tab_id = false;
    }

    // update button status and 'other tab...' warning status
    if (running_tab_id && running_tab_id === tab.id) {
        // running and currently viewing tab
        button_start.disabled = true;
        button_stop.disabled = false;
        document.querySelector('#other-tab-warning').setAttribute('aria-hidden', 'true');
        document.querySelector('#serp-warning').setAttribute('aria-hidden', 'true');
        document.querySelector('#scroll-icon').classList.add('scroll');
        document.querySelector('#start-button-text').textContent = 'Scrolling...';
    } else if (running_tab_id) {
        // running but looking at other tab
        let tab_title = running_tab.title;
        button_start.disabled = true;
        button_stop.disabled = false;
        if (tab_title.length > 40) {
            tab_title = tab_title.substring(0, 40) + '...';
        }
        document.querySelector('#tab-title').textContent = tab_title;
        document.querySelector('#other-tab-warning').setAttribute('aria-hidden', 'false');
        document.querySelector('#serp-warning').setAttribute('aria-hidden', 'true');
        document.querySelector('#scroll-icon').classList.remove('scroll');
        document.querySelector('#start-button-text').textContent = 'Start';
    } else {
        // not running
        const on_eligible_page = tab.url.startsWith('https://x.com/search?q=');
        button_start.disabled = !on_eligible_page;
        button_stop.disabled = true;
        document.querySelector('#other-tab-warning').setAttribute('aria-hidden', 'true');
        document.querySelector('#serp-warning').setAttribute('aria-hidden', String(on_eligible_page));
        document.querySelector('#scroll-icon').classList.remove('scroll');
        document.querySelector('#start-button-text').textContent = 'Start';
    }

    // update log if there are new entries
    if (!logs_equal(log, old_log)) {
        old_log = log;
        log_container.textContent = '';
        for (const log_item of log) {
            const date = new Date(log_item.timestamp).toLocaleTimeString();
            const log_line = document.createElement('p')
            const date_container = document.createElement('span');
            const line_container = document.createElement('span');
            date_container.classList.add('date');
            line_container.classList.add('line');
            line_container.textContent = log_item.text;
            date_container.textContent = date;
            log_line.append(date_container);
            log_line.append(line_container);
            log_container.append(log_line);
        }
        // always scroll to the bottom of the log after an update
        log_container.scrollTop = log_container.scrollHeight;
    }
}
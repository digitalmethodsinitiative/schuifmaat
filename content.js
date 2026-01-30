const SCROLL_SPEED = 6000;

let last_seen_post_id;
let loops_since_retry = 0;
let testing_retry = false;

async function init() {
    const running_tab_id = await get_prop('scrolling');
    const own_tab_id = await get_tab_id();

    // the content script should only run in the tab the scrolling was started
    // in, the ID of which is stored...
    if(running_tab_id !== own_tab_id) {
        return;
    }

    write_log('Page loaded, starting auto-scroll');
    await scroll_page();
}

/**
 * Reload the page to resume scrolling where we left off
 *
 * Updates the 'max_id' query param to request all tweets older than the last
 * one seen and reloads the page. Useful to avoid memory leaks/the page
 * consuming too many resources. Note that this also re-inits the content
 * script!
 *
 * @returns {Promise<void>}
 */
async function refresh() {
    let new_url;
    // make new URL with max_id parameter
    // set it to the last seen post minus one, i.e. anything older
    // than the last seen post
    if (last_seen_post_id) {
        new_url = window.location.href;
        const new_max_id = BigInt(last_seen_post_id) - BigInt(1);
        const old_q = new_url.match(/q=([^&]+)&/)[1];
        let q = decodeURIComponent(old_q);
        if (q.indexOf('max_id:') >= 0) {
            // update max_id already in query
            q = q.replace(/max_id:[0-9]+/g, 'max_id:' + new_max_id);
        } else {
            // no max_id parameter yet
            q = q + ' max_id:' + new_max_id.toString();
        }
        q = encodeURIComponent(q);
        new_url = new_url.replace(old_q, q);
    } else {
        // if we've not seen any posts yet, just refresh the page
        new_url = window.location.href;
    }
    window.location.href = new_url;
}

/**
 * Wait until timeout expires
 *
 * When awaited, will block until the timeout expires. If there is no timeout,
 * return immediately.
 *
 * @returns {Promise<void>}
 */
async function blocking_timeout() {
    const timeout = await get_prop('timeout');
    if(!timeout) {
        return;
    }

    let i = 0;
    while(timeout > Date.now()) {
        await wait(500);
        if(i % 120 === 0) {
            // update every 60 seconds (120 * 500)
            const seconds = Math.round((timeout - Date.now()) / 1000);
            write_log(`Waiting ${seconds} seconds for rate limit reset...`);
        }
        i += 1;
    }

    write_log('Resuming scroll');
    await set_prop('timeout', false);
}

/**
 * Main loop
 *
 * @returns {Promise<void>}
 */
let first_loop = true;
async function scroll_page() {
    let is_running = await get_prop('scrolling');

    // main loop - scroll until we can no longer scroll, then do something clever
    while (is_running) {
        is_running = await get_prop('scrolling');

        // check if we're waiting for the rate limit to clear
        // if so, wait (and periodically log an update)
        if(!first_loop) {
            // always scroll at least once before waiting, in case we
            // immediately get results after refreshing
            await blocking_timeout();
        }

        // are we testing if a retry makes new posts appear?
        if (testing_retry) {
            if (loops_since_retry > 1) {
                // wait and refresh
                write_log('No new posts after retrying. Refreshing before checking again.');
                await set_prop('timeout', Date.now() + (5 * 60 * 1000));
                // this reloads the page and the content script, so nothing
                // after this line will be executed!
                await refresh();
            } else {
                loops_since_retry += 1
            }
        } else if (loops_since_retry > 0) {
            loops_since_retry = 0;
        }
        await scroll_to_bottom();

        // do we have a 'retry' button?
        // if so, click it and wait a bit to allow it to have an effect
        const retry_button = Array.from(document.querySelectorAll('button[role=button]')).filter(x => x.textContent.trim() === 'Retry');
        const have_went_wrong = Array.from(document.querySelectorAll('span')).some(x => x.textContent.trim() === 'Something went wrong. Try reloading.');
        if (have_went_wrong && retry_button) {
            write_log("Got an error, clicking 'Retry...'");
            retry_button[0].click();
            // wait a bit to allow new posts to be loaded
            await wait(2000);
            await scroll_to_bottom();
        }

        // do we have new tweets?
        const previous_last_post_id = last_seen_post_id;
        const last_tweet = document.querySelector('article[data-testid=tweet]');
        if (last_tweet) {
            const permalink = last_tweet.querySelector("div[data-testid='User-Name'] a[role=link][aria-label]");
            last_seen_post_id = permalink.getAttribute('href').split('/').pop();
        }

        // if we have no new tweets, start counting down until we consider ourselves rate-limited
        if (!last_seen_post_id || last_seen_post_id === previous_last_post_id) {
            write_log(`No new posts detected in this loop (${loops_since_retry + 1})`);
            if (!testing_retry) {
                testing_retry = true;
            }
        } else {
            // reset timeout, since we have data again
            loops_since_retry = 0;
            await set_prop('timeout', false);
        }
        first_loop = false;
    }

    write_log('Stop requested, ending loop.');
    set_prop('scrolling', false);
}

/**
 * Scroll to bottom naturally
 *
 * Adapted from FoxScroller, this 'smoothly' scrolls down to the bottom of the
 * page, and keeps doing so until the end is reached. There is a short buffer
 * time in which new content can be loaded before the scrolling is considered
 * to have reached the end of the page and stops. The function is blocking
 * until scrolling ends, in the sense that it returns a promise that can be
 * awaited.
 *
 * @returns {Promise<boolean>}
 */
async function scroll_to_bottom() {
    let previousTimeStamp;
    let timeOfHittingEndPoint;
    let distanceToScrollOnNextFrame = 0;
    // need to be at the bottom this long to consider ourselves at the end
    const grace_period = 1000;
    const direction = 1; //down
    const scrollspeed = get_pixel_speed(SCROLL_SPEED);
    const deltaPixel = scrollspeed[0];
    const deltaTime = scrollspeed[1];
    const reqAnimDeltaPixel = Math.round(1000.0 / deltaTime * deltaPixel);
    let waiting_for_end = true;

    window.requestAnimationFrame(async function scrollABit(timestamp) {
        // decide which endpoint to use, depending on the direction
        if (!await get_prop('scrolling')) {
            return;
        }
        // round since these can be fractions sometimes???
        const currentScroll = Math.round(window.scrollY);
        const endPoint = direction === 1 ? window.scrollMaxY : 0;
        if ((currentScroll !== endPoint)) {
            // not at the end yet - scroll some more
            if (!previousTimeStamp) previousTimeStamp = timestamp;
            // reset timeOfHittingEndPoint, because page is not at the end
            timeOfHittingEndPoint = null;
            // sum up distance that should be scrolled in the elapsed time
            distanceToScrollOnNextFrame += (timestamp - previousTimeStamp) / 1000 * reqAnimDeltaPixel;
            // if distance is greater than one pixel scroll it and reset it
            if (distanceToScrollOnNextFrame > 1) {
                window.scrollBy(0, direction * distanceToScrollOnNextFrame);
                distanceToScrollOnNextFrame = 0;
            }
            // register function to be called on the next frame
            window.requestAnimationFrame(scrollABit);
            previousTimeStamp = timestamp;
        } else {
            // can scroll no further
            previousTimeStamp = null;
            distanceToScrollOnNextFrame = 0;
            if (!timeOfHittingEndPoint) {
                // save time when end is reached first time
                timeOfHittingEndPoint = timestamp;
            } else if (timestamp - timeOfHittingEndPoint >= grace_period) {
                waiting_for_end = false;
                return;
            }
            window.requestAnimationFrame(scrollABit);
        }
    })
    while (waiting_for_end) {
        await wait(50);
    }
    return true;
}

// ensure init always runs after page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    (async () => { try { await init(); } catch (e) { } })();
}

// and if a message to that effect is sent
browser.runtime.onMessage.addListener(async (message) => {
    if(message.action === 'start') {
        await init();
    }
});
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Adapted from FoxScroller
 *
 * @param PXperS
 * @returns {number[]}
 */
function get_pixel_speed(PXperS) {
    var deltaPixel, deltaTime;
    if (PXperS < 60) {
        deltaPixel = 1;
        deltaTime = 1000.0 / PXperS;
    } else if (PXperS % 60 === 0) {
        deltaPixel = PXperS / 60;
        deltaTime = 1000.0 / 60;
    } else {
        deltaPixel = (PXperS - PXperS % 60) / 60 + 1;
        deltaTime = 1000.0 / (PXperS / deltaPixel);
    }
    return [deltaPixel, deltaTime];
}

async function set_prop(prop, value) {
    const key = `xscroller-${prop}`;
    const obj = {}
    obj[key] = value;
    return await browser.storage.local.set(obj);
}

async function get_prop(prop, default_value=undefined) {
    const key = `xscroller-${prop}`;
    const response = await browser.storage.local.get(key);
    if(!response || Object.keys(response).length === 0) {
        return default_value;
    } else {
        return response[key];
    }
}

async function clear_log() {
    await set_prop('log', []);
}

function write_log(text) {
    browser.runtime.sendMessage({action: 'log', log: text});
}

/**
 * Check if two arrays of log messages are equal
 *
 * @param array1
 * @param array2
 * @returns boolean
 */
function logs_equal(array1, array2) {
    if(typeof array1 !== typeof array2) {
        return false;
    }
    return (array1.length === array2.length && array1.slice().every(function(value, index) {
        return value.text === array2[index].text;
    }));
}

/**
 * Get tab ID
 *
 * Content scripts cannot read tab info, but they can send a message to the
 * background script which will tell us the ID of the tab the message was
 * send from in return.
 *
 * @returns {Promise<any>}  Promise that will resolve to return the tab ID
 */
async function get_tab_id() {
    return browser.runtime.sendMessage({
        action: 'get-tab-id'
    }).then((response) => { return response.id; })
}
const {JSDOM} = require('jsdom');

function createTestDom(options = {}) {
    const dom = new JSDOM('<div id="root"></div>', options);
    const values = {window: dom.window, document: dom.window.document, Element: dom.window.Element, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true};
    const previous = new Map(Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(global, key)]));
    for (const [key, value] of Object.entries(values)) Object.defineProperty(global, key, {configurable: true, writable: true, value});
    return {dom, restoreDom() {
        dom.window.close();
        for (const [key, descriptor] of previous) {
            if (descriptor) Object.defineProperty(global, key, descriptor);
            else delete global[key];
        }
    }};
}
module.exports = {createTestDom};

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_global_key_listener_1 = require("node-global-key-listener");
const audio = require('win-audio');
const node_systray_v2_1 = require("node-systray-v2");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const shortcut_controller_1 = require("./shortcutController/shortcut.controller");
const node_notifier_1 = __importDefault(require("node-notifier"));
(async function main() {
    const iconsDir = path_1.default.resolve(__dirname, '../', 'icons');
    const appIconPath = path_1.default.resolve(iconsDir, 'icon.png');
    const activeIcon = await promises_1.default.readFile(path_1.default.resolve(iconsDir, 'active.ico'), { encoding: 'base64' });
    const mutedIcon = await promises_1.default.readFile(path_1.default.resolve(iconsDir, 'muted.ico'), { encoding: 'base64' });
    const shortcutController = new shortcut_controller_1.ShortcutController();
    await shortcutController.load();
    const mic = audio.mic;
    let shortcutListener = new node_global_key_listener_1.GlobalKeyboardListener();
    const appNameItem = {
        title: 'MuteMic',
        tooltip: 'MuteMic',
        enabled: false,
        checked: false
    };
    let currentShortcutItem = {
        title: shortcutController.shortcut.toString(),
        tooltip: 'Shortcut',
        enabled: false,
        checked: false
    };
    const changeShortcutItem = {
        title: 'Set shortcut',
        tooltip: 'Set shortcut',
        enabled: true,
        checked: false
    };
    const exitItem = {
        title: 'Close',
        tooltip: 'Close',
        enabled: true,
        checked: false
    };
    const menu = {
        icon: mic.isMuted() ? mutedIcon : activeIcon,
        title: 'MicMute',
        tooltip: 'MicMute',
        items: [
            appNameItem,
            currentShortcutItem,
            changeShortcutItem,
            exitItem
        ]
    };
    const sysTray = new node_systray_v2_1.SysTray({ menu });
    const onShortcut = function (_, down) {
        const matched = shortcutController.shortcut.keys.every(key => down[key] === true);
        if (matched) {
            mic.toggle();
            menu.icon = mic.isMuted() ? mutedIcon : activeIcon;
            //@ts-ignore
            sysTray.sendAction({
                menu,
                type: 'update-menu'
            });
        }
        return false;
    };
    sysTray.onClick(async (action) => {
        switch (action.seq_id) {
            case 2: {
                const wannaChangeShortcutResult = await new Promise((resolve, reject) => {
                    node_notifier_1.default.notify({
                        title: 'Do you want to change shortcut?',
                        message: 'After press "Yes" hold new shortcut until next notification',
                        icon: appIconPath,
                        actions: ['Yes', 'No'],
                        wait: true
                    }, (err, data) => {
                        if (err)
                            reject(err);
                        resolve(data);
                    });
                });
                if (['dismissed', 'timeout', 'no'].includes(wannaChangeShortcutResult))
                    return;
                shortcutListener.removeListener(onShortcut);
                function getShortcut(shortcutListener, finishAfterKeyDown = 1000, failDelay = 5000) {
                    return new Promise((resolve, reject) => {
                        const keys = new Set();
                        let changeTimeout = null;
                        let failTimeout = null;
                        const onShortcutChange = function (event) {
                            if (event.state === 'DOWN') {
                                if (keys.has(event.name))
                                    return false;
                                keys.add(event.name);
                                if (failTimeout)
                                    clearTimeout(failTimeout);
                            }
                            else {
                                keys.delete(event.name);
                            }
                            if (changeTimeout)
                                clearTimeout(changeTimeout);
                            if (keys.size) {
                                changeTimeout = setTimeout(() => {
                                    shortcutListener.removeListener(onShortcutChange);
                                    resolve(new shortcut_controller_1.Shortcut(Array.from(keys)));
                                }, finishAfterKeyDown);
                            }
                            else {
                                failTimeout = setTimeout(() => {
                                    shortcutListener.removeListener(onShortcutChange);
                                    reject(new Error(`Timed out ${failDelay} ms.`));
                                }, failDelay);
                            }
                            return false;
                        };
                        shortcutListener.addListener(onShortcutChange);
                    });
                }
                let _shortcut = null;
                try {
                    _shortcut = await getShortcut(shortcutListener);
                }
                catch (e) {
                    console.error(`Cannot get new shortcut: ${e.message}`);
                }
                shortcutListener.kill();
                shortcutListener = new node_global_key_listener_1.GlobalKeyboardListener();
                shortcutListener.addListener(onShortcut);
                if (!_shortcut) {
                    node_notifier_1.default.notify({
                        title: 'Changing shortcut',
                        message: `The shortcut haven't saved`,
                        icon: appIconPath,
                    });
                    return false;
                }
                const saveShortcutResult = await new Promise((resolve, reject) => {
                    node_notifier_1.default.notify({
                        title: 'Changing shortcut',
                        message: `Do you want to save shortcut: ${_shortcut.toString()}?`,
                        icon: appIconPath,
                        actions: ['Yes', 'No'],
                        wait: true
                    }, (err, data) => {
                        if (err)
                            reject(err);
                        resolve(data);
                    });
                });
                if (['dismissed', 'timeout', 'no'].includes(saveShortcutResult)) {
                    node_notifier_1.default.notify({
                        title: 'Changing shortcut',
                        message: `The shortcut haven't saved`,
                        icon: appIconPath,
                    });
                    return;
                }
                await shortcutController.save(_shortcut);
                sysTray.sendAction({
                    type: 'update-item',
                    seq_id: 1,
                    item: {
                        ...currentShortcutItem,
                        title: shortcutController.shortcut.toString()
                    }
                });
                node_notifier_1.default.notify({
                    title: 'Success!',
                    message: `Shortcut ${_shortcut.toString()} saved successfully`,
                    icon: appIconPath,
                });
                break;
            }
            case 3: {
                process.exit();
            }
        }
    });
    shortcutListener.addListener(onShortcut);
})();
//# sourceMappingURL=index.js.map
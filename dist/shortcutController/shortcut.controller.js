"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortcutController = exports.Shortcut = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class Shortcut {
    keys;
    constructor(keys) {
        this.keys = keys;
    }
    toString() {
        return this.keys.join(' + ');
    }
}
exports.Shortcut = Shortcut;
const DEFAULT_SHORTCUT = ['LEFT CTRL', 'LEFT ALT'];
const SHORTCUT_FILE_PATH = path_1.default.resolve(__dirname, '../../shortcut.json');
class ShortcutController {
    shortcut;
    async load() {
        let shortcutFile = null;
        try {
            shortcutFile = await promises_1.default.readFile(SHORTCUT_FILE_PATH, { encoding: 'utf-8' });
        }
        catch (e) {
            console.info('Shortcut file not found');
        }
        if (shortcutFile) {
            const _shortcut = JSON.parse(shortcutFile);
            if (typeof _shortcut === 'object'
                && _shortcut?.keys?.length
                && _shortcut?.keys?.every(key => typeof key === 'string')) {
                const shortcut = new Shortcut(_shortcut.keys);
                this.shortcut = shortcut;
                return;
            }
        }
        const shortcut = new Shortcut(DEFAULT_SHORTCUT);
        this.shortcut = shortcut;
        await promises_1.default.writeFile(SHORTCUT_FILE_PATH, JSON.stringify(shortcut));
    }
    async save(shortcut) {
        if (!(shortcut instanceof Shortcut)) {
            throw new Error('Ожидался инстанц Shortcut');
        }
        await promises_1.default.writeFile(SHORTCUT_FILE_PATH, JSON.stringify(shortcut));
        this.shortcut = shortcut;
    }
}
exports.ShortcutController = ShortcutController;
//# sourceMappingURL=shortcut.controller.js.map
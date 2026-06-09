import fs from 'fs/promises';
import path from 'path';

export class Shortcut {
  keys: string[];

  constructor(keys: string[]) {
    this.keys = keys;
  }

  toString() {
    return this.keys.join(' + ');
  }
}

const DEFAULT_SHORTCUT = ['LEFT CTRL', 'LEFT ALT'];
const SHORTCUT_FILE_PATH = path.resolve(__dirname, '../../shortcut.json');

export class ShortcutController {
  shortcut: Shortcut;

  async load() {
    let shortcutFile: string = null;

    try {
      shortcutFile = await fs.readFile(SHORTCUT_FILE_PATH, { encoding: 'utf-8' })
    } catch (e) {
      console.info('Shortcut file not found');
    }

    if (shortcutFile) {
      const _shortcut: Pick<Shortcut, 'keys'> = JSON.parse(shortcutFile);

      if (
        typeof _shortcut === 'object'
        && _shortcut?.keys?.length
        && _shortcut?.keys?.every(key => typeof key === 'string')
      ) {
        const shortcut = new Shortcut(_shortcut.keys);
        this.shortcut = shortcut;

        return;
      }
    }

    const shortcut = new Shortcut(DEFAULT_SHORTCUT);

    this.shortcut = shortcut;

    await fs.writeFile(SHORTCUT_FILE_PATH, JSON.stringify(shortcut));
  }

  async save(shortcut: Shortcut) {
    if (!(shortcut instanceof Shortcut)) {
      throw new Error('Ожидался инстанц Shortcut');
    }

    await fs.writeFile(SHORTCUT_FILE_PATH, JSON.stringify(shortcut));

    this.shortcut = shortcut;
  }
}
import { GlobalKeyboardListener, IGlobalKeyDownMap, IGlobalKeyListener } from 'node-global-key-listener';
const audio = require('win-audio');
import { Menu, MenuItem, SysTray } from 'node-systray-v2';
import fs from 'fs/promises';
import path from 'path';
import { ShortcutController, Shortcut } from './shortcutController/shortcut.controller';
import notifier from 'node-notifier';

(async function main() {
  const iconsDir = path.resolve(__dirname, '../', 'icons');
  const appIconPath = path.resolve(iconsDir, 'icon.png');

  const activeIcon = await fs.readFile(path.resolve(iconsDir, 'active.ico'), { encoding: 'base64' });
  const mutedIcon = await fs.readFile(path.resolve(iconsDir, 'muted.ico'), { encoding: 'base64' });

  const shortcutController = new ShortcutController();
  await shortcutController.load();
  const mic = audio.mic;
  let shortcutListener = new GlobalKeyboardListener();

  const appNameItem: MenuItem = {
    title: 'MuteMic',
    tooltip: 'MuteMic',
    enabled: false,
    checked: false
  };

  let currentShortcutItem: MenuItem = {
    title: shortcutController.shortcut.toString(),
    tooltip: 'Shortcut',
    enabled: false,
    checked: false
  };

  const changeShortcutItem: MenuItem = {
    title: 'Set shortcut',
    tooltip: 'Set shortcut',
    enabled: true,
    checked: false
  };

  const exitItem: MenuItem = {
    title: 'Close',
    tooltip: 'Close',
    enabled: true,
    checked: false
  };

  const menu: Menu = {
    icon: mic.isMuted() ? mutedIcon : activeIcon,
    title: 'MicMute',
    tooltip: 'MicMute',
    items: [
      appNameItem,
      currentShortcutItem,
      changeShortcutItem,
      exitItem
    ]
  }

  const sysTray = new SysTray({ menu });

  const onShortcut: IGlobalKeyListener = function (_, down) {
    const matched = shortcutController.shortcut.keys.every(key => down[key as keyof IGlobalKeyDownMap] === true);

    if (matched) {
      mic.toggle();

      menu.icon = mic.isMuted() ? mutedIcon : activeIcon;

      sysTray.sendAction({
        menu,
        type: 'update-menu',
        seq_id: 0
      })
    }

    return false;
  }

  sysTray.onClick(async action => {
    switch (action.seq_id) {
      case 2: {
        const wannaChangeShortcutResult = await new Promise<string>((resolve, reject) => {
          notifier.notify({
            title: 'Do you want to change shortcut?',
            message: 'After press "Yes" hold new shortcut until next notification',
            icon: appIconPath,
            actions: ['Yes', 'No'],
            wait: true
          }, (err, data) => {
            if (err) reject(err);

            resolve(data);
          })
        });

        if (['dismissed', 'timeout', 'no'].includes(wannaChangeShortcutResult)) return;

        shortcutListener.removeListener(onShortcut);

        function getShortcut(shortcutListener: GlobalKeyboardListener, finishAfterKeyDown = 1000, failDelay = 5000): Promise<Shortcut> {
          return new Promise((resolve, reject) => {
            const keys = new Set<string>();
            let changeTimeout: NodeJS.Timeout = null;
            let failTimeout: NodeJS.Timeout = null;

            const onShortcutChange: IGlobalKeyListener = function (event) {
              if (event.state === 'DOWN') {
                if (keys.has(event.name)) return false;
                keys.add(event.name);

                if (failTimeout) clearTimeout(failTimeout);
              } else {
                keys.delete(event.name);
              }

              if (changeTimeout) clearTimeout(changeTimeout);
              if (keys.size) {
                changeTimeout = setTimeout(() => {
                  shortcutListener.removeListener(onShortcutChange);
                  resolve(new Shortcut(Array.from(keys)));
                }, finishAfterKeyDown);
              } else {
                failTimeout = setTimeout(() => {
                  shortcutListener.removeListener(onShortcutChange);
                  reject(new Error(`Timed out ${failDelay} ms.`));
                }, failDelay);
              }

              return false;
            }
            shortcutListener.addListener(onShortcutChange);
          });
        }

        let _shortcut = null;

        try {
          _shortcut = await getShortcut(shortcutListener);
        } catch (e) {
          console.error(`Cannot get new shortcut: ${(e as Error).message}`);
        }

        shortcutListener.kill();
        shortcutListener = new GlobalKeyboardListener();
        shortcutListener.addListener(onShortcut);

        if (!_shortcut) {
          notifier.notify({
            title: 'Changing shortcut',
            message: `The shortcut haven't saved`,
            icon: appIconPath,
          });

          return false;
        }

        const saveShortcutResult = await new Promise<string>((resolve, reject) => {
          notifier.notify({
            title: 'Changing shortcut',
            message: `Do you want to save shortcut: ${_shortcut.toString()}?`,
            icon: appIconPath,
            actions: ['Yes', 'No'],
            wait: true
          }, (err, data) => {
            if (err) reject(err);

            resolve(data);
          })
        });

        if (['dismissed', 'timeout', 'no'].includes(saveShortcutResult)) {
          notifier.notify({
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

        notifier.notify({
          title: 'Success!',
          message: `Shortcut ${_shortcut.toString()} saved successfully`,
          icon: appIconPath,
        })

        break;
      }

      case 3: {
        process.exit();
      }
    }
  });

  shortcutListener.addListener(onShortcut);
})();
export declare class Shortcut {
    keys: string[];
    constructor(keys: string[]);
    toString(): string;
}
export declare class ShortcutController {
    shortcut: Shortcut;
    load(): Promise<void>;
    save(shortcut: Shortcut): Promise<void>;
}
//# sourceMappingURL=shortcut.controller.d.ts.map
import * as OpenCC from 'opencc-js';

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

export function cn2tw(text) {
    if (!text) return '';
    return converter(text);
}

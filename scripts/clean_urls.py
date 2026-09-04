import glob
import re

files = glob.glob('*.html')
pattern = re.compile(r'href=(["\'])((?:https?://iiec\.in/)?)([a-zA-Z0-9_\-]+)\.html((?:#[^"\'\s]*)?)\1')

def replacer(m):
    quote = m.group(1)
    prefix = m.group(2)
    name = m.group(3)
    fragment = m.group(4) or ''
    
    if name == 'index':
        if prefix:
            target = f'{prefix}{fragment}'
        else:
            target = f'/{fragment}' if fragment else '/'
        return f'href={quote}{target}{quote}'
    else:
        target = f'{prefix}{name}{fragment}'
        return f'href={quote}{target}{quote}'

total_replaced = 0
for f in files:
    with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
        content = fp.read()
    new_content, count = pattern.subn(replacer, content)
    if count > 0:
        total_replaced += count
        with open(f, 'w', encoding='utf-8') as fp:
            fp.write(new_content)
        print(f'{f}: replaced {count} links')

print(f'Done! Total links converted: {total_replaced}')

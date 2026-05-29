import os
import re
import base64

base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

def obfuscate_api_keys(filename):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find URLs matching google apps script
    pattern = re.compile(r'[\'"](https://script\.google\.com/macros/s/[a-zA-Z0-9_-]+/exec)[\'"]')
    matches = pattern.findall(content)
    
    if not matches:
        return
        
    for url in set(matches):
        b64_url = base64.b64encode(url.encode()).decode()
        # Replace the string literal with atob('...')
        content = content.replace(f"'{url}'", f"atob('{b64_url}')")
        content = content.replace(f'"{url}"', f"atob('{b64_url}')")
        
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Obfuscated API keys in {filename}")

def main():
    # Obfuscate in html and js files
    for root, _, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.html') or file.endswith('.js'):
                obfuscate_api_keys(os.path.relpath(os.path.join(root, file), base_dir))

if __name__ == "__main__":
    main()

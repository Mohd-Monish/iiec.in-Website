import os
import re

base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

def update_file(filename, modifications):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    original_content = content
    for mod in modifications:
        content = mod(content, filename)
        
    if content != original_content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filename}")
    else:
        print(f"No changes in {filename}")

def trim_meta_desc(content, filename):
    # Regex to find meta description
    pattern = re.compile(r'<meta name="description" content="(.*?)"\s*/?>', re.IGNORECASE)
    match = pattern.search(content)
    if match:
        desc = match.group(1)
        if len(desc) > 160:
            # Trim to nearest word under 157 chars + "..."
            trimmed = desc[:157]
            last_space = trimmed.rfind(' ')
            if last_space > 100:
                trimmed = trimmed[:last_space]
            trimmed += "..."
            content = content.replace(desc, trimmed)
    return content

def add_aria_current(content, filename):
    # We will look for <a href="filename" class="nav-link"> or similar
    # In some pages, the link might just be "about.html"
    base = os.path.basename(filename)
    if base == "index.html":
        link_target = 'href="index.html"'
    else:
        link_target = f'href="{base}"'
        
    # Replace in navlinks. We just find the exact match and insert aria-current.
    if link_target in content:
        # Match something like: <a href="about.html" class="nav-link">
        # and replace with: <a href="about.html" class="nav-link" aria-current="page">
        # Assuming nav links are around the <nav> block
        content = re.sub(f'(<a {link_target}[^>]*class="[^"]*nav-link[^"]*"[^>]*)>', r'\1 aria-current="page">', content)
        # also active class if present
        content = re.sub(f'(<a {link_target}[^>]*class="[^"]*active[^"]*"[^>]*)>', r'\1 aria-current="page">', content)
    return content

def add_json_ld(content, filename):
    if filename == "certificates.html" and "application/ld+json" not in content:
        json_ld = """\t<script type="application/ld+json">
\t{
\t\t"@context": "https://schema.org",
\t\t"@type": "WebPage",
\t\t"name": "Certificates | IIEC",
\t\t"description": "View and verify certificates issued by IIEC."
\t}
\t</script>
</head>"""
        content = content.replace("</head>", json_ld)
    elif filename == "verify.html" and "application/ld+json" not in content:
        json_ld = """\t<script type="application/ld+json">
\t{
\t\t"@context": "https://schema.org",
\t\t"@type": "FAQPage",
\t\t"mainEntity": [{
\t\t\t"@type": "Question",
\t\t\t"name": "How do I verify a certificate?",
\t\t\t"acceptedAnswer": {
\t\t\t\t"@type": "Answer",
\t\t\t\t"text": "Enter your Certificate ID to verify its authenticity."
\t\t\t}
\t\t}]
\t}
\t</script>
</head>"""
        content = content.replace("</head>", json_ld)
    return content

html_files = [f for f in os.listdir(base_dir) if f.endswith('.html')]

for f in html_files:
    mods = [trim_meta_desc, add_aria_current, add_json_ld]
    update_file(f, mods)

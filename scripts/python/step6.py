import urllib.request
import json
import os
import re

url = 'https://script.google.com/macros/s/AKfycbw0KJk8ObDw-Xpz9TJlPXLCXOEovWx0I3bSUlcTmBLWb_KLoL4AvtAkG5oEnvxMFNvryA/exec'
base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

def fetch_posts():
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data.get('success'):
                return data.get('posts', [])
    except Exception as e:
        print(f"Failed to fetch posts: {e}")
    return []

def escape_html(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def generate_ssg():
    posts = fetch_posts()
    if not posts:
        print("No posts found.")
        return
        
    print(f"Fetched {len(posts)} posts for SSG.")

    # 1. Update blog.html with noscript fallback
    blog_path = os.path.join(base_dir, 'blog.html')
    with open(blog_path, 'r', encoding='utf-8') as f:
        blog_content = f.read()

    noscript_html = '<noscript><div class="blog-grid-static" style="display:grid; gap:20px;">\n'
    for i, post in enumerate(posts):
        title = escape_html(post.get('title', ''))
        excerpt = escape_html(post.get('excerpt', ''))
        noscript_html += f'''
        <article class="blog-card" style="opacity:1; transform:none;">
          <div class="blog-card-content">
            <h2 class="blog-card-title">{title}</h2>
            <p class="blog-card-excerpt">{excerpt}</p>
            <a href="blog-post-{i}.html" class="blog-card-link">Read More</a>
          </div>
        </article>
        '''
    noscript_html += '</div></noscript>\n'
    
    if '<noscript><div class="blog-grid-static"' not in blog_content:
        blog_content = blog_content.replace('<div class="blog-loading"', noscript_html + '<div class="blog-loading"')
        with open(blog_path, 'w', encoding='utf-8') as f:
            f.write(blog_content)
        print("Injected noscript fallback into blog.html")

    # 2. Generate static blog-post-X.html files
    template_path = os.path.join(base_dir, 'blog-post.html')
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()
        
    for i, post in enumerate(posts):
        title = escape_html(post.get('title', ''))
        excerpt = escape_html(post.get('excerpt', ''))
        image = escape_html(post.get('imageUrl', 'https://iiec.in/assets/og-image.webp'))
        
        post_html = template
        
        # Replace Meta Tags
        post_html = re.sub(r'<title>.*?</title>', f'<title>{title} | IIEC</title>', post_html)
        post_html = re.sub(r'<meta property="og:title" content=".*?">', f'<meta property="og:title" content="{title}">', post_html)
        post_html = re.sub(r'<meta property="og:description" content=".*?">', f'<meta property="og:description" content="{excerpt}">', post_html)
        post_html = re.sub(r'<meta property="og:image" content=".*?">', f'<meta property="og:image" content="{image}">', post_html)
        post_html = re.sub(r'<meta name="twitter:title" content=".*?">', f'<meta name="twitter:title" content="{title}">', post_html)
        post_html = re.sub(r'<meta name="twitter:description" content=".*?">', f'<meta name="twitter:description" content="{excerpt}">', post_html)
        post_html = re.sub(r'<meta name="twitter:image" content=".*?">', f'<meta name="twitter:image" content="{image}">', post_html)
        
        # For canonical url
        post_html = re.sub(r'<link rel="canonical" href=".*?">', f'<link rel="canonical" href="https://iiec.in/blog-post-{i}.html">', post_html)
        
        # Write the file
        post_path = os.path.join(base_dir, f'blog-post-{i}.html')
        with open(post_path, 'w', encoding='utf-8') as f:
            f.write(post_html)
            
    print(f"Generated {len(posts)} static blog post files.")

if __name__ == "__main__":
    generate_ssg()

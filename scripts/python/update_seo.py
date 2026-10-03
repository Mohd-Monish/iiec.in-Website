import os
import re

base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

def update_sitemap():
    path = os.path.join(base_dir, "sitemap.xml")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Add missing URLs if not present
    new_urls = [
        {"loc": "https://iiec.in/certificates.html", "priority": "0.8"},
        {"loc": "https://iiec.in/verify.html", "priority": "0.7"},
        {"loc": "https://iiec.in/ipl-auction.html", "priority": "0.8"},
        {"loc": "https://iiec.in/blog-post-0.html", "priority": "0.7"},
        {"loc": "https://iiec.in/blog-post-1.html", "priority": "0.7"},
        {"loc": "https://iiec.in/blog-post-2.html", "priority": "0.7"},
        {"loc": "https://iiec.in/blog-post-3.html", "priority": "0.7"},
    ]

    additions = ""
    for url in new_urls:
        if url["loc"] not in content:
            additions += f"""  <url>
    <loc>{url['loc']}</loc>
    <lastmod>2026-05-30</lastmod>
    <changefreq>monthly</changefreq>
    <priority>{url['priority']}</priority>
  </url>\n"""

    if additions:
        content = content.replace("</urlset>", additions + "</urlset>")
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Updated sitemap.xml")

def update_robots():
    path = os.path.join(base_dir, "robots.txt")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
        
    if "/certificate-dashboard.html" not in content:
        content = content.replace("Disallow: /analytics.html", 
                                  "Disallow: /analytics.html\nDisallow: /certificate-dashboard.html\nDisallow: /blog-post.html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Updated robots.txt")

def update_llms():
    for filename in ["llms.txt", "llms-full.txt"]:
        path = os.path.join(base_dir, filename)
        if not os.path.exists(path):
            continue
            
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Update Copyright
        content = content.replace("Copyright Year**: 2025", "Copyright Year**: 2026")
        
        # Add new pages description if not present
        if "IPL Auction" not in content and "- [Blog Post]" in content:
            # We can insert after Genesis or Techastra
            additions = """
- [IPL Auction](https://iiec.in/ipl-auction.html): Landing page for the IPL Auction 2026 event. Experience entrepreneurship through sports management. Strategize, bid, and build your dream team. Registrations Closed. Features rules, format, teams, and venue details.
- [Certificates](https://iiec.in/certificates.html): Page to view all verified certificates issued by IIEC for various events, workshops, and achievements.
- [Verify](https://iiec.in/verify.html): Search portal for students to enter their unique Certificate ID and verify its authenticity in the IIEC database.
- [Static Blog Posts](https://iiec.in/blog-post-X.html): Statically generated (SSG) individual blog posts for better SEO crawlability, overriding the old dynamic JS approach.
"""
            content = content.replace("- [Blog Post](https://iiec.in/blog-post.html): Template page for individual blog articles with dynamic content loading. JSON-LD: BlogPosting with publisher Organization/IIEC.",
                                      "- [Blog Post](https://iiec.in/blog-post.html): Template page (now superseded by static files `blog-post-0.html`, etc.) for individual blog articles." + additions)
                                      
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filename}")

def main():
    update_sitemap()
    update_robots()
    update_llms()

if __name__ == "__main__":
    main()

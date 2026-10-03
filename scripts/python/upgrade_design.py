import os

base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

def upgrade_style():
    path = os.path.join(base_dir, "css", "style.css")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Premium Color System Replacement
    # Deep, sleek dark theme
    content = content.replace("--color-base: #05070f;", "--color-base: #09090b;") # zinc-950
    content = content.replace("--color-base-rgb: 5, 7, 15;", "--color-base-rgb: 9, 9, 11;")
    content = content.replace("--color-surface: #0a0d18;", "--color-surface: #18181b;") # zinc-900
    content = content.replace("--color-surface-elevated: #0e1222;", "--color-surface-elevated: #27272a;") # zinc-800
    content = content.replace("--color-surface-hover: #141a2e;", "--color-surface-hover: #3f3f46;") # zinc-700

    content = content.replace("--gradient-start: #172042;", "--gradient-start: #18181b;")
    content = content.replace("--gradient-mid: #09090b;", "--gradient-mid: #09090b;")
    content = content.replace("--gradient-end: #000000;", "--gradient-end: #000000;")

    # Refined Glass Effect
    content = content.replace("--glass-bg: rgba(18, 23, 38, 0.72);", "--glass-bg: rgba(24, 24, 27, 0.6);")
    content = content.replace("--glass-border: rgba(255, 255, 255, 0.08);", "--glass-border: rgba(255, 255, 255, 0.1);")

    # Accent (Premium Gold)
    content = content.replace("--color-accent: #ffb703;", "--color-accent: #F5A524;")
    content = content.replace("--color-accent-rgb: 255, 183, 3;", "--color-accent-rgb: 245, 165, 36;")
    content = content.replace("--color-accent-hover: #ffd166;", "--color-accent-hover: #F7B750;")

    # Append premium overrides at the bottom
    premium_css = """

/* ================================================================
   PREMIUM DESIGN OVERRIDES
   ================================================================ */

/* Headings Typography */
h1, h2, h3, h4, h5, h6, .page-title, .section-title {
  letter-spacing: -0.03em;
  font-weight: 700;
}

/* Premium Buttons */
.btn {
  border-radius: 9999px; /* Pill shape */
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  backdrop-filter: blur(8px);
  will-change: transform, box-shadow;
  box-shadow: 0 4px 14px 0 rgba(0,0,0,0.2);
}

.btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 20px rgba(245, 165, 36, 0.3);
}

.btn:active {
  transform: translateY(1px) scale(0.98);
}

/* Glass Cards Enhancement */
.glass-card, .blog-card, .team-card {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(39, 39, 42, 0.4) 0%, rgba(24, 24, 27, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease;
  will-change: transform;
}

.glass-card:hover, .blog-card:hover, .team-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px -15px rgba(245, 165, 36, 0.15);
  border-color: rgba(245, 165, 36, 0.3);
}

/* Images & Media */
img {
  border-radius: 12px;
}

.blog-card-image img, .team-card img {
  border-radius: 20px 20px 0 0;
  transition: transform 0.5s ease;
}

.blog-card:hover .blog-card-image img {
  transform: scale(1.05);
}

/* Gradients text */
.highlight {
  background: linear-gradient(to right, #F5A524, #F7B750);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0px 2px 10px rgba(245, 165, 36, 0.2);
}
"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(content + premium_css)
    print("Design updated successfully!")

if __name__ == "__main__":
    upgrade_style()

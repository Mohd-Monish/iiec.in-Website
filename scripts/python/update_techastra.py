import os

base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

old_text = """### 2. TechAstra
- **Title:** The Largest Annual Technical Fest of Chhatrapati Shivaji Maharaj University
- **Organized By:** IIEC - Incubation, Innovation & Entrepreneurship Cell
- **Scale:** 10+ Events, 1000+ Expected Footfall, 2 Epic Days
- **Key Attractions:** Hackathons, coding battles, robotics competitions, AI/ML workshops, gaming tournaments, cybersecurity events, IoT projects, and an innovation showcase.
- **Volunteering:** Roles include Event Management, Technical Support, Design & Creatives, Logistics & Venue, Sponsorship & Outreach, Photography & Videography, and Social Media & Content.
- **URL:** https://iiec.in/techastra.html"""

new_text = """### 2. TechAstra 2026: The Multiverse of Innovation
- **Title:** The Largest Annual Technical Fest of Chhatrapati Shivaji Maharaj University
- **Organized By:** IIEC - Incubation, Innovation & Entrepreneurship Cell
- **Dates:** March 17-18, 2026
- **Scale & Prizes:** 15 Events, 1000+ Expected Footfall, ₹50K+ Total Prize Pool
- **URL:** https://iiec.in/techastra.html

**Flagship Events & Competitions included in TechAstra:**
- **CEOs Talk:** Featuring IIT Bombay alumni founders Anup Raj and Aman Goel (March 18, 2026).
- **Guardians of Governance (Tech MUN):** The official Model United Nations conference debating AI regulation, cybersecurity, and digital privacy across 6 committees.
- **Webathon:** A 3-4 hour intensive web development hackathon where teams build web apps live.
- **Stark Expo / Project Exhibition:** A live showcase of innovative tech projects presented to expert judges.
- **N8N Automation Workshop:** A 2-Day intensive workshop on no-code automation and building workflows in collaboration with NCP.
- **Infinity Stones Hunt:** A thrilling campus-wide treasure hunt featuring complex puzzles and clues.
- **E-Sports & Gaming Tournaments:** Highly competitive brackets for Valorant (5v5), BGMI (Squad), and FreeFire (Squad).
- **Other Competitions:** Chess Tournament (1v1 strategic matchups) and Reel Craft Competition (short-form video creation).
- **Volunteering:** Roles included Event Management, Technical Support, Design & Creatives, Logistics, Sponsorship, Photography, and Social Media."""

def update_techastra_details():
    for filename in ["llms.txt", "llms-full.txt"]:
        path = os.path.join(base_dir, filename)
        if not os.path.exists(path):
            continue
            
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            
        if old_text in content:
            content = content.replace(old_text, new_text)
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Updated TechAstra details in {filename}")
        else:
            print(f"old_text not found in {filename}")

if __name__ == "__main__":
    update_techastra_details()

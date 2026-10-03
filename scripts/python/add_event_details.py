import os

base_dir = r"D:\E-Cell Website\IIEC.in\iiec.in Website"

events_content = """
---

## Upcoming & Flagship Events in Detail

### 1. IPL Auction 2026
- **Date:** 22 April 2026
- **Venue:** Seminar Hall, Pratapgad Block, CSMU Campus
- **Theme:** "Bid like a captain"
- **Dress Code:** Team colors + sporty
- **Format:** 5 Rounds held throughout the year, culminating in 1 Grand Finale. Winners and Runners-up from each round advance to the finale.
- **Scale:** 10 IPL franchise teams competing for 1 Grand winning squad
- **Description:** A live auction arena where participants' decisions shape a dream squad. It tests strategy, budget management, and bidding tactics under pressure. Participants scout for players, bid within budgets, and build a winning team.
- **Status:** Registrations Closed (as per the latest update).
- **URL:** https://iiec.in/ipl-auction.html

### 2. TechAstra
- **Title:** The Largest Annual Technical Fest of Chhatrapati Shivaji Maharaj University
- **Organized By:** IIEC - Incubation, Innovation & Entrepreneurship Cell
- **Scale:** 10+ Events, 1000+ Expected Footfall, 2 Epic Days
- **Key Attractions:** Hackathons, coding battles, robotics competitions, AI/ML workshops, gaming tournaments, cybersecurity events, IoT projects, and an innovation showcase.
- **Volunteering:** Roles include Event Management, Technical Support, Design & Creatives, Logistics & Venue, Sponsorship & Outreach, Photography & Videography, and Social Media & Content.
- **URL:** https://iiec.in/techastra.html
"""

def update_llms():
    for filename in ["llms.txt", "llms-full.txt"]:
        path = os.path.join(base_dir, filename)
        if not os.path.exists(path):
            continue
            
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            
        if "## Upcoming & Flagship Events in Detail" not in content:
            content += "\n" + events_content
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Added detailed events to {filename}")
        else:
            print(f"Events already exist in {filename}")

if __name__ == "__main__":
    update_llms()

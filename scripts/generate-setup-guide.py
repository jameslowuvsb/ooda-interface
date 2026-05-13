#!/usr/bin/env python3
"""Generate OODA API Setup Guide PDF for desktop."""

from fpdf import FPDF
import os

class SetupGuide(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, "OODA Interface  - API Setup Guide", align="R")
        self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(0, 80, 0)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(0, 150, 0)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def sub_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(50, 50, 50)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bold_text(self, label, value):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(30, 30, 30)
        self.cell(self.get_string_width(label) + 2, 6, label)
        self.set_font("Helvetica", "", 10)
        self.cell(0, 6, value, new_x="LMARGIN", new_y="NEXT")

    def step(self, number, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        # Checkbox
        x = self.get_x()
        y = self.get_y()
        self.rect(x, y + 1, 3.5, 3.5)
        self.set_x(x + 6)
        self.set_font("Helvetica", "B", 10)
        self.cell(8, 5.5, f"{number}.")
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def code_block(self, text):
        self.set_fill_color(240, 240, 240)
        self.set_font("Courier", "", 9)
        self.set_text_color(0, 80, 0)
        x = self.get_x()
        self.cell(0, 7, f"  {text}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(30, 30, 30)
        self.ln(3)

    def url_text(self, url):
        self.set_font("Helvetica", "U", 10)
        self.set_text_color(0, 0, 200)
        self.cell(0, 6, url, new_x="LMARGIN", new_y="NEXT", link=url)
        self.set_text_color(30, 30, 30)
        self.set_font("Helvetica", "", 10)
        self.ln(2)

    def priority_badge(self, text, is_critical=True):
        if is_critical:
            self.set_fill_color(220, 50, 50)
            self.set_text_color(255, 255, 255)
        else:
            self.set_fill_color(80, 150, 80)
            self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 8)
        w = self.get_string_width(text) + 6
        self.cell(w, 5, f" {text} ", fill=True)
        self.set_text_color(30, 30, 30)
        self.set_font("Helvetica", "", 10)
        self.ln(6)


def generate():
    pdf = SetupGuide()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ── Page 1: Title & Overview ──
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(0, 60, 0)
    pdf.ln(20)
    pdf.cell(0, 15, "OODA Interface", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 10, "API Setup Guide", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, "Date: May 12, 2026", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Email: james.low@universumventure.com", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, "Project: /Users/jameslow/Claude/OODA", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(15)
    pdf.section_title("Overview")
    pdf.body_text(
        "You need 4 API keys to fully power the OODA intelligence interface. "
        "Two are CRITICAL (the globe won't work properly without them), "
        "two are OPTIONAL but recommended for additional data layers. "
        "All have free tiers  - no credit card required."
    )

    pdf.sub_title("Summary")
    pdf.set_font("Helvetica", "", 10)
    data = [
        ["#", "Service", "Priority", "Purpose", "Free Tier"],
        ["1", "Cesium Ion", "CRITICAL", "3D globe + terrain + buildings", "75K tiles/mo"],
        ["2", "AISstream", "CRITICAL", "Live AIS vessel tracking", "Limited"],
        ["3", "NASA API", "Optional", "Asteroids + natural disasters", "1000 req/hr"],
        ["4", "OpenWeatherMap", "Optional", "Weather radar overlay", "1000 calls/day"],
    ]
    col_widths = [8, 35, 22, 60, 35]
    for i, row in enumerate(data):
        if i == 0:
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_fill_color(0, 80, 0)
            pdf.set_text_color(255, 255, 255)
        else:
            pdf.set_font("Helvetica", "", 9)
            pdf.set_fill_color(245, 245, 245) if i % 2 == 0 else pdf.set_fill_color(255, 255, 255)
            pdf.set_text_color(30, 30, 30)
        for j, cell in enumerate(row):
            pdf.cell(col_widths[j], 7, cell, border=0, fill=True)
        pdf.ln()
    pdf.set_text_color(30, 30, 30)

    pdf.ln(8)
    pdf.sub_title("Already Working (No Key Needed)")
    pdf.body_text(
        "These data sources are live and require no API key:\n"
        "  - airplanes.live  - ADS-B flight tracking\n"
        "  - CelesTrak  - Satellite orbital positions\n"
        "  - USGS  - Earthquake / seismic data"
    )

    pdf.ln(5)
    pdf.sub_title("Where Keys Go")
    pdf.body_text("Once you have your keys, paste them into this file:")
    pdf.code_block("/Users/jameslow/Claude/OODA/.env.local")
    pdf.body_text("Or just tell Claude: 'Here are my API keys' and paste them in chat.")

    # ── Page 2: Cesium Ion ──
    pdf.add_page()
    pdf.section_title("1. Cesium Ion Token")
    pdf.priority_badge("CRITICAL", is_critical=True)
    pdf.ln(2)
    pdf.bold_text("What it does: ", "Powers the 3D globe with terrain, satellite imagery, and 3D city buildings")
    pdf.bold_text("Free tier: ", "75,000 tile requests/month (no credit card)")
    pdf.bold_text("Sign-up URL: ", "")
    pdf.url_text("https://ion.cesium.com/signup")

    pdf.sub_title("Steps")
    pdf.step(1, "Go to https://ion.cesium.com/signup")
    pdf.step(2, "Sign up with email: james.low@universumventure.com")
    pdf.step(3, "Check your email and click the confirmation link if required")
    pdf.step(4, "Once logged in, click 'Access Tokens' in the left sidebar")
    pdf.step(5, "You'll see a 'default' token  - copy the entire string (starts with eyJhbGciOi...)")
    pdf.step(6, "Save this token  - it goes into NEXT_PUBLIC_CESIUM_ION_TOKEN")

    pdf.ln(3)
    pdf.sub_title(".env.local Entry")
    pdf.code_block("NEXT_PUBLIC_CESIUM_ION_TOKEN=paste_your_token_here")

    # ── Page 3: AISstream ──
    pdf.add_page()
    pdf.section_title("2. AISstream API Key")
    pdf.priority_badge("CRITICAL", is_critical=True)
    pdf.ln(2)
    pdf.bold_text("What it does: ", "Real-time AIS vessel tracking  - live ship positions, headings, speeds, flags")
    pdf.bold_text("Free tier: ", "Limited requests (sufficient for development)")
    pdf.bold_text("Sign-up URL: ", "")
    pdf.url_text("https://aisstream.io")

    pdf.sub_title("Steps")
    pdf.step(1, "Go to https://aisstream.io")
    pdf.step(2, "Click 'Sign Up' or 'Register'")
    pdf.step(3, "Sign up with email: james.low@universumventure.com")
    pdf.step(4, "Check your email and click the confirmation link if required")
    pdf.step(5, "Navigate to your dashboard or API Keys section")
    pdf.step(6, "Copy your API key")
    pdf.step(7, "Save this key  - it goes into AISSTREAM_API_KEY")

    pdf.ln(3)
    pdf.sub_title(".env.local Entry")
    pdf.code_block("AISSTREAM_API_KEY=paste_your_key_here")

    pdf.ln(5)
    pdf.sub_title("What This Unlocks")
    pdf.body_text(
        "With the AISstream key, the OODA interface replaces simulated vessel data with "
        "real live AIS transponder data from actual ships transiting the Strait of Hormuz. "
        "This enables real dark ship detection (vessels disabling transponders), "
        "real STS (ship-to-ship) transfer monitoring, and real traffic flow analysis."
    )

    # ── Page 4: NASA ──
    pdf.add_page()
    pdf.section_title("3. NASA API Key")
    pdf.priority_badge("OPTIONAL", is_critical=False)
    pdf.ln(2)
    pdf.bold_text("What it does: ", "Near-Earth asteroid tracking + NASA EONET natural disaster events")
    pdf.bold_text("Free tier: ", "1,000 requests/hour (falls back to DEMO_KEY without it)")
    pdf.bold_text("Sign-up URL: ", "")
    pdf.url_text("https://api.nasa.gov")

    pdf.sub_title("Steps")
    pdf.step(1, "Go to https://api.nasa.gov")
    pdf.step(2, "Scroll down to the 'Generate API Key' section")
    pdf.step(3, "Fill in: First Name = James, Last Name = Low")
    pdf.step(4, "Email: james.low@universumventure.com")
    pdf.step(5, "Click 'Signup'  - your API key is shown IMMEDIATELY on the page")
    pdf.step(6, "It will also be emailed to you as backup")
    pdf.step(7, "Save this key  - it goes into NASA_API_KEY")

    pdf.ln(3)
    pdf.sub_title(".env.local Entry")
    pdf.code_block("NASA_API_KEY=paste_your_key_here")

    # ── Page 5: OpenWeatherMap ──
    pdf.ln(10)
    pdf.section_title("4. OpenWeatherMap API Key")
    pdf.priority_badge("OPTIONAL", is_critical=False)
    pdf.ln(2)
    pdf.bold_text("What it does: ", "Global weather radar overlay on the 3D globe")
    pdf.bold_text("Free tier: ", "1,000 API calls/day (no credit card)")
    pdf.bold_text("Sign-up URL: ", "")
    pdf.url_text("https://home.openweathermap.org/users/sign_up")

    pdf.sub_title("Steps")
    pdf.step(1, "Go to https://home.openweathermap.org/users/sign_up")
    pdf.step(2, "Sign up with email: james.low@universumventure.com")
    pdf.step(3, "Check your email and click the confirmation link")
    pdf.step(4, "Once logged in, go to the 'API Keys' tab in your account")
    pdf.step(5, "Copy your default API key")
    pdf.step(6, "Save this key  - it goes into WEATHER_API_KEY")
    pdf.step(7, "NOTE: New keys can take up to 2 hours to activate!")

    pdf.ln(3)
    pdf.sub_title(".env.local Entry")
    pdf.code_block("WEATHER_API_KEY=paste_your_key_here")

    # ── Page 6: Complete Config + Quick Start ──
    pdf.add_page()
    pdf.section_title("Complete .env.local File")
    pdf.body_text("Create this file at: /Users/jameslow/Claude/OODA/.env.local")
    pdf.body_text("Paste all your keys into it:")
    pdf.ln(2)

    pdf.set_fill_color(240, 240, 240)
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(0, 80, 0)
    lines = [
        "# Cesium Ion (CRITICAL - 3D globe)",
        "NEXT_PUBLIC_CESIUM_ION_TOKEN=paste_your_cesium_token",
        "",
        "# AISstream (CRITICAL - live vessel tracking)",
        "AISSTREAM_API_KEY=paste_your_aisstream_key",
        "",
        "# NASA (Optional - asteroids + disasters)",
        "NASA_API_KEY=paste_your_nasa_key",
        "",
        "# OpenWeatherMap (Optional - weather radar)",
        "WEATHER_API_KEY=paste_your_openweather_key",
    ]
    for line in lines:
        pdf.cell(0, 6, f"  {line}", fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(30, 30, 30)

    pdf.ln(10)
    pdf.section_title("Quick Start")
    pdf.body_text("After configuring .env.local, run these commands:")
    pdf.ln(2)
    pdf.code_block("cd /Users/jameslow/Claude/OODA")
    pdf.code_block("npm run dev")
    pdf.body_text("Then open http://localhost:3457 in your browser.")
    pdf.ln(3)
    pdf.body_text(
        "Click 'START LOOP' in the right panel to activate the full OODA cycle: "
        "OBSERVE (ingest live data) -> ORIENT (detect anomalies) -> "
        "DECIDE (assess threats + recommend actions) -> ACT (generate briefs + adjust monitoring)."
    )

    pdf.ln(8)
    pdf.section_title("Need Help?")
    pdf.body_text(
        "Open Claude Code in the OODA project directory and say:\n"
        "  'Here are my API keys: [paste them]'\n"
        "Claude will configure everything and restart the dev server."
    )

    # Save
    output_path = os.path.expanduser("~/Desktop/OODA-API-Setup-Guide.pdf")
    pdf.output(output_path)
    print(f"PDF saved to: {output_path}")


if __name__ == "__main__":
    generate()

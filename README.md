# BigQuery Release Insights Board

A premium, modern web dashboard built with **Python Flask** and **Vanilla HTML/JS/CSS** that fetches, parses, filters, and shares BigQuery Release Notes directly from the official Google Cloud Atom feed.

---

## ✨ Features

- **Automated RSS Ingestion**: Dynamically fetches release entries from the Google Cloud BigQuery RSS/Atom Feed.
- **Micro-Segmentation of Logs**: Dynamically parses combined daily logs into individual updates grouped under specific categories (`Feature`, `Issue / Fix`, `Announcement`, `Breaking Change`, `Change`, and `Other`).
- **Keyword Search & Filters**: Instant, client-side keyword filtering of dates and description content. Filter updates by category with a single dropdown.
- **X/Twitter Composer Integration**: Click any release card to automatically draft a tweet with customized emojis, source links, and relevant tags (`#BigQuery #GoogleCloud #GCP`).
- **Circular Character Count Ring**: A visual SVG circular indicator that dynamically reflects character usage and changes color as you approach the 280-character limit.
- **Dark Mode Glassmorphic UI**: Beautiful responsive design matching modern aesthetics, built with standard CSS variables.

---

## 📁 Repository Structure

```text
bq_release_viewer/
├── app.py                # Flask Backend, XML parser & JSON proxy API
├── requirements.txt      # Python dependencies (Flask, requests)
├── .gitignore            # Git exclusions
├── README.md             # Project documentation (this file)
├── templates/
│   └── index.html        # Main HTML5 layout
└── static/
    ├── css/
    │   └── style.css     # CSS variable colors, variables, animations & layouts
    └── js/
        └── app.js        # Timeline segmentation logic & composer mechanics
```

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.8 or higher.
- `pip` (Python Package Installer).

### 1. Clone the Repository
```bash
git clone https://github.com/anastasiatsak-hub/antigravity-event-talks-app.git
cd antigravity-event-talks-app
```

### 2. Configure Virtual Environment
Create and activate a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
Because macOS typically reserves port `5000` (for AirPlay Receiver), launch the app on port `5001`:
```bash
PORT=5001 python app.py
```

### 5. Access the Board
Open your browser and navigate to:
👉 **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## 🛠️ Built With

- **Backend**: [Python Flask](https://flask.palletsprojects.com/)
- **XML Parsing**: Python standard `xml.etree.ElementTree`
- **Frontend Logic**: Vanilla JavaScript ES6
- **Styling**: Vanilla CSS3 Grid & Flexbox
- **Icons**: [FontAwesome 6 (free CDN)](https://fontawesome.com/)
- **Typography**: Google Fonts ([Outfit](https://fonts.google.com/specimen/Outfit) & [Inter](https://fonts.google.com/specimen/Inter))

# BigQuery Release Notes Hub

A modern, high-fidelity single-page web application (SPA) built using **Python Flask** and vanilla **HTML, CSS, and JavaScript** that aggregates, filters, and shares official BigQuery release updates.

---

## 🚀 Features

- **Automated RSS Ingestion**: Dynamically fetches and parses the official BigQuery release notes XML feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`).
- **Granular Partitioning**: Parses and separates date-grouped updates into individual, easy-to-read update cards categorized by type (Feature, Announcement, Issue, Deprecation).
- **Responsive Dark Theme**: Styled with a premium dark dashboard UI incorporating HSL colors, glassmorphic layout components, and custom hover transitions.
- **Search & Filters**: Quickly filter updates by category or query them using a text-based instant search bar.
- **Smart Tweet Composer**: Click on any card to automatically draft a tweet conforming to Twitter's 280-character limit. The composer automatically adds relevant hashtags, source links, and truncates descriptions to fit the limit perfectly.
- **Live Sync & Cache**: Incorporates in-memory caching to optimize network loads, and includes a manual "Refresh" button with a spinning status indicator.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11+, Flask 3.1.3, Requests
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom design system), Vanilla JavaScript (ES6)
- **Icons**: FontAwesome 6

---

## 📂 Project Directory Structure

```
bigquery_release_notes/
├── app.py                 # Flask server & XML parsing endpoint
├── templates/
│   └── index.html         # Main dashboard page structure
├── static/
│   ├── style.css          # Design system & dark theme styles
│   └── app.js             # State controller & Tweet composer logic
├── .gitignore             # Git ignore patterns
└── README.md              # Documentation
```

---

## 💻 Quick Start & Running Locally

### 1. Prerequisites
Make sure you have Python 3.11+ installed.

### 2. Install Dependencies
Install the required packages using pip:
```bash
pip install flask requests
```

### 3. Run the Server
Run the Flask application:
```bash
python app.py
```

The application will launch on your local host:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## ⚙️ How the Request-Response Flow Works

1. The client sends a `GET` request to `/api/releases` (optionally appending `?refresh=true` to force-sync).
2. The Flask backend queries the Google Cloud BigQuery RSS feed, converts the Atom XML document into a structured Python dictionary, and partitions grouped releases by parsing standard HTML `<h3>` tags.
3. The backend stores the structured data in an in-memory cache and returns a JSON payload to the client.
4. The JavaScript client (`app.js`) consumes the JSON data, flattens the releases, filters them based on active tags/search terms, and renders them dynamically.

import os
import re
import time
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for parsed releases
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECS = 600  # 10 minutes

def clean_html_to_text(html_content):
    """Convert HTML snippet to a clean plain text representation for tweeting."""
    # Replace links with their text and URL in parentheses if helpful,
    # or just clean tags for simpler tweets. Let's do simple tag stripping.
    text = re.sub(r'<[^>]+>', ' ', html_content)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def fetch_and_parse_feed():
    """Fetch BigQuery Release notes XML and parse it into structured JSON."""
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        xml_content = response.text
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return {"error": f"Failed to fetch feed: {str(e)}"}, 500

    try:
        # Register namespaces to easily parse Atom feed
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        root = ET.fromstring(xml_content)

        entries = []
        for entry in root.findall('atom:entry', namespaces):
            title = entry.find('atom:title', namespaces)
            title_text = title.text if title is not None else "Unknown Date"
            
            entry_id = entry.find('atom:id', namespaces)
            id_text = entry_id.text if entry_id is not None else ""
            
            updated = entry.find('atom:updated', namespaces)
            updated_text = updated.text if updated is not None else ""
            
            link = entry.find("atom:link[@rel='alternate']", namespaces)
            if link is None:
                link = entry.find("atom:link", namespaces)
            link_href = link.attrib.get('href', '') if link is not None else ""

            content = entry.find('atom:content', namespaces)
            html_content = content.text if content is not None else ""

            # Parse HTML content into sub-items split by <h3> (individual updates)
            sub_items = []
            parts = re.split(r'<h3>(.*?)</h3>', html_content)
            
            if len(parts) > 1:
                # We have <h3> headers
                for i in range(1, len(parts), 2):
                    header = parts[i].strip()
                    body_html = parts[i+1].strip()
                    plain_text = clean_html_to_text(body_html)
                    sub_items.append({
                        "type": header,
                        "html": body_html,
                        "text": plain_text
                    })
            else:
                # Fallback to treat the whole block as single update
                plain_text = clean_html_to_text(html_content)
                sub_items.append({
                    "type": "Update",
                    "html": html_content.strip(),
                    "text": plain_text
                })

            entries.append({
                "date": title_text,
                "id": id_text,
                "updated": updated_text,
                "link": link_href,
                "updates": sub_items
            })

        return {"entries": entries, "fetched_at": time.time()}
    except Exception as e:
        print(f"Error parsing feed: {e}")
        return {"error": f"Failed to parse XML: {str(e)}"}, 500

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not cache["data"] or (now - cache["last_fetched"] > CACHE_DURATION_SECS):
        print("Fetching fresh release notes feed...")
        result = fetch_and_parse_feed()
        if isinstance(result, tuple):
            return jsonify(result[0]), result[1]
        cache["data"] = result
        cache["last_fetched"] = now
    
    return jsonify(cache["data"])

if __name__ == '__main__':
    # Run server locally on port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)

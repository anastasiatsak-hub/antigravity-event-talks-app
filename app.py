import os
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_release_notes():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    response = requests.get(FEED_URL, headers=headers, timeout=15)
    response.raise_for_status()
    
    # Atom namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    root = ET.fromstring(response.content)
    
    # Extract feed-level metadata
    feed_title = root.find('atom:title', ns)
    feed_title_text = feed_title.text if feed_title is not None else "BigQuery Release Notes"
    
    feed_updated = root.find('atom:updated', ns)
    feed_updated_text = feed_updated.text if feed_updated is not None else ""
    
    entries = []
    for entry_el in root.findall('atom:entry', ns):
        title = entry_el.find('atom:title', ns)
        title_text = title.text if title is not None else "Unknown Date"
        
        entry_id = entry_el.find('atom:id', ns)
        entry_id_text = entry_id.text if entry_id is not None else ""
        
        updated = entry_el.find('atom:updated', ns)
        updated_text = updated.text if updated is not None else ""
        
        # Link extraction
        link_el = entry_el.find("atom:link[@rel='alternate']", ns)
        if link_el is None:
            link_el = entry_el.find("atom:link", ns)
        link_url = link_el.attrib.get('href', '') if link_el is not None else ''
        
        content = entry_el.find('atom:content', ns)
        content_html = content.text if content is not None else ""
        
        entries.append({
            'id': entry_id_text,
            'title': title_text,
            'updated': updated_text,
            'link': link_url,
            'content': content_html
        })
        
    return {
        'title': feed_title_text,
        'updated': feed_updated_text,
        'entries': entries
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        data = fetch_release_notes()
        return jsonify(data)
    except Exception as e:
        app.logger.error(f"Error fetching release notes: {e}")
        return jsonify({
            'error': 'Failed to fetch release notes from Google Cloud feed.',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    # Default to port 5000 or any custom port
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

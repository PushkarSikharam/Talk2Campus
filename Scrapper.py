"""
TAMUCC site scraper

Requirements Needed:
pip install requests beautifulsoup4 lxml numpy tqdm PyPDF2 retrying

Run:
python Scrapper.py
"""

import os
import re
import time
import json
import hashlib
from io import BytesIO
from urllib.parse import urljoin, urlparse, urldefrag

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
from PyPDF2 import PdfReader
import numpy as np
from tqdm import tqdm
from retrying import retry

# ---------- CONFIG ----------
ROOT_URL = "https://www.tamucc.edu/"
ALLOWED_DOMAIN = "tamucc.edu"
OUT_DIR = "tamucc_data_enhanced_jsonl"
os.makedirs(OUT_DIR, exist_ok=True)
PDF_TEXT_DIR = os.path.join(OUT_DIR, "pdf_texts")
os.makedirs(PDF_TEXT_DIR, exist_ok=True)

LINKS_NPY = os.path.join(OUT_DIR, "links.npy")
VISITED_JSON = os.path.join(OUT_DIR, "visited.json")
QUEUE_JSON = os.path.join(OUT_DIR, "queue.json")
OUTPUT_JSONL = os.path.join(OUT_DIR, "scraped_data.jsonl")

USER_AGENT = "TAMUCC-Scraper/1.0 (+https://example.com/)"
REQUEST_TIMEOUT = 25
RATE_LIMIT_SECONDS = 0.5  # polite pause between requests
MAX_WORKERS = 4  # concurrency (keeps polite). You Can lower to 1 if desired.
#MAX_PAGES None => no enforced limit
MAX_PAGES = None
# ----------------------------

session = requests.Session()
retries = Retry(total=3, backoff_factor=1,
                status_forcelist=[429, 500, 502, 503, 504], #Common Error codes you see when scraping
                allowed_methods=frozenset(["GET", "HEAD"]))
session.mount("https://", HTTPAdapter(max_retries=retries))
session.mount("http://", HTTPAdapter(max_retries=retries))
session.headers.update({"User-Agent": USER_AGENT})

# robots.txt check (politeness)
from urllib import robotparser
rp = robotparser.RobotFileParser()
robots_url = urljoin(ROOT_URL, "/robots.txt")
try:
    rp.set_url(robots_url)
    rp.read()
except Exception:
    # if robots fails, we'll still proceed but be conservative
    pass

def can_fetch(url: str) -> bool:
    try:
        return rp.can_fetch(USER_AGENT, url)
    except Exception:
        return True

def is_in_domain(url: str) -> bool:
    host = urlparse(url).hostname or ""
    return host.endswith(ALLOWED_DOMAIN)

def canonicalize(u: str) -> str:
    u, _ = urldefrag(u)
    return u.strip()

# load state if exists
if os.path.exists(LINKS_NPY):
    try:
        links_list = np.load(LINKS_NPY, allow_pickle=True).tolist()
    except Exception:
        links_list = []
else:
    links_list = []

links_set = set(links_list)

if os.path.exists(VISITED_JSON):
    with open(VISITED_JSON, "r", encoding="utf-8") as f:
        visited = set(json.load(f))
else:
    visited = set()

if os.path.exists(QUEUE_JSON):
    with open(QUEUE_JSON, "r", encoding="utf-8") as f:
        queue = json.load(f)
else:
    queue = [ROOT_URL]

def persist_state():
    try:
        np.save(LINKS_NPY, np.array(list(links_set), dtype=object), allow_pickle=True)
        with open(VISITED_JSON, "w", encoding="utf-8") as f:
            json.dump(list(visited), f, indent=2)
        with open(QUEUE_JSON, "w", encoding="utf-8") as f:
            json.dump(queue, f, indent=2)
    except Exception as e:
        print("Persist failed:", e)

def extract_text_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "svg", "iframe", "header", "footer"]):
        tag.decompose()
    return re.sub(r"\s+", " ", soup.get_text(" ")).strip()

def extract_text_from_pdf_bytes(content: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(content))
        pages = []
        for p in reader.pages:
            txt = p.extract_text()
            if txt:
                pages.append(txt)
        return " ".join(pages).strip()
    except Exception as e:
        print("PDF parse error:", e)
        return ""

def discover_links(base_url: str, html: str):
    soup = BeautifulSoup(html, "lxml")
    out = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith("javascript:") or href.startswith("mailto:") or href.startswith("#"):
            continue
        full = urljoin(base_url, href)
        full = canonicalize(full)
        if is_in_domain(full):
            out.append(full)
    return out

# robust pagination detection
PAGINATION_RE = re.compile(r"(pageindex=|page=|pg=|p=)\d+", flags=re.IGNORECASE)

@retry(stop_max_attempt_number=3, wait_exponential_multiplier=1000, wait_exponential_max=10000)
def fetch(url: str):
    headers = {"User-Agent": USER_AGENT}
    r = session.get(url, headers=headers, timeout=REQUEST_TIMEOUT, allow_redirects=True)
    r.raise_for_status()
    return r

# open JSONL for append - create if missing
out_f = open(OUTPUT_JSONL, "a", encoding="utf-8")

scraped_count = 0
pbar = tqdm(unit="page", desc="scraped", leave=True) if False else None  # set True to see progress bar

try:
    while queue:
        # stop if we had a MAX_PAGES cap and reached it
        if MAX_PAGES and scraped_count >= MAX_PAGES:
            print("Reached page cap:", MAX_PAGES)
            break

        url = queue.pop(0)
        url = canonicalize(url)
        if url in visited:
            continue

        # check domain + robots
        if not is_in_domain(url):
            visited.add(url)
            continue
        if not can_fetch(url):
            print("Blocked by robots:", url)
            visited.add(url)
            continue

        # dedupe tracking (numpy list)
        if url not in links_set:
            links_set.add(url)

        try:
            print("Fetching:", url)
            r = fetch(url)
        except Exception as e:
            print("Fetch failed for", url, e)
            visited.add(url)
            persist_state()
            time.sleep(RATE_LIMIT_SECONDS)
            continue

        ctype = r.headers.get("Content-Type", "").lower()
        if ";" in ctype:
            ctype = ctype.split(";", 1)[0].strip()

        final_url = r.url
        path = urlparse(final_url).path.lower()

        # PDF detection robust
        if path.endswith(".pdf") or "application/pdf" in ctype or re.search(r"\.pdf($|\?)", final_url, re.IGNORECASE):
            text = extract_text_from_pdf_bytes(r.content)
            if text:
                # write JSONL entry
                doc = {"url": final_url, "type": "pdf", "text": text}
                out_f.write(json.dumps(doc, ensure_ascii=False) + "\n")
                out_f.flush()
                # save a copy of pdf text to file
                safe_name = hashlib.md5(final_url.encode("utf-8")).hexdigest()
                try:
                    with open(os.path.join(PDF_TEXT_DIR, f"{safe_name}.txt"), "w", encoding="utf-8") as pf:
                        pf.write(text)
                except Exception as ee:
                    print("Could not write pdf txt:", ee)
            else:
                # still store empty doc to indicate we visited it
                out_f.write(json.dumps({"url": final_url, "type": "pdf", "text": ""}, ensure_ascii=False) + "\n")
                out_f.flush()

            visited.add(url)
            scraped_count += 1
            time.sleep(RATE_LIMIT_SECONDS)
            persist_state()
            continue  # do not treat PDF as HTML (no link discovery)

        # treat as HTML (or fallback)
        text = ""
        discovered = []
        if "text/html" in ctype or path.endswith(".html") or path.endswith(".htm") or "<html" in r.text.lower():
            html = r.text
            text = extract_text_from_html(html)
            discovered = discover_links(final_url, html)

            # Pagination detection: also add derived pages if anchor links indicate page patterns
            # We will also scan discovered links and include those matching pagination regex
            for link in discovered:
                if link not in visited and link not in queue:
                    queue.append(link)

            # ensure any pagination-like link is queued (covered above since discover returns all)
            # no artificial numerical generation since user wanted no limit: rely on discovered pagination links
        else:
            # unknown content; skip
            visited.add(url)
            persist_state()
            time.sleep(RATE_LIMIT_SECONDS)
            continue

        # Save HTML text (JSONL)
        doc = {"url": final_url, "type": "html", "text": text}
        out_f.write(json.dumps(doc, ensure_ascii=False) + "\n")
        out_f.flush()

        visited.add(url)
        scraped_count += 1

        # Persist every N pages to be safe
        if scraped_count % 10 == 0:
            persist_state()

        # Politeness pause
        time.sleep(RATE_LIMIT_SECONDS)

    # main loop done (queue empty)
finally:
    out_f.close()
    persist_state()
    print("Done. Pages scraped (attempted):", scraped_count)
    print("Output JSONL:", OUTPUT_JSONL)
    print("PDF text directory:", PDF_TEXT_DIR)

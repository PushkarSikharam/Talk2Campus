import requests

BASE = 'http://127.0.0.1:8000'

def signup():
    resp = requests.post(f'{BASE}/signup', json={'name':'Smoke','email':'smoke@example.com','password':'smokepass'})
    print('signup', resp.status_code, resp.text)

def login(session: requests.Session):
    resp = session.post(f'{BASE}/login', json={'email':'smoke@example.com','password':'smokepass'})
    print('login', resp.status_code, resp.text)

def me(session: requests.Session):
    resp = session.get(f'{BASE}/me')
    print('me', resp.status_code, resp.text)

if __name__ == '__main__':
    signup()
    s = requests.Session()
    login(s)
    me(s)

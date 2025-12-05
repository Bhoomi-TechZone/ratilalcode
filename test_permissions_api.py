import sys
import os
sys.path.insert(0, 'e:/Ratilal_CRM')

import requests
import json

def test_permissions_api():
    url = "http://127.0.0.1:8001/api/permissions/my"
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJVU1ItNjc3IiwidXNlcm5hbWUiOiJzYWphbC5zaGFybWEiLCJyb2xlcyI6WyJSby0wMjQiXSwiZXhwIjoxNzY1Mjg1MDk2LCJpYXQiOjE3NjQ2ODAyOTYsImlzcyI6InlvdXItYXBpIn0.MiAUgrkodIMgkBTh1aU1gwNSsU6Wkp7f1mzm79IpUoM"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        print("Testing permissions API...")
        response = requests.get(url, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Permissions returned: {len(data)}")
            for perm in data:
                print(f"  - Code: {perm.get('code')}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_permissions_api()
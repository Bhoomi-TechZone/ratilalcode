#!/usr/bin/env python3
"""
Test script to verify that employee uploads now properly capture user IDs.
This will simulate an employee upload and check if the employee_id is captured correctly.
"""

import requests
import json

# Test configuration
BASE_URL = "https://ratilalandsons.onrender.com"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
UPLOAD_URL = f"{BASE_URL}/api/employee-docs/employee/upload-document"

def test_employee_upload():
    print("Testing Employee Document Upload with User ID Fix")
    print("=" * 50)
    
    # Step 1: Login to get a valid token
    print("1. Logging in to get access token...")
    
    # Use a test employee account - you'll need to replace with actual credentials
    login_data = {
        "username": "testuser",  # Replace with actual employee username
        "password": "password123"  # Replace with actual password
    }
    
    try:
        response = requests.post(LOGIN_URL, data=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get("access_token")
            user_info = token_data.get("user", {})
            
            print(f"   ✓ Login successful!")
            print(f"   ✓ User ID: {user_info.get('user_id', 'N/A')}")
            print(f"   ✓ User Name: {user_info.get('name', 'N/A')}")
            
            # Step 2: Test the upload endpoint
            print("\n2. Testing document upload...")
            
            headers = {
                "Authorization": f"Bearer {access_token}"
            }
            
            # Create test file data
            files = {
                'file': ('test_document.txt', 'This is a test document', 'text/plain')
            }
            
            params = {
                'document_type': 'ID_PROOF',
                'description': 'Test document upload for user ID verification'
            }
            
            upload_response = requests.post(
                UPLOAD_URL,
                headers=headers,
                files=files,
                params=params
            )
            
            print(f"   Upload Status Code: {upload_response.status_code}")
            
            if upload_response.status_code == 200:
                result = upload_response.json()
                print(f"   ✓ Upload successful!")
                print(f"   ✓ Document ID: {result.get('document_id', 'N/A')}")
                
                # Check if employee_id was captured correctly
                document = result.get('document', {})
                employee_id = document.get('employee_id')
                
                print(f"   ✓ Employee ID captured: {employee_id}")
                
                if employee_id and employee_id != "None":
                    print("   🎉 SUCCESS: Employee ID is properly captured!")
                    return True
                else:
                    print("   ❌ ISSUE: Employee ID is still None")
                    return False
            else:
                error_data = upload_response.json() if upload_response.content else {}
                print(f"   ❌ Upload failed: {error_data.get('detail', 'Unknown error')}")
                return False
        
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Test failed with error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_employee_upload()
    if success:
        print("\n✓ All tests passed! Employee ID capture is working correctly.")
    else:
        print("\n❌ Test failed. Please check the server logs for more details.")
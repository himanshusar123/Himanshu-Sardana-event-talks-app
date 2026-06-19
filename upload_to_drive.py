import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/drive.file"]

def upload_file(local_file_path, drive_folder_id=None):
    """Uploads a local file to Google Drive using user credentials."""
    creds = None
    # The file token.json stores the user's access and refresh tokens
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
        
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists("credentials.json"):
                raise FileNotFoundError(
                    "Missing 'credentials.json' file. Please download it from "
                    "Google Cloud Console -> APIs & Services -> Credentials."
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                "credentials.json", SCOPES
            )
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open("token.json", "w") as token:
            token.write(creds.to_json())

    try:
        service = build("drive", "v3", credentials=creds)

        file_name = os.path.basename(local_file_path)
        file_metadata = {"name": file_name}
        
        if drive_folder_id:
            file_metadata["parents"] = [drive_folder_id]

        media = MediaFileUpload(local_file_path, resumable=True)
        
        file = (
            service.files()
            .create(body=file_metadata, media_body=media, fields="id")
            .execute()
        )
        print(f"Upload Successful! Google Drive File ID: {file.get('id')}")
        return file.get("id")

    except HttpError as error:
        print(f"An API error occurred: {error}")
        return None

if __name__ == "__main__":
    # Example usage:
    # 1. Create a dummy file to test
    dummy_file = "test_upload_sample.txt"
    with open(dummy_file, "w") as f:
        f.write("Hello from Google Drive API using Antigravity CLI!")
        
    print(f"Attempting to upload '{dummy_file}'...")
    try:
        upload_file(dummy_file)
    except Exception as e:
        print(f"Error: {e}")

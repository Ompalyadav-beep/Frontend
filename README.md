# YouTube Dashboard Frontend

This is the frontend for the YouTube Dashboard application. It provides a user interface for viewing trending YouTube videos, searching for videos, and more.

## Setup

1. Simply open the `index.html` file in your browser for local development.
2. For a more robust local development environment, you can use a local server like Live Server in VS Code.

## Deployment on Netlify

1. Create a new site on Netlify
2. Connect your GitHub repository
3. Configure the following settings:
   - Base directory: `frontend` (if your repository has both frontend and backend)
   - Build command: (leave empty)
   - Publish directory: `/` (or the directory containing your index.html)

4. Click "Deploy site"

## API Configuration

The frontend is configured to automatically detect whether it's running in a development or production environment:

- In development (localhost), it will connect to the local backend at `http://127.0.0.1:5000`
- In production, it will connect to the deployed backend at `https://backend-6-lnvt.onrender.com`

If you deploy the backend to a different URL, update the `PRODUCTION_API_URL` in `static/script.js`.

## Features

- View trending YouTube videos
- Filter trending videos in real-time
- Search for videos in the trending data
- Search for videos directly on YouTube
- Refresh trending data from YouTube

## CORS Issues

If you encounter CORS issues when deploying:

1. Make sure your backend has the correct CORS configuration allowing requests from your frontend domain.
2. Check that the API URL in `static/script.js` is correct.
3. Ensure your browser isn't blocking cross-origin requests.
# Frontend

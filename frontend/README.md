# Rental Properties Frontend

React-based frontend application for the rental properties website.

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

1. Make sure the backend server is running on `http://localhost:5000`

2. Start the React development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

## Features

- User authentication (Login/Register)
- Property listings display
- Responsive design
- Modern UI with smooth animations
- Connection to backend API

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   ├── Header/
│   │   ├── Hero/
│   │   ├── Properties/
│   │   ├── Features/
│   │   ├── About/
│   │   ├── Contact/
│   │   └── Footer/
│   ├── context/
│   │   └── AuthContext.js
│   ├── pages/
│   │   └── Home/
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
└── package.json
```

## API Connection

The frontend connects to the backend API at `http://localhost:5000`:
- Authentication: `/auth/login`, `/auth/register`
- Users: `/users`, `/users/:id`


## MapBox installation

-npm install mapbox-gl

-npm install @mapbox/mapbox-gl-geocoder



backend ma after changes:
-npm install bcryptjs
-npm install jsonwebtoken

# Smart Wi-Fi Bound Attendance System

A smartphone-based attendance system that leverages institutional Wi-Fi infrastructure to ensure location-bound attendance marking.

## Features

- **Wi-Fi Bound**: Only students connected to authorized Wi-Fi can mark attendance
- **Time-Limited Prompts**: Lecturers create 2-3 minute attendance windows
- **Proxy Prevention**: IP address verification prevents remote attendance marking
- **Real-time Reporting**: Automated attendance logs with Excel/PDF export
- **Multi-role Support**: Student, Lecturer, and Admin dashboards

## Technology Stack

- **Frontend**: React.js with responsive design
- **Backend**: Node.js with Express
- **Database**: MongoDB for flexible data storage
- **Authentication**: JWT-based secure authentication
- **Deployment**: Cloud-ready (AWS/Heroku compatible)

## Project Structure

```
├── frontend/          # React.js application
├── backend/           # Node.js/Express API
└── docs/             # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Institutional Wi-Fi with identifiable IP range

### Installation

1. Clone the repository
2. Install backend dependencies: `cd backend && npm install`
3. Install frontend dependencies: `cd frontend && npm install`
4. Configure environment variables
5. Start the development servers

## Development

- Backend API: `http://localhost:5000`
- Frontend App: `http://localhost:3000`

## Deployment

The system is designed for cloud deployment with support for multiple institutions and thousands of concurrent users.

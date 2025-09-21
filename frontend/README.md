# Smart Wi-Fi Bound Attendance System - Frontend

A modern React.js frontend application for the Smart Wi-Fi Bound Attendance System, designed for academic institutions to manage attendance through Wi-Fi network and location-based verification.

## Features

### 🎓 Student Features
- **Quick Attendance Marking**: Mark attendance for active sessions with location verification
- **Attendance History**: View personal attendance records and statistics
- **Real-time Session Detection**: Automatically detect available attendance sessions
- **Mobile-First Design**: Optimized for smartphone usage

### 👨‍🏫 Lecturer Features
- **Session Management**: Create and manage attendance sessions
- **Real-time Monitoring**: View live attendance as students mark their presence
- **Location & Wi-Fi Controls**: Set required Wi-Fi network and location radius
- **Attendance Reports**: Export and view detailed attendance reports
- **Session Analytics**: Track attendance patterns and statistics

### 👨‍💼 Admin Features
- **User Management**: Manage students, lecturers, and admin accounts
- **System Overview**: Monitor all sessions and user activities
- **Reports & Analytics**: Generate comprehensive system reports
- **Role-based Access Control**: Secure access management

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Location Services**: Browser Geolocation API
- **Build Tool**: Create React App

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Shared components (Button, Input, Modal, etc.)
│   ├── auth/            # Authentication components
│   ├── student/         # Student-specific components
│   ├── lecturer/        # Lecturer-specific components
│   └── admin/           # Admin-specific components
├── hooks/               # Custom React hooks
├── pages/               # Page components
├── services/            # API services and HTTP client
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── styles/              # Global styles and Tailwind config
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Backend server running on localhost:5000

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment** (optional):
   Create `.env.local` file:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000`

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App (⚠️ irreversible)

## Key Components

### Authentication System
- **JWT-based authentication** with automatic token refresh
- **Role-based routing** (Student/Lecturer/Admin dashboards)
- **Protected routes** with access control
- **Form validation** with real-time feedback

### Location Services
- **Geolocation API integration** for attendance verification
- **Distance calculation** using Haversine formula
- **Error handling** for location permissions and availability
- **Privacy-conscious** location usage

### Responsive Design
- **Mobile-first approach** optimized for smartphones
- **Progressive enhancement** for larger screens
- **Touch-friendly interfaces** with appropriate sizing
- **Accessibility considerations** following WCAG guidelines

### Real-time Features
- **Live session updates** for active attendance sessions
- **Automatic session expiration** handling
- **Real-time attendance tracking** for lecturers
- **Network status monitoring**

## API Integration

The frontend communicates with the backend through a RESTful API:

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - User logout

### Session Management
- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session

### Attendance Operations
- `POST /api/sessions/:id/attend` - Mark attendance
- `GET /api/sessions/:id/attendance` - Get attendance records
- `GET /api/attendance/my` - Get personal attendance history

## Security Features

- **JWT token management** with automatic renewal
- **XSS protection** through React's built-in sanitization
- **HTTPS enforcement** in production
- **Input validation** and sanitization
- **Role-based access control** at route level

## Performance Optimizations

- **Code splitting** with React.lazy()
- **Image optimization** and lazy loading
- **Bundle size optimization** with tree shaking
- **Caching strategies** for API responses
- **Efficient re-rendering** with React.memo

## Browser Compatibility

- **Modern browsers** (Chrome 80+, Firefox 80+, Safari 13+, Edge 80+)
- **Mobile browsers** (iOS Safari 13+, Chrome Mobile 80+)
- **Geolocation API support** required
- **ES2018+ support** needed

## Development Guidelines

### Code Style
- **TypeScript strict mode** enabled
- **ESLint and Prettier** for code formatting
- **Component-based architecture** with clear separation
- **Custom hooks** for reusable logic

### Testing Strategy
- **Unit tests** for utility functions
- **Integration tests** for API services
- **Component tests** with React Testing Library
- **E2E tests** for critical user flows

### State Management
- **React Context** for global state (auth, theme)
- **Local state** for component-specific data
- **Optimistic updates** for better UX
- **Error boundaries** for graceful error handling

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
- `REACT_APP_API_URL` - Backend API base URL
- `REACT_APP_VERSION` - Application version

### Deployment Options
- **Static hosting** (Netlify, Vercel, GitHub Pages)
- **CDN distribution** for global performance
- **Docker containerization** available
- **CI/CD integration** with automated testing

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact the development team

---

Built with ❤️ for modern educational institutions.

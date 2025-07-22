# Flight Search SaaS Frontend

This is the React frontend application for the Flight Search SaaS platform, built with TypeScript and Tailwind CSS.

## Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Authentication**: Login, registration, and profile management
- **State Management**: Redux Toolkit for global state management
- **Routing**: React Router for client-side navigation
- **Real-time Updates**: Socket.io integration ready
- **Testing**: Comprehensive test suite with React Testing Library

## Technology Stack

- **React 18** with TypeScript
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Socket.io Client** for real-time communication
- **React Testing Library** for testing

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend API server running on port 3000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`.

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run test suite
- `npm run eject` - Eject from Create React App (not recommended)

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Auth/           # Authentication components
│   ├── Layout/         # Layout components (Header, Footer)
│   └── UI/             # Generic UI components
├── pages/              # Page components
├── store/              # Redux store and slices
│   └── slices/         # Redux slices
├── App.tsx             # Main app component
└── index.tsx           # Application entry point
```

## Components

### Layout Components
- **Header**: Navigation bar with authentication state
- **Footer**: Site footer with links
- **Layout**: Main layout wrapper

### Authentication Components
- **LoginForm**: User login form
- **RegisterForm**: User registration form
- **ProtectedRoute**: Route protection wrapper

### UI Components
- **NotificationContainer**: Toast notifications

## State Management

The application uses Redux Toolkit with the following slices:

- **authSlice**: User authentication state
- **uiSlice**: UI state (mobile menu, notifications, loading)

## Styling

The application uses Tailwind CSS with custom utility classes:

- `.btn-primary` - Primary button styling
- `.btn-secondary` - Secondary button styling
- `.input-field` - Form input styling
- `.card` - Card container styling

## Testing

Tests are written using React Testing Library and Jest:

```bash
npm test
```

Test files are located in `__tests__` directories next to the components they test.

## API Integration

The frontend is configured to communicate with the backend API:

- Authentication endpoints: `/api/auth/login`, `/api/auth/register`
- User profile: `/api/users/profile`
- Flight search: `/api/search/*` (to be implemented)

## Environment Variables

Create a `.env` file in the frontend directory for environment-specific configuration:

```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000
```

## Deployment

Build the application for production:

```bash
npm run build
```

The build files will be in the `build/` directory, ready for deployment to any static hosting service.

## Contributing

1. Follow the existing code structure and naming conventions
2. Write tests for new components and features
3. Use TypeScript for type safety
4. Follow responsive design principles
5. Ensure accessibility compliance

## Future Enhancements

- Chat interface for flight search
- Flight results display
- Booking flow components
- Reward program management
- Mobile app (React Native)
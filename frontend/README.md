# SafeVault Frontend

A modern, responsive web application built with Next.js 15, React 19, and TypeScript for the SafeVault enterprise file management system.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **UI Framework**: React 19
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Authentication**: Google OAuth (@react-oauth/google)
- **UI Components**: Custom components with class-variance-authority
- **Animations**: Lottie React
- **Notifications**: Sonner
- **Icons**: Lucide React
- **Build Tool**: Turbopack

## Project Structure

```
frontend/
├── public/                    # Static assets
│   ├── logo.png              # Application logos
│   ├── logo_small.png
│   ├── login_texture.png     # Background textures
│   ├── loader.json           # Lottie animation files
│   └── *.svg                 # SVG icons and illustrations
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── (pages)/         # Route groups
│   │   ├── api/             # API routes
│   │   ├── components/      # Page-specific components
│   │   ├── share/           # File sharing pages
│   │   ├── layout.tsx       # Root layout component
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   └── ui/              # Reusable UI components
│   ├── lib/                 # Utility functions and configurations
│   └── schema/              # Type definitions and schemas
├── components.json           # UI component configuration
├── next.config.ts           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm package manager

### Installation

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:

```bash
cp .env.local.example .env.local
```

4. Configure your environment variables in `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_DEV_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_PROD_BACKEND_URL=https://your-production-backend-url.com
```

### Development

Start the development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

Create an optimized production build:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

### Linting

Run ESLint to check code quality:

```bash
npm run lint
```

## Features

### Authentication

- Google OAuth integration
- JWT token management
- Secure session handling
- Role-based access control

### File Management

- Drag and drop file uploads
- File preview and download
- Folder organization and navigation
- Search and filtering capabilities
- File versioning and history

### Sharing & Collaboration

- User-to-user file sharing
- Public link generation
- Permission management (view/edit/admin)
- Share link expiration controls

### User Interface

- Responsive design for all devices
- Dark and light theme support
- Smooth animations and transitions
- Toast notifications
- Loading states and error handling

### Performance

- Next.js App Router for optimal performance
- Turbopack for fast builds and hot reloading
- Image optimization
- Code splitting and lazy loading

## Key Dependencies

### Core Framework

- `next`: 15.5.3 - React framework with hybrid static & server rendering
- `react`: 19.1.0 - UI library
- `typescript`: 5+ - Type safety and developer experience

### UI & Styling

- `tailwindcss`: 4+ - Utility-first CSS framework
- `lucide-react`: Icons and illustrations
- `next-themes`: Theme switching functionality
- `lottie-react`: High-quality animations

### State Management & Utils

- `zustand`: Lightweight state management
- `zod`: Schema validation
- `clsx` & `tailwind-merge`: Conditional styling utilities
- `class-variance-authority`: Component variant management

### Authentication

- `@react-oauth/google`: Google OAuth integration

### User Experience

- `sonner`: Toast notifications

## Development Guidelines

### Code Style

- Use TypeScript for all components and utilities
- Follow ESLint configuration for consistent code style
- Use Tailwind CSS for styling with utility classes
- Implement proper error boundaries and loading states

### Component Architecture

- Create reusable UI components in `src/components/ui/`
- Use the compound component pattern for complex UI elements
- Implement proper TypeScript interfaces for props
- Follow the single responsibility principle

### State Management

- Use Zustand for global state management
- Keep component state local when possible
- Implement proper loading and error states
- Use React Query patterns for API data fetching

### Performance Optimization

- Use Next.js Image component for optimized images
- Implement code splitting for large components
- Use React.memo for expensive components
- Optimize bundle size with proper imports

## API Integration

The frontend communicates with the GraphQL backend API. Key integration points:

- Authentication endpoints for login/logout
- File upload and management operations
- User and sharing management
- Real-time updates for collaborative features

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing (Currently Repo is Private)

1. Follow the existing code style and patterns
2. Write TypeScript interfaces for all props and data structures
3. Add proper error handling and loading states
4. Test your changes across different screen sizes
5. Ensure accessibility standards are met

## Environment Variables

Required environment variables:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID for authentication
- `NEXT_PUBLIC_GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `NEXT_PUBLIC_DEV_BACKEND_URL`: Backend GraphQL API endpoint for development (e.g., http://localhost:8080)
- `NEXT_PUBLIC_PROD_BACKEND_URL`: Backend GraphQL API endpoint for production

## Deployment

The frontend can be deployed to various platforms:

- **Vercel** (recommended for Next.js applications)
- **Netlify**
- **AWS Amplify**
- **Docker** (using the Dockerfile if available)

For production deployment, ensure all environment variables are properly configured and the backend API is accessible.

## License

This project is part of the SafeVault enterprise file management system. See the main project license for details.

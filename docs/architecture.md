# SafeVault Architecture & Design Document

## Overview

SafeVault is a modern, enterprise-grade file management system designed for secure storage, intelligent deduplication, and seamless collaboration. The system follows a microservices-oriented architecture with clear separation of concerns, leveraging GraphQL for API communication and implementing robust security measures throughout.

## System Architecture

### High-Level Architecture

The system is built using a three-tier architecture pattern:

1. **Presentation Layer**: React-based frontend with TypeScript
2. **Business Logic Layer**: Go backend with GraphQL API
3. **Data Layer**: PostgreSQL database with MinIO object storage

### Technology Stack

**Backend Technologies:**

- **Go 1.24**: Primary backend language
- **GraphQL**: API layer using gqlgen
- **PostgreSQL**: Primary database for metadata and relationships
- **MinIO**: S3-compatible object storage for file data
- **JWT**: Authentication and authorization
- **Docker**: Containerization and deployment

**Frontend Technologies:**

- **Next.js 15**: React framework with SSR/SSG capabilities
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling framework
- **Zustand**: Lightweight state management
- **React Query**: Server state management and caching

## Core Design Principles

### 1. Security First

- JWT-based authentication with secure token management
- Role-based access control (RBAC) for granular permissions
- Google OAuth integration for enterprise SSO
- Private-by-default file visibility
- Secure file sharing with expiration controls

### 2. Performance & Scalability

- Intelligent file deduplication using SHA-256 hashing
- Reference counting for efficient storage management
- GraphQL for efficient data fetching and reduced over-fetching
- Optimistic updates in the frontend for responsive UX
- Pagination and lazy loading for large datasets

### 3. Data Integrity

- Soft delete mechanisms with recovery capabilities
- Comprehensive audit logging for file activities
- Foreign key constraints with relaxed references for flexibility
- Transaction-based operations for data consistency

### 4. User Experience

- Mobile-first responsive design
- Real-time updates and notifications
- Intuitive folder hierarchy and organization
- Advanced search with filtering capabilities
- Drag-and-drop file operations

## Backend Architecture

### Service Layer Architecture

The backend follows a layered architecture pattern:

```
┌─────────────────────────────────────┐
│           GraphQL Layer             │
│  (Resolvers, Schema, Type System)   │
├─────────────────────────────────────┤
│            Service Layer            │
│   (Business Logic, Validation)      │
├─────────────────────────────────────┤
│          Repository Layer           │
│    (Data Access, Queries)           │
├─────────────────────────────────────┤
│            Model Layer              │
│    (Domain Objects, Entities)       │
└─────────────────────────────────────┘
```

### Core Services

**Authentication Service**

- JWT token generation and validation
- Google OAuth integration
- Password hashing and verification
- Session management

**File Service**

- File upload and storage orchestration
- Deduplication logic using content hashing
- File metadata management
- Download and streaming operations

**Folder Service**

- Hierarchical folder structure management
- Folder creation and organization
- Permission inheritance

**Share Service**

- User-to-user file sharing
- Public link generation with expiration
- Permission management (owner/editor/viewer)
- Share notification system

**Activity Service**

- File access tracking
- Download analytics
- User activity logging
- Audit trail maintenance

### Data Storage Strategy

**File Deduplication System:**

1. Calculate SHA-256 hash of uploaded file content
2. Check if hash exists in the database
3. If exists, create user file mapping to existing record
4. If new, store file in object storage and create database record
5. Maintain reference count for cleanup operations

**Database Schema Design:**

- **Users Table**: Authentication and profile information
- **Files Table**: File metadata with deduplication keys
- **User_Files Table**: Many-to-many mapping with user-specific metadata
- **Folders Table**: Hierarchical folder structure
- **Shares Table**: File and folder sharing relationships
- **Public_Links Table**: External sharing links with expiration
- **File_Activities Table**: Audit logging and analytics

## Frontend Architecture

### Component Architecture

The frontend follows a component-based architecture with clear separation of concerns:

```
src/
├── app/                    # Next.js app router pages
├── components/
│   ├── ui/                # Reusable UI components
│   ├── forms/             # Form-specific components
│   ├── layout/            # Layout components
│   └── features/          # Feature-specific components
├── lib/
│   ├── auth/              # Authentication utilities
│   ├── api/               # GraphQL client and queries
│   ├── utils/             # Helper functions
│   └── stores/            # Zustand state stores
└── schema/                # TypeScript type definitions
```

### State Management Strategy

**Global State (Zustand):**

- User authentication state
- Application-wide settings
- Theme preferences
- Navigation state

**Server State (React Query):**

- File and folder data
- User permissions
- Share relationships
- Activity logs

**Local State (React):**

- Form inputs and validation
- UI interactions (modals, dropdowns)
- Temporary selections
- Loading states

### Data Flow Pattern

1. **User Action**: User initiates action (upload, share, etc.)
2. **Optimistic Update**: UI immediately reflects expected change
3. **API Request**: GraphQL mutation sent to backend
4. **Server Processing**: Backend validates and processes request
5. **Response Handling**: Success/error handling with state reconciliation
6. **Cache Update**: React Query cache updated with server response

## Security Architecture

### Authentication Flow

1. **Login Process**:

   - User provides email/password or Google OAuth token
   - Backend validates credentials and generates JWT
   - JWT contains user ID, roles, and expiration
   - Token stored securely in client (httpOnly cookie recommended)

2. **Request Authorization**:
   - Every API request includes JWT in Authorization header
   - Middleware validates token and extracts user context
   - User context passed to resolvers for authorization checks

### Permission System

**File Permissions:**

- **Owner**: Full control (read, write, delete, share)
- **Editor**: Read and write access
- **Viewer**: Read-only access

**Folder Permissions:**

- Inherit from parent folder or explicitly set
- Override child permissions when necessary
- Cascade permissions to contained files

**Public Link Security:**

- UUID-based link identifiers
- Optional expiration dates
- Access logging for audit trails
- Ability to revoke links immediately

## API Design

### GraphQL Schema Structure

**Core Types:**

- `User`: User account information and preferences
- `File`: File metadata and storage information
- `Folder`: Folder structure and hierarchy
- `UserFile`: User-specific file associations
- `FileShare`: Sharing relationships and permissions
- `PublicLink`: External sharing links

**Query Operations:**

- File and folder browsing with pagination
- Search operations with filters
- User management and profiles
- Activity and audit logs

**Mutation Operations:**

- File upload and management
- Folder creation and organization
- Sharing and permission management
- User authentication and registration

**Subscription Operations:**

- Real-time file updates
- Share notifications
- Activity feeds

### Error Handling Strategy

**Client-Side Error Handling:**

- GraphQL error parsing and categorization
- User-friendly error messages
- Retry mechanisms for transient failures
- Offline support with queue-based sync

**Server-Side Error Handling:**

- Structured error responses with error codes
- Detailed logging for debugging
- Graceful degradation for partial failures
- Transaction rollback for consistency

## Deployment Architecture

### Container Strategy

**Backend Container:**

- Multi-stage Docker build for optimization
- Health checks and readiness probes
- Environment-based configuration
- Horizontal scaling capabilities

**Frontend Container:**

- Next.js production build with static optimization
- CDN integration for static assets
- Server-side rendering for SEO
- Edge deployment for global performance

### Infrastructure Components

**Database:**

- PostgreSQL with connection pooling
- Read replicas for query optimization
- Automated backups and point-in-time recovery
- Database migration management

**Object Storage:**

- MinIO for development and testing
- AWS S3 for production deployment
- Lifecycle policies for storage optimization
- Cross-region replication for disaster recovery

**Monitoring & Observability:**

- Application performance monitoring
- Error tracking and alerting
- Database query analysis
- Storage usage analytics

## Performance Considerations

### Backend Optimizations

**Database Performance:**

- Proper indexing on frequently queried columns
- Query optimization and plan analysis
- Connection pooling and prepared statements
- Materialized views for complex aggregations

**File Operations:**

- Streaming uploads for large files
- Chunked downloads with resume capability
- Background processing for intensive operations
- Caching frequently accessed metadata

### Frontend Optimizations

**Loading Performance:**

- Code splitting and lazy loading
- Image optimization and lazy loading
- Service worker for offline capabilities
- Progressive Web App (PWA) features

**User Experience:**

- Optimistic updates for immediate feedback
- Skeleton screens during loading
- Infinite scrolling for large datasets
- Debounced search for responsive filtering

## Scalability Patterns

### Horizontal Scaling

**Stateless Backend Design:**

- JWT-based authentication (no server sessions)
- Shared database connections across instances
- Load balancer distribution
- Auto-scaling based on metrics

**Database Scaling:**

- Read replica distribution
- Sharding strategies for large datasets
- Caching layer (Redis) for frequently accessed data
- Database connection pooling

### Caching Strategy

**Application-Level Caching:**

- In-memory caching for user sessions
- Query result caching with TTL
- File metadata caching
- User permission caching

**CDN and Edge Caching:**

- Static asset distribution
- API response caching for public data
- Geographic distribution for global access
- Cache invalidation strategies

## Future Considerations

### Planned Enhancements

**Advanced Features:**

- Version control for files
- Collaborative editing capabilities
- Advanced search with content indexing
- Integration with external storage providers

**Enterprise Features:**

- Single Sign-On (SSO) with SAML
- Advanced audit logging and compliance
- Custom branding and white-labeling
- API rate limiting and quotas

**Technical Improvements:**

- Event-driven architecture with message queues
- Microservices decomposition for larger scale
- Machine learning for intelligent file organization
- Blockchain-based file integrity verification

This architecture provides a solid foundation for a scalable, secure, and maintainable file management system while allowing for future growth and feature expansion.

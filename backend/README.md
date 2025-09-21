# SafeVault Backend

A high-performance GraphQL backend server built with Go for the SafeVault enterprise file management system. Provides secure file storage, user authentication, sharing capabilities, and comprehensive administrative functions.

## Tech Stack

- **Language**: Go 1.24+
- **API**: GraphQL with gqlgen
- **Database**: PostgreSQL 15
- **File Storage**: MinIO (S3-compatible)
- **Authentication**: JWT + Google OAuth
- **Password Hashing**: bcrypt
- **Database Driver**: pgx/v5
- **CORS**: rs/cors
- **UUID Generation**: google/uuid
- **Environment Management**: godotenv

## Architecture

The backend follows a clean architecture pattern with clear separation of concerns:

```
backend/
├── main.go                          # Application entry point
├── go.mod                          # Go module dependencies
├── go.sum                          # Dependency checksums
├── gqlgen.yml                      # GraphQL code generation config
├── docker-compose.yml              # Local development environment
├── graph/                          # GraphQL layer
│   ├── generated.go               # Auto-generated GraphQL code
│   ├── resolver.go                # GraphQL resolver interface
│   ├── schema.graphqls            # GraphQL schema definition
│   ├── schema.resolvers.go        # GraphQL resolver implementations
│   └── model/                     # GraphQL models
│       ├── models_gen.go          # Auto-generated models
│       └── _tmp_gqlgen_init.go    # Temporary initialization file
├── internal/                       # Internal application code
│   ├── auth/                      # Authentication utilities
│   │   ├── google.go              # Google OAuth integration
│   │   ├── jwt.go                 # JWT token management
│   │   └── password.go            # Password hashing utilities
│   ├── config/                    # Configuration management
│   │   ├── db.go                  # Database configuration
│   │   └── env.go                 # Environment variable loading
│   ├── middleware/                # HTTP middleware
│   │   └── auth_middleware.go     # Authentication middleware
│   ├── models/                    # Data models
│   │   ├── admin.go               # Admin user model
│   │   ├── file_activity.go       # File activity tracking
│   │   ├── file_downloads.go      # Download tracking
│   │   ├── files.go               # File metadata model
│   │   ├── folder.go              # Folder structure model
│   │   ├── google_user.go         # Google OAuth user model
│   │   ├── share.go               # File sharing model
│   │   ├── starred.go             # Starred items model
│   │   └── user.go                # User model
│   ├── repository/                # Data access layer
│   │   ├── file_activity_repository.go
│   │   ├── file_download_repository.go
│   │   ├── file_repository.go
│   │   ├── folder_repository.go
│   │   ├── public_link_repository.go
│   │   ├── share_repository.go
│   │   ├── starred_repository.go
│   │   └── user_repository.go
│   └── services/                  # Business logic layer
│       ├── admin_service.go       # Admin operations
│       ├── auth_service.go        # Authentication logic
│       ├── file_activity_service.go
│       ├── file_download_service.go
│       ├── file_service.go        # File management
│       ├── folder_service.go      # Folder operations
│       ├── google_service.go      # Google integration
│       ├── public_link_service.go # Public link sharing
│       ├── share_service.go       # File sharing logic
│       └── starred_service.go     # Starred items management
└── migrations/                     # Database migrations
    ├── 001_add_manual_user.sql
    ├── 002_add_google_users.sql
    ├── 003_files_and_user_files.sql
    ├── 004_relax_user_files_fk.sql
    ├── 005_add_deleted_at_to_user_files.sql
    ├── 006_add_profile_to_google_users.sql
    ├── 007_allow_duplicate_user_file_mappings.sql
    ├── 008_tags_and_search_indexes.sql
    ├── 009_folders.sql
    ├── 010_relax_folders_user_fk.sql
    ├── 011_add_file_folder_sharing.sql
    ├── 012_public_links.sql
    ├── 013_add_timestamps_to_google_users.sql
    ├── 014_add_file_download_tracking.sql
    ├── 015_relax_file_downloads_fks.sql
    ├── 016_fix_ref_count.sql
    ├── 017_add_file_activity_tracking.sql
    ├── 018_relax_file_activities_user_fk.sql
    ├── 019_add_starred_items.sql
    └── 020_fix_starred_items_fkey.sql
```

## Features

### Core Functionality

- **File Management**: Upload, download, delete, and organize files with metadata tracking
- **Folder Organization**: Hierarchical folder structure with nested capabilities
- **File Deduplication**: Intelligent file deduplication based on content hashing
- **Search & Indexing**: Full-text search capabilities with PostgreSQL indexes
- **File Activity Tracking**: Comprehensive audit trail for all file operations

### Authentication & Authorization

- **JWT Authentication**: Secure token-based authentication
- **Google OAuth Integration**: Sign in with Google account
- **Password Authentication**: Traditional email/password login with bcrypt hashing
- **Role-based Access Control**: User and admin role management
- **Session Management**: Secure session handling and token refresh

### Sharing & Collaboration

- **User-to-User Sharing**: Share files and folders with specific users
- **Permission Levels**: View, edit, and admin permissions
- **Public Link Sharing**: Generate public links with optional expiration
- **Share Management**: Track and manage all active shares

### Storage & Performance

- **MinIO Integration**: S3-compatible object storage for scalable file storage
- **Database Optimization**: Efficient PostgreSQL queries with proper indexing
- **Connection Pooling**: pgxpool for optimal database connection management
- **CORS Support**: Configurable cross-origin resource sharing

### Monitoring & Analytics

- **Download Tracking**: Monitor file download statistics
- **Activity Logging**: Track user actions and system events
- **Starred Items**: User-specific bookmarking system
- **Admin Dashboard**: Administrative oversight and user management

## Getting Started

### Prerequisites

- Go 1.24 or higher
- Docker and Docker Compose
- PostgreSQL 15 (or use Docker)
- MinIO (or use Docker)

### Local Development Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Start the development environment with Docker:

```bash
docker-compose up -d
```

This will start:

- PostgreSQL database on port 5432
- MinIO object storage on port 9000 (API) and 9001 (Console)

3. Install Go dependencies:

```bash
go mod download
```

4. Set up environment variables by creating a `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=filehive
DB_PASSWORD=filehivepass
DB_NAME=filehive_db
DB_SSLMODE=disable

# MinIO Configuration
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=filehive-bucket
MINIO_USE_SSL=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY_HOURS=24

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Server Configuration
PORT=8080
ENVIRONMENT=development

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

5. Run database migrations:

```bash
# Apply all migrations in order
for file in migrations/*.sql; do
    psql -h localhost -p 5432 -U filehive -d filehive_db -f "$file"
done
```

6. Generate GraphQL code:

```bash
go run github.com/99designs/gqlgen generate
```

7. Start the development server:

```bash
go run main.go
```

The server will start on `http://localhost:8080` with:

- GraphQL endpoint: `http://localhost:8080/graphql`
- GraphQL Playground: `http://localhost:8080/playground`

### Production Deployment

1. Build the application:

```bash
go build -o SafeVault-backend main.go
```

2. Set production environment variables
3. Run database migrations
4. Start the server:

```bash
./SafeVault-backend
```

## API Documentation

### GraphQL Schema

The API is built using GraphQL and provides a single endpoint with introspection enabled in development mode. Key query and mutation capabilities include:

#### Authentication

- `login`: Authenticate with email/password
- `googleLogin`: Authenticate with Google OAuth
- `register`: Create new user account
- `refreshToken`: Refresh JWT token

#### File Operations

- `uploadFile`: Upload new files to storage
- `downloadFile`: Download files by ID
- `deleteFile`: Soft delete files
- `searchFiles`: Search files by name, content, or tags
- `getFileInfo`: Retrieve file metadata

#### Folder Management

- `createFolder`: Create new folders
- `getFolderContents`: List folder contents
- `moveFile`: Move files between folders
- `deleteFolder`: Remove folders and contents

#### Sharing

- `shareFile`: Share files with users
- `createPublicLink`: Generate public access links
- `getSharedFiles`: List files shared with user
- `updateSharePermissions`: Modify sharing permissions

#### Admin Operations

- `getAllUsers`: List all system users
- `getUserActivity`: View user activity logs
- `getSystemStats`: Retrieve system statistics

### Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

The system uses PostgreSQL with the following main entities:

- **users**: User accounts and profiles
- **google_users**: Google OAuth user data
- **files**: File metadata and storage references
- **folders**: Hierarchical folder structure
- **user_files**: User-file relationships
- **shares**: File and folder sharing configurations
- **public_links**: Public access links
- **file_downloads**: Download tracking and analytics
- **file_activities**: Activity and audit logs
- **starred**: User bookmarks and favorites

See the `migrations/` directory for detailed schema definitions.

## Environment Variables

Required environment variables for production:

### Database

- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `DB_SSLMODE`: SSL mode (disable/require/verify-full)

### Object Storage

- `MINIO_ENDPOINT`: MinIO server endpoint
- `MINIO_ACCESS_KEY`: MinIO access key
- `MINIO_SECRET_KEY`: MinIO secret key
- `MINIO_BUCKET_NAME`: Storage bucket name
- `MINIO_USE_SSL`: Enable SSL for MinIO (true/false)

### Authentication

- `JWT_SECRET`: Secret key for JWT signing
- `JWT_EXPIRY_HOURS`: Token expiration time in hours
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

### Server

- `PORT`: HTTP server port (default: 8080)
- `ENVIRONMENT`: Environment mode (development/production)
- `CORS_ALLOWED_ORIGINS`: Allowed CORS origins (comma-separated)

## Development

### Code Generation

The project uses gqlgen for GraphQL code generation. After modifying the schema:

```bash
go run github.com/99designs/gqlgen generate
```

### Database Migrations

Create new migrations in the `migrations/` directory following the naming convention:

```
XXX_description.sql
```

Apply migrations manually or use a migration tool in production.

### Testing

Run the test suite:

```bash
go test ./...
```

Run tests with coverage:

```bash
go test -cover ./...
```

### Code Style

The project follows standard Go conventions:

- Use `gofmt` for code formatting
- Follow effective Go guidelines
- Use meaningful variable and function names
- Add comments for exported functions and types

## Performance Considerations

### Database Optimization

- Use connection pooling with pgxpool
- Implement proper indexing for search queries
- Use prepared statements for repeated queries
- Monitor query performance with EXPLAIN

### File Storage

- Implement file deduplication to save storage space
- Use streaming for large file uploads/downloads
- Consider CDN integration for static file serving
- Implement file compression for applicable types

### Caching

- Cache frequently accessed file metadata
- Implement user session caching
- Use database query result caching where appropriate

## Security

### Authentication Security

- JWT tokens are signed with strong secrets
- Passwords are hashed using bcrypt with appropriate cost
- Google OAuth follows secure flow practices
- Session management prevents token replay attacks

### File Security

- User authorization checked on all file operations
- File access is scoped to user permissions
- Public links can have expiration times
- Admin operations require elevated privileges

### API Security

- CORS properly configured for allowed origins
- GraphQL query complexity limiting
- Rate limiting recommended for production
- Input validation on all mutations

## Monitoring

### Logging

- Structured logging for all operations
- Error tracking and alerting
- Performance metrics collection
- User activity audit trails

### Health Checks

- Database connection monitoring
- MinIO storage health checks
- JWT token validation status
- System resource monitoring

## Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Verify PostgreSQL is running
   - Check connection string and credentials
   - Ensure database exists and migrations are applied

2. **MinIO Connection Issues**

   - Verify MinIO server is accessible
   - Check access keys and permissions
   - Ensure bucket exists and is accessible

3. **Authentication Problems**

   - Verify JWT secret is set correctly
   - Check Google OAuth credentials
   - Ensure proper CORS configuration

4. **GraphQL Errors**
   - Regenerate GraphQL code after schema changes
   - Check resolver implementations
   - Verify query syntax and arguments

## Contributing

1. Follow Go coding standards and conventions
2. Add tests for new functionality
3. Update GraphQL schema documentation
4. Ensure all migrations are backwards compatible
5. Add proper error handling and logging

## License

This project is part of the SafeVault enterprise file management system. See the main project license for details.

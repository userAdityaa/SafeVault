# SafeVault - Secure File Storage & Sharing Platform

[![Go Version](https://img.shields.io/badge/Go-1.24+-blue.svg)](https://golang.org)
[![Node.js Version](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com)

SafeVault is a modern, enterprise-grade file storage and sharing platform built with Go, GraphQL, Next.js, and TypeScript. It provides secure file storage, intelligent deduplication, real-time collaboration, and comprehensive sharing capabilities with public links.

## Quick Start with Docker

Get SafeVault running locally in under 2 minutes:

```bash
# Clone the repository
git clone git@github.com:BalkanID-University/vit-2026-capstone-internship-hiring-task-userAdityaa.git
cd vit-2026-capstone-internship-hiring-task-userAdityaa

# Start all services with one command
docker compose up -d
```

**Access your SafeVault instance:**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **MinIO Console**: http://localhost:9001
- **Database**: localhost:5432

That's it! SafeVault is now running with all services containerized and ready for development or testing.

## Docker Services

The Docker setup includes:

| Service  | Container            | Port      | Purpose                 |
| -------- | -------------------- | --------- | ----------------------- |
| Frontend | `safevault_frontend` | 3000      | Next.js web application |
| Backend  | `safevault_backend`  | 8080      | Go GraphQL API server   |
| Database | `safevault_postgres` | 5432      | PostgreSQL database     |
| Storage  | `safevault_minio`    | 9000/9001 | MinIO object storage    |

### Docker Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f [service-name]

# Stop all services
docker compose down

# Rebuild and restart
docker compose up -d --build

# Remove everything (including data)
docker compose down -v
```

## Features

- **Smart File Management**: Upload, organize, and manage files with SHA-256 based deduplication
- **Hierarchical Organization**: Nested folder structures for file organization
- **Real-time Access**: Fast file access with efficient caching and indexing
- **Trash & Recovery**: Soft delete with recovery capabilities
- **Advanced Search**: Full-text search with filters and metadata
- **File Sharing**: Secure sharing between users with permission controls
- **Public Links**: Time-limited public links for external sharing
- **Activity Analytics**: Monitor file access patterns and downloads
- **JWT Authentication**: Secure token-based authentication
- **Google OAuth**: Single sign-on integration
- **Private by Default**: All files are private unless explicitly shared

## Technology Stack

### Backend

- **Language**: Go 1.24+
- **API**: GraphQL with gqlgen
- **Database**: PostgreSQL 15+ with GORM
- **Storage**: MinIO (S3-compatible object storage)
- **Authentication**: JWT tokens + Google OAuth 2.0
- **Containerization**: Docker multi-stage builds

### Frontend

- **Framework**: Next.js 15 (App Router + Server Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand + React hooks
- **HTTP Client**: GraphQL with file upload support
- **UI Components**: Custom component library with accessibility

### Infrastructure & DevOps

- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 15 with optimized indexing
- **Object Storage**: MinIO with admin console
- **Networking**: Dedicated Docker network

## Prerequisites

### For Docker Setup (Recommended)

- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
- **Docker Compose** (included with Docker Desktop)
- **Git** for cloning the repository

### For Manual Setup

- **Go 1.24+** - [Download](https://golang.org/dl/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **PostgreSQL 15+** - [Download](https://www.postgresql.org/download/)
- **MinIO** - [Download](https://min.io/download)

## Development Setup

### Docker (Recommended)

```bash
# Clone and start all services
git clone https://github.com/userAdityaa/SnapVault.git
cd SafeVault
docker compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# MinIO Console: http://localhost:9001
```

### Manual Setup

For detailed backend and frontend setup instructions, see:

- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)

## Production Deployment

### Docker Production

```bash
# Clone repository
git clone https://github.com/userAdityaa/SnapVault.git
cd SafeVault

# Configure production environment
cp .env.production .env
# Edit .env with production values

# Deploy with Docker Compose
docker compose up -d --build
```

### Cloud Options

- **AWS**: ECS with RDS and S3
- **Google Cloud**: Cloud Run with Cloud SQL and Cloud Storage
- **DigitalOcean**: App Platform with Managed Database

## API Documentation

## Production Deployment

### Docker Production Setup

1. **Production Docker Compose**

   ```bash
   # Use production configuration
   docker compose -f docker-compose.prod.yml up -d
   ```

2. **Environment Configuration**

   ```bash
   # Set production environment variables
   cp .env.production .env
   # Edit with production credentials
   ```

3. **SSL & Reverse Proxy**

   ```nginx
   # nginx configuration example
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /graphql {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Cloud Deployment Options

- **AWS**: ECS with RDS and S3
- **Google Cloud**: Cloud Run with Cloud SQL and Cloud Storage
- **DigitalOcean**: App Platform with Managed Database
- **Self-hosted**: VPS with Docker Compose

## API Documentation

SafeVault provides a GraphQL API with comprehensive file management operations.

**Access GraphQL Playground**: http://localhost:8080/graphql

**Key Operations**: Authentication, File Management, Folder Operations, Sharing, Analytics, Admin features

For detailed API documentation, examples, and schema reference, see:

- [Complete API Documentation](./docs/README.md)
- [OpenAPI Specification](./docs/openapi.yaml)

## Configuration

### Environment Variables

Key environment variables for Docker setup:

**Backend**: Database connection, MinIO storage, JWT secrets, Google OAuth
**Frontend**: API endpoint, Google OAuth client ID

For complete environment variable reference, see:

- [Backend Configuration](./backend/README.md#configuration)
- [Frontend Configuration](./frontend/README.md#configuration)

### Storage Support

SafeVault supports S3-compatible storage: MinIO, AWS S3, Google Cloud Storage, DigitalOcean Spaces

## Contributing

### Storage Configuration

SafeVault supports any S3-compatible storage backend:

- **MinIO** (recommended for self-hosting)
- **AWS S3**
- **Google Cloud Storage** (with S3 compatibility)
- **DigitalOcean Spaces**
- **Backblaze B2**
- **Wasabi Hot Storage**

## Deployment

### Docker Production Deployment

1. **Production Docker setup**

   ```bash
   ## Contributing
   ```

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

### Development Guidelines

- Follow Go and TypeScript/React conventions
- Write tests for new features
- Update documentation for changes
- Use conventional commit format

## Support & Community

- **Documentation**: [API Documentation](./docs/)
- **Issues**: [GitHub Issues](https://github.com/userAdityaa/SafeVault/issues)
- **Discussions**: [GitHub Discussions](https://github.com/userAdityaa/SafeVault/discussions)

## Acknowledgments ```

2. **Reverse Proxy Configuration** (nginx example)

   ```nginx
   server {
       listen 80;
       server_name safevault.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /graphql {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. **SSL Certificate Setup**
   ```bash
   # Using Let's Encrypt with Certbot
   sudo certbot --nginx -d safevault.yourdomain.com
   ```

### Cloud Platform Deployments

#### AWS Deployment

- **ECS**: Use Docker containers with RDS PostgreSQL and S3 storage
- **Elastic Beanstalk**: Deploy with Docker Compose
- **EKS**: Kubernetes deployment with Helm charts

#### Google Cloud Platform

- **Cloud Run**: Serverless container deployment
- **GKE**: Kubernetes with Cloud SQL and Cloud Storage
- **Compute Engine**: VM-based deployment

#### DigitalOcean

- **App Platform**: PaaS deployment with managed database
- **Droplets**: VPS deployment with Docker Compose

### Manual Production Build

1. **Build frontend**

   ```bash
   cd frontend
   npm install
   npm run build
   npm run start
   ```

2. **Build and run backend**
   ```bash
   cd backend
   go build -o safevault main.go
   ./safevault
   ```

### Production Checklist

- [ ] Configure production database with proper credentials
- [ ] Set up SSL certificates for HTTPS
- [ ] Configure file storage (S3/MinIO) with proper backup
- [ ] Set up monitoring and logging
- [ ] Configure email service for sharing notifications
- [ ] Set up automated backups
- [ ] Configure rate limiting and security headers
- [ ] Test disaster recovery procedures

## Development

### Code Documentation

The codebase follows industry best practices for documentation:

- **Go Code**: Comprehensive GoDoc comments for all public functions, types, and packages
- **TypeScript/React**: JSDoc comments for components, functions, and interfaces
- **GraphQL Schema**: Detailed descriptions for all types, queries, and mutations
- **API Documentation**: Complete OpenAPI specification and examples

### Development Workflow

1. **Code Style**: Follow Go and TypeScript/React conventions
2. **Git Workflow**: Feature branches with pull requests
3. **Testing**: Unit tests for business logic (implement as needed)
4. **Documentation**: Update docs when adding new features

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes and commit**
   ```bash
   git commit -m "Add: your feature description"
   ```
4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Create a Pull Request**

### Development Guidelines

- Follow Go best practices for backend code
- Use TypeScript and React best practices for frontend
- Write tests for new features
- Update documentation for API changes
- Follow the existing code style and conventions

### Code Style

- **Backend**: Follow Go formatting with `gofmt`
- **Frontend**: Use Prettier and ESLint configurations
- **Commits**: Use conventional commit format
- **Documentation**: Update README and API docs for changes

## Security Considerations

- **Authentication**: JWT tokens with configurable expiration
- **Authorization**: Role-based access control for shared resources
- **File Validation**: MIME type validation and file size limits
- **SQL Injection**: Parameterized queries with GORM
- **XSS Protection**: Content Security Policy headers
- **Rate Limiting**: Implement rate limiting for production use
- **HTTPS**: Always use HTTPS in production
- **Secrets Management**: Use environment variables for sensitive data

## Monitoring & Analytics

- **File Activity Tracking**: Monitor file access patterns
- **Storage Analytics**: Track storage usage per user
- **Download Statistics**: Monitor file download patterns
- **Admin Dashboard**: Real-time system statistics
- **Error Logging**: Comprehensive error tracking

## Acknowledgments

- [gqlgen](https://gqlgen.com/) - GraphQL server generation for Go
- [GORM](https://gorm.io/) - Object-relational mapping for Go
- [Next.js](https://nextjs.org/) - React framework for production
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [MinIO](https://min.io/) - High-performance object storage

---

**SafeVault** - Built for secure and efficient file management.

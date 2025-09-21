# SafeVault Docker Setup

This directory contains a centralized Docker setup that allows you to run the entire SafeVault application (backend, frontend, database, and file storage) with a single command.

## Prerequisites

- Docker and Docker Compose installed on your system
- At least 4GB of available RAM
- Ports 3000, 8080, 5432, 9000, and 9001 available on your machine

## Quick Start

To start the entire application stack:

```bash
docker compose up -d
```

This will start:

- **PostgreSQL Database** on port 5432
- **MinIO Object Storage** on ports 9000 (API) and 9001 (Console)
- **Backend API** on port 8080
- **Frontend Web App** on port 3000

## Services

### Frontend (Next.js)

- **URL**: http://localhost:3000
- **Port**: 3000
- **Container**: `safevault_frontend`

### Backend (Go/GraphQL)

- **URL**: http://localhost:8080
- **Port**: 8080
- **Container**: `safevault_backend`

### Database (PostgreSQL)

- **Host**: localhost
- **Port**: 5432
- **Database**: safevault_db
- **Username**: safevault
- **Password**: safevaultpass
- **Container**: `safevault_postgres`

### File Storage (MinIO)

- **API URL**: http://localhost:9000
- **Console URL**: http://localhost:9001
- **Access Key**: minioadmin
- **Secret Key**: minioadmin
- **Container**: `safevault_minio`

## Useful Commands

### Start all services

```bash
docker compose up -d
```

### Stop all services

```bash
docker compose down
```

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

### Rebuild and restart

```bash
# Rebuild all images and restart
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build backend
```

### Clean up (removes containers, networks, and volumes)

```bash
docker compose down -v
```

## Development

For development, you might want to run services individually:

### Backend only (with dependencies)

```bash
docker compose up -d postgres minio backend
```

### Database and MinIO only

```bash
docker compose up -d postgres minio
```

## Troubleshooting

### Port conflicts

If you get port binding errors, check which processes are using the required ports:

```bash
lsof -i :3000  # Frontend
lsof -i :8080  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :9000  # MinIO API
lsof -i :9001  # MinIO Console
```

### Container logs

Check container logs for errors:

```bash
docker compose logs <service-name>
```

### Reset everything

To completely reset the application (including data):

```bash
docker compose down -v
docker system prune -f
docker compose up -d --build
```

## Environment Variables

The Docker setup uses the following default environment variables. You can override them by creating a `.env` file in the root directory:

```env
# Database
POSTGRES_USER=safevault
POSTGRES_PASSWORD=safevaultpass
POSTGRES_DB=safevault_db

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# Backend
PORT=8080

# Frontend
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://localhost:8080
```

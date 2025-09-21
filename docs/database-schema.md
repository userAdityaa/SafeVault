# SafeVault Database Schema Overview

This document provides a comprehensive overview of the SafeVault database schema, including all tables, relationships, indexes, and design patterns.

## Schema Architecture

SafeVault uses PostgreSQL with a carefully designed relational schema that supports:

- **File deduplication** through content hashing
- **Dual authentication** (email/password and Google OAuth)
- **Hierarchical folder organization**
- **Flexible sharing mechanisms** (user-to-user and public links)
- **Activity tracking and analytics**
- **Soft deletion and recovery**

## Core Tables

### 1. Users Table (`users`)

Stores traditional email/password user accounts.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

**Key Features:**

- UUID primary keys for security
- Unique email constraint
- Password hashing for security
- Timestamp tracking

### 2. Google Users Table (`google_users`)

Stores Google OAuth user accounts separately from traditional users.

```sql
CREATE TABLE google_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '' NOT NULL,
    picture TEXT DEFAULT '' NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

**Key Features:**

- Separate table for OAuth users
- Profile information (name, picture)
- Email uniqueness across the system

### 3. Files Table (`files`)

Central file storage with deduplication via SHA-256 hashing.

```sql
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash TEXT UNIQUE NOT NULL,
    storage_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    size BIGINT NOT NULL,
    ref_count INT DEFAULT 1,
    visibility TEXT DEFAULT 'private',
    created_at TIMESTAMP DEFAULT now()
);
```

**Key Features:**

- **Deduplication**: Unique hash constraint prevents duplicate files
- **Reference counting**: Tracks how many users have this file
- **Metadata**: Original filename, MIME type, file size
- **Visibility**: Private, shared, or public access levels

### 4. User Files Table (`user_files`)

Junction table linking users to files with ownership and organization.

```sql
CREATE TABLE user_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    file_id UUID NOT NULL,
    role TEXT DEFAULT 'owner',
    uploaded_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP,
    folder_id UUID,
    CONSTRAINT fk_user_files_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_files_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_files_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);
```

**Key Features:**

- **Many-to-many relationship** between users and files
- **Soft deletion** via `deleted_at` timestamp
- **Folder organization** via `folder_id`
- **Role-based access** (owner, viewer, etc.)

## Organization Tables

### 5. Folders Table (`folders`)

Hierarchical folder structure for file organization.

```sql
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    parent_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_folders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_folders_parent FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
    CONSTRAINT uq_folder_per_parent UNIQUE (user_id, parent_id, name)
);
```

**Key Features:**

- **Self-referencing hierarchy** via `parent_id`
- **User ownership** with cascade deletion
- **Unique naming** within parent folders
- **Root folders** have `parent_id = NULL`

## Sharing Tables

### 6. File Shares Table (`file_shares`)

Direct file sharing between users.

```sql
CREATE TABLE file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    shared_with_email TEXT NOT NULL,
    shared_with_id UUID,
    permission TEXT DEFAULT 'viewer',
    shared_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP,
    CONSTRAINT fk_file_shares_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    CONSTRAINT uq_file_shares_file_email UNIQUE (file_id, shared_with_email)
);
```

### 7. Folder Shares Table (`folder_shares`)

Folder sharing with inherited permissions.

```sql
CREATE TABLE folder_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    shared_with_email TEXT NOT NULL,
    shared_with_id UUID,
    permission TEXT DEFAULT 'viewer',
    shared_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP,
    CONSTRAINT fk_folder_shares_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    CONSTRAINT uq_folder_shares_folder_email UNIQUE (folder_id, shared_with_email)
);
```

**Key Features:**

- **Email-based sharing** (works with non-registered users)
- **Permission levels** (viewer, editor)
- **Expiration support** for time-limited access
- **Owner tracking** for management

## Public Link Tables

### 8. File Public Links Table (`file_public_links`)

Anonymous file access via public tokens.

```sql
CREATE TABLE file_public_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    file_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    download_count BIGINT DEFAULT 0,
    CONSTRAINT fk_fpl_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);
```

### 9. Folder Public Links Table (`folder_public_links`)

Anonymous folder access via public tokens.

```sql
CREATE TABLE folder_public_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    folder_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    access_count BIGINT DEFAULT 0,
    CONSTRAINT fk_fpl_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);
```

**Key Features:**

- **Unique tokens** for secure anonymous access
- **Expiration and revocation** support
- **Usage tracking** via download/access counts
- **Owner control** over public links

## Analytics Tables

### 10. File Downloads Table (`file_downloads`)

Detailed download tracking for analytics.

```sql
CREATE TABLE file_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    downloaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    download_type VARCHAR(20) NOT NULL CHECK (download_type IN ('shared', 'public')),
    share_token VARCHAR(255),
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(512) NOT NULL,
    downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 11. File Activities Table (`file_activities`)

User activity tracking (previews, downloads).

```sql
CREATE TABLE file_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL,
    user_id UUID NOT NULL,
    activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('preview', 'download')),
    activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_file_activities_file_id FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);
```

**Key Features:**

- **Download analytics** with IP and user agent tracking
- **Activity monitoring** for user behavior analysis
- **Type classification** (shared vs public access)
- **Privacy-conscious** design with optional user tracking

## User Preferences

### 12. Starred Items Table (`starred_items`)

User favorites for quick access.

```sql
CREATE TABLE starred_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('file', 'folder')),
    item_id UUID NOT NULL,
    starred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);
```

**Key Features:**

- **Polymorphic design** supports both files and folders
- **User-specific** favorites
- **Duplicate prevention** via unique constraint

## Indexes and Performance

### Primary Indexes

All tables use UUID primary keys with btree indexes for fast lookups.

### Secondary Indexes

**File Operations:**

```sql
-- File hash lookup for deduplication
CREATE UNIQUE INDEX idx_files_hash ON files(hash);

-- User file queries
CREATE INDEX idx_user_files_user ON user_files(user_id);
CREATE INDEX idx_user_files_folder ON user_files(folder_id);
```

**Sharing and Access:**

```sql
-- File sharing lookups
CREATE INDEX idx_file_shares_shared_with_email ON file_shares(shared_with_email);
CREATE INDEX idx_file_shares_owner_id ON file_shares(owner_id);

-- Public link token lookup
CREATE UNIQUE INDEX idx_file_public_links_token ON file_public_links(token);
```

**Analytics and Performance:**

```sql
-- Download tracking
CREATE INDEX idx_file_downloads_file_id ON file_downloads(file_id);
CREATE INDEX idx_file_downloads_owner_download_type ON file_downloads(owner_id, download_type);

-- Activity tracking
CREATE INDEX idx_file_activities_user_activity_at ON file_activities(user_id, activity_at DESC);
```

## Design Patterns

### 1. Deduplication Strategy

```
File Upload → SHA-256 Hash → Check files.hash →
  If exists: Increment ref_count, create user_files mapping
  If new: Store file, create files record, create user_files mapping
```

### 2. Soft Deletion

- Files are soft-deleted via `user_files.deleted_at` timestamp
- Physical files remain until `ref_count` reaches zero
- Allows for recovery and prevents accidental data loss

### 3. Dual User System

```
Authentication Type → Table
Email/Password → users
Google OAuth → google_users

Both can reference the same files via user_files.user_id
Application handles type detection via table lookup
```

### 4. Hierarchical Organization

```sql
-- Query folder hierarchy
WITH RECURSIVE folder_tree AS (
  SELECT id, name, parent_id, 0 as depth
  FROM folders
  WHERE user_id = $1 AND parent_id IS NULL

  UNION ALL

  SELECT f.id, f.name, f.parent_id, ft.depth + 1
  FROM folders f
  JOIN folder_tree ft ON f.parent_id = ft.id
)
SELECT * FROM folder_tree ORDER BY depth, name;
```

### 5. Permission Inheritance

- Folder shares apply to all contained files and subfolders
- File-specific shares override folder permissions
- Public links create anonymous access regardless of other permissions

## Security Considerations

### Data Protection

- **UUID IDs** prevent enumeration attacks
- **Password hashing** using bcrypt
- **Token-based** public access with expiration
- **IP tracking** for abuse detection

### Access Control

- **Owner validation** for all file operations
- **Email verification** for sharing
- **Cascade deletion** maintains referential integrity
- **Foreign key constraints** prevent orphaned records

### Privacy

- **Separate authentication** systems prevent cross-contamination
- **Optional user tracking** in analytics
- **Expiring shares** limit access windows
- **Revocation support** for immediate access removal

## Scalability Features

### Performance Optimizations

- **Strategic indexing** for common query patterns
- **Reference counting** for efficient file cleanup
- **Denormalized access counts** for quick statistics
- **Timestamp indexing** for chronological queries

### Storage Efficiency

- **File deduplication** reduces storage costs
- **Metadata separation** allows fast queries without file access
- **Soft deletion** reduces immediate I/O on deletions

## Migration Strategy

The schema uses numbered migration files (`001_*.sql` to `020_*.sql`) that:

1. **Enable extensions** (pgcrypto for UUIDs)
2. **Create core tables** (users, files, user_files)
3. **Add features incrementally** (folders, sharing, analytics)
4. **Maintain backwards compatibility** with `IF NOT EXISTS` clauses
5. **Include rollback instructions** for safe deployments

## Current Schema Statistics

Based on the 20 migration files:

- **12 Core tables** for data storage
- **40+ Indexes** for query optimization
- **25+ Foreign keys** for data integrity
- **10+ Unique constraints** for business rules
- **5+ Check constraints** for data validation

This schema design provides a robust foundation for SafeVault's file storage, sharing, and management capabilities while maintaining performance, security, and scalability.

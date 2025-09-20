package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/useradityaa/internal/models"
)

type FileActivityRepository interface {
	TrackFileActivity(ctx context.Context, userID, fileID uuid.UUID, activityType string) error
	GetRecentFileActivities(ctx context.Context, userID uuid.UUID, limit int) ([]models.RecentFileActivity, error)
}

type fileActivityRepository struct {
	db *pgxpool.Pool
}

func NewFileActivityRepository(db *pgxpool.Pool) FileActivityRepository {
	return &fileActivityRepository{db: db}
}

func (r *fileActivityRepository) TrackFileActivity(ctx context.Context, userID, fileID uuid.UUID, activityType string) error {
	query := `
		INSERT INTO file_activities (file_id, user_id, activity_type)
		VALUES ($1, $2, $3)
	`
	_, err := r.db.Exec(ctx, query, fileID, userID, activityType)
	if err != nil {
		return fmt.Errorf("failed to track file activity: %w", err)
	}
	return nil
}

func (r *fileActivityRepository) GetRecentFileActivities(ctx context.Context, userID uuid.UUID, limit int) ([]models.RecentFileActivity, error) {
	if limit <= 0 {
		limit = 10 // Default limit
	}

	query := `
		WITH latest_activities AS (
			SELECT 
				fa.file_id,
				fa.user_id,
				fa.activity_type as last_activity_type,
				fa.activity_at as last_activity_at,
				ROW_NUMBER() OVER (PARTITION BY fa.file_id ORDER BY fa.activity_at DESC) as rn
			FROM file_activities fa
			WHERE fa.user_id = $1
		),
		activity_counts AS (
			SELECT 
				file_id,
				COUNT(*) as activity_count
			FROM file_activities
			WHERE user_id = $1
			GROUP BY file_id
		)
		SELECT 
			la.file_id,
			la.user_id,
			la.last_activity_type,
			la.last_activity_at,
			COALESCE(ac.activity_count, 0) as activity_count
		FROM latest_activities la
		LEFT JOIN activity_counts ac ON la.file_id = ac.file_id
		WHERE la.rn = 1
		ORDER BY la.last_activity_at DESC
		LIMIT $2
	`

	rows, err := r.db.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent file activities: %w", err)
	}
	defer rows.Close()

	var activities []models.RecentFileActivity
	for rows.Next() {
		var activity models.RecentFileActivity
		err := rows.Scan(
			&activity.FileID,
			&activity.UserID,
			&activity.LastActivityType,
			&activity.LastActivityAt,
			&activity.ActivityCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan recent file activity: %w", err)
		}
		activities = append(activities, activity)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating recent file activities: %w", err)
	}

	return activities, nil
}

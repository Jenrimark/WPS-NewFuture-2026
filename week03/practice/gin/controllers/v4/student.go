package v4

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"studentsystem/models"
)

const cacheTTL = 5 * time.Minute

type StudentController struct {
	db  *gorm.DB
	rdb *redis.Client
}

func NewStudentController(db *gorm.DB, rdb *redis.Client) *StudentController {
	return &StudentController{db: db, rdb: rdb}
}

func parseIDFromParam(c *gin.Context) (int, error) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("id must be a positive integer")
	}
	return id, nil
}

func cacheKeyAllStudents() string { return "v4:students:all" }
func cacheKeyStudent(id int) string {
	return fmt.Sprintf("v4:students:%d", id)
}

func (ctl *StudentController) CreateStudent(c *gin.Context) {
	var student models.Student
	if err := c.ShouldBindJSON(&student); err != nil {
		log.Printf("[v4][POST /4/students] bind json failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid student json"})
		return
	}
	if student.ID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "id must be a positive integer"})
		return
	}

	if err := ctl.db.Create(&student).Error; err != nil {
		log.Printf("[v4][POST /4/students] create failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "create failed (maybe duplicated id)"})
		return
	}

	// Invalidate caches (list + single).
	ctx := c.Request.Context()
	if err := ctl.rdb.Del(ctx, cacheKeyAllStudents(), cacheKeyStudent(student.ID)).Err(); err != nil {
		log.Printf("[v4][POST /4/students] cache del failed: %v", err)
	}

	log.Printf("[v4][POST /4/students] created: %+v", student)
	c.JSON(http.StatusCreated, gin.H{"message": "学生创建成功", "student": student})
}

func (ctl *StudentController) ListStudents(c *gin.Context) {
	ctx := c.Request.Context()
	key := cacheKeyAllStudents()

	cached, err := ctl.rdb.Get(ctx, key).Bytes()
	if err == nil {
		var students []models.Student
		if err := json.Unmarshal(cached, &students); err == nil {
			log.Printf("[v4][GET /4/students] cache hit count=%d", len(students))
			c.JSON(http.StatusOK, students)
			return
		}
		log.Printf("[v4][GET /4/students] cache unmarshal failed: %v", err)
		_ = ctl.rdb.Del(ctx, key).Err()
	} else if !errors.Is(err, redis.Nil) {
		log.Printf("[v4][GET /4/students] redis get failed: %v", err)
	}

	var students []models.Student
	if err := ctl.db.Order("id asc").Find(&students).Error; err != nil {
		log.Printf("[v4][GET /4/students] db list failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "query failed"})
		return
	}

	raw, err := json.Marshal(students)
	if err == nil {
		if err := ctl.rdb.Set(ctx, key, raw, cacheTTL).Err(); err != nil {
			log.Printf("[v4][GET /4/students] redis set failed: %v", err)
		}
	} else {
		log.Printf("[v4][GET /4/students] marshal failed: %v", err)
	}

	log.Printf("[v4][GET /4/students] cache miss db count=%d", len(students))
	c.JSON(http.StatusOK, students)
}

func (ctl *StudentController) GetStudentByID(c *gin.Context) {
	id, err := parseIDFromParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	ctx := c.Request.Context()
	key := cacheKeyStudent(id)

	cached, err := ctl.rdb.Get(ctx, key).Bytes()
	if err == nil {
		var student models.Student
		if err := json.Unmarshal(cached, &student); err == nil {
			log.Printf("[v4][GET /4/students/%d] cache hit", id)
			c.JSON(http.StatusOK, student)
			return
		}
		log.Printf("[v4][GET /4/students/%d] cache unmarshal failed: %v", id, err)
		_ = ctl.rdb.Del(ctx, key).Err()
	} else if !errors.Is(err, redis.Nil) {
		log.Printf("[v4][GET /4/students/%d] redis get failed: %v", id, err)
	}

	var student models.Student
	err = ctl.db.First(&student, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
			return
		}
		log.Printf("[v4][GET /4/students/%d] db query failed: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal error"})
		return
	}

	raw, err := json.Marshal(student)
	if err == nil {
		if err := ctl.rdb.Set(ctx, key, raw, cacheTTL).Err(); err != nil {
			log.Printf("[v4][GET /4/students/%d] redis set failed: %v", id, err)
		}
	} else {
		log.Printf("[v4][GET /4/students/%d] marshal failed: %v", id, err)
	}

	log.Printf("[v4][GET /4/students/%d] cache miss db hit", id)
	c.JSON(http.StatusOK, student)
}

func (ctl *StudentController) UpdateStudent(c *gin.Context) {
	id, err := parseIDFromParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	var updated models.Student
	if err := c.ShouldBindJSON(&updated); err != nil {
		log.Printf("[v4][PUT /4/students/%d] bind json failed: %v", id, err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid student json"})
		return
	}
	updated.ID = id

	res := ctl.db.Model(&models.Student{}).Where("id = ?", id).Updates(map[string]any{
		"name":  updated.Name,
		"age":   updated.Age,
		"grade": updated.Grade,
	})
	if res.Error != nil {
		log.Printf("[v4][PUT /4/students/%d] db update failed: %v", id, res.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "update failed"})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
		return
	}

	ctx := c.Request.Context()
	if err := ctl.rdb.Del(ctx, cacheKeyAllStudents(), cacheKeyStudent(id)).Err(); err != nil {
		log.Printf("[v4][PUT /4/students/%d] cache del failed: %v", id, err)
	}

	log.Printf("[v4][PUT /4/students/%d] updated: %+v", id, updated)
	c.JSON(http.StatusOK, gin.H{"message": "学生更新成功", "student": updated})
}

func (ctl *StudentController) DeleteStudent(c *gin.Context) {
	id, err := parseIDFromParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	res := ctl.db.Delete(&models.Student{}, id)
	if res.Error != nil {
		log.Printf("[v4][DELETE /4/students/%d] db delete failed: %v", id, res.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "delete failed"})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
		return
	}

	ctx := c.Request.Context()
	if err := ctl.rdb.Del(ctx, cacheKeyAllStudents(), cacheKeyStudent(id)).Err(); err != nil {
		log.Printf("[v4][DELETE /4/students/%d] cache del failed: %v", id, err)
	}

	log.Printf("[v4][DELETE /4/students/%d] deleted", id)
	c.JSON(http.StatusOK, gin.H{"message": "学生删除成功"})
}

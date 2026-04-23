package v3

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"studentsystem/models"
)

type StudentController struct {
	db *gorm.DB
}

func NewStudentController(db *gorm.DB) *StudentController {
	return &StudentController{db: db}
}

func parseIDFromParam(c *gin.Context) (int, error) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return 0, fmt.Errorf("id must be a positive integer")
	}
	return id, nil
}

func (ctl *StudentController) CreateStudent(c *gin.Context) {
	var student models.Student
	if err := c.ShouldBindJSON(&student); err != nil {
		log.Printf("[v3][POST /3/students] bind json failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid student json"})
		return
	}
	if student.ID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "id must be a positive integer"})
		return
	}

	if err := ctl.db.Create(&student).Error; err != nil {
		log.Printf("[v3][POST /3/students] create failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "create failed (maybe duplicated id)"})
		return
	}

	log.Printf("[v3][POST /3/students] created: %+v", student)
	c.JSON(http.StatusCreated, gin.H{"message": "学生创建成功", "student": student})
}

func (ctl *StudentController) ListStudents(c *gin.Context) {
	var students []models.Student
	if err := ctl.db.Order("id asc").Find(&students).Error; err != nil {
		log.Printf("[v3][GET /3/students] list failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "query failed"})
		return
	}
	log.Printf("[v3][GET /3/students] list count=%d", len(students))
	c.JSON(http.StatusOK, students)
}

func (ctl *StudentController) GetStudentByID(c *gin.Context) {
	id, err := parseIDFromParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	var student models.Student
	err = ctl.db.First(&student, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
			return
		}
		log.Printf("[v3][GET /3/students/%d] query failed: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal error"})
		return
	}

	log.Printf("[v3][GET /3/students/%d] found: %+v", id, student)
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
		log.Printf("[v3][PUT /3/students/%d] bind json failed: %v", id, err)
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
		log.Printf("[v3][PUT /3/students/%d] update failed: %v", id, res.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "update failed"})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
		return
	}

	log.Printf("[v3][PUT /3/students/%d] updated: %+v", id, updated)
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
		log.Printf("[v3][DELETE /3/students/%d] delete failed: %v", id, res.Error)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "delete failed"})
		return
	}
	if res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
		return
	}

	log.Printf("[v3][DELETE /3/students/%d] deleted", id)
	c.JSON(http.StatusOK, gin.H{"message": "学生删除成功"})
}

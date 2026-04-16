package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"sync"

	"github.com/gin-gonic/gin"
	"studentsystem/models"
)

// StudentStore is an in-memory store (simulating a database).
type StudentStore struct {
	mu       sync.RWMutex
	students []models.Student
}

func NewStudentStore() *StudentStore {
	return &StudentStore{
		students: make([]models.Student, 0),
	}
}

func (s *StudentStore) List() []models.Student {
	s.mu.RLock()
	defer s.mu.RUnlock()
	copied := make([]models.Student, len(s.students))
	copy(copied, s.students)
	return copied
}

func (s *StudentStore) GetByID(id int) (models.Student, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, st := range s.students {
		if st.ID == id {
			return st, true
		}
	}
	return models.Student{}, false
}

func (s *StudentStore) Create(student models.Student) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.students = append(s.students, student)
}

func (s *StudentStore) UpdateByID(id int, updated models.Student) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.students {
		if s.students[i].ID == id {
			// Keep the ID consistent with URL param.
			updated.ID = id
			s.students[i] = updated
			return true
		}
	}
	return false
}

func (s *StudentStore) DeleteByID(id int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.students {
		if s.students[i].ID == id {
			s.students = append(s.students[:i], s.students[i+1:]...)
			return true
		}
	}
	return false
}

type StudentController struct {
	store *StudentStore
}

func NewStudentController(store *StudentStore) *StudentController {
	return &StudentController{store: store}
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
		fmt.Printf("[POST /students] bind json failed: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid student json"})
		return
	}

	if student.ID <= 0 {
		fmt.Printf("[POST /students] invalid id: %d\n", student.ID)
		c.JSON(http.StatusBadRequest, gin.H{"message": "id must be a positive integer"})
		return
	}

	ctl.store.Create(student)
	fmt.Printf("[POST /students] created: %+v\n", student)
	c.JSON(http.StatusCreated, gin.H{"message": "学生创建成功", "student": student})
}

func (ctl *StudentController) ListStudents(c *gin.Context) {
	students := ctl.store.List()
	fmt.Printf("[GET /students] list count=%d\n", len(students))
	// Always return an array (possibly empty).
	c.JSON(http.StatusOK, students)
}

func (ctl *StudentController) GetStudentByID(c *gin.Context) {
	id, err := parseIDFromParam(c)
	if err != nil {
		fmt.Printf("[GET /students/%s] invalid id: %v\n", c.Param("id"), err)
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	student, ok := ctl.store.GetByID(id)
	if !ok {
		fmt.Printf("[GET /students/%d] not found\n", id)
		c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
		return
	}

	fmt.Printf("[GET /students/%d] found: %+v\n", id, student)
	c.JSON(http.StatusOK, student)
}

func (ctl *StudentController) UpdateStudent(c *gin.Context) {
	id, err := parseIDFromParam(c)
	if err != nil {
		fmt.Printf("[PUT /students/%s] invalid id: %v\n", c.Param("id"), err)
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	var updated models.Student
	if err := c.ShouldBindJSON(&updated); err != nil {
		fmt.Printf("[PUT /students/%d] bind json failed: %v\n", id, err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid student json"})
		return
	}

	ok := ctl.store.UpdateByID(id, updated)
	if !ok {
		fmt.Printf("[PUT /students/%d] not found\n", id)
		c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
		return
	}

	// Fetch again for accurate returned state (optional, but helpful for debugging).
	student, _ := ctl.store.GetByID(id)
	fmt.Printf("[PUT /students/%d] updated: %+v\n", id, student)
	c.JSON(http.StatusOK, gin.H{"message": "学生更新成功", "student": student})
}

func (ctl *StudentController) DeleteStudent(c *gin.Context) {
	id, err := parseIDFromParam(c)
	if err != nil {
		fmt.Printf("[DELETE /students/%s] invalid id: %v\n", c.Param("id"), err)
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	ok := ctl.store.DeleteByID(id)
	if !ok {
		fmt.Printf("[DELETE /students/%d] not found\n", id)
		c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
		return
	}

	fmt.Printf("[DELETE /students/%d] deleted\n", id)
	c.JSON(http.StatusOK, gin.H{"message": "学生删除成功"})
}


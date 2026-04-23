package v2

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	sq "github.com/Masterminds/squirrel"
	"github.com/gin-gonic/gin"
	"studentsystem/models"
)

type StudentController struct {
	db *sql.DB
	sb sq.StatementBuilderType
}

func NewStudentController(db *sql.DB) *StudentController {
	return &StudentController{
		db: db,
		sb: sq.StatementBuilder.PlaceholderFormat(sq.Question),
	}
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
		log.Printf("[v2][POST /2/students] bind json failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid student json"})
		return
	}
	if student.ID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "id must be a positive integer"})
		return
	}

	q := ctl.sb.Insert("students").
		Columns("id", "name", "age", "grade").
		Values(student.ID, student.Name, student.Age, student.Grade)

	sqlStr, args, err := q.ToSql()
	if err != nil {
		log.Printf("[v2][POST /2/students] build sql failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal error"})
		return
	}

	if _, err := ctl.db.Exec(sqlStr, args...); err != nil {
		log.Printf("[v2][POST /2/students] exec failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "create failed (maybe duplicated id)"})
		return
	}

	log.Printf("[v2][POST /2/students] created: %+v", student)
	c.JSON(http.StatusCreated, gin.H{"message": "学生创建成功", "student": student})
}

func (ctl *StudentController) ListStudents(c *gin.Context) {
	q := ctl.sb.Select("id", "name", "age", "grade").From("students").OrderBy("id ASC")
	sqlStr, args, err := q.ToSql()
	if err != nil {
		log.Printf("[v2][GET /2/students] build sql failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal error"})
		return
	}

	rows, err := ctl.db.Query(sqlStr, args...)
	if err != nil {
		log.Printf("[v2][GET /2/students] query failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "query failed"})
		return
	}
	defer rows.Close()

	students := make([]models.Student, 0)
	for rows.Next() {
		var st models.Student
		if err := rows.Scan(&st.ID, &st.Name, &st.Age, &st.Grade); err != nil {
			log.Printf("[v2][GET /2/students] scan failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"message": "internal error"})
			return
		}
		students = append(students, st)
	}
	if err := rows.Err(); err != nil {
		log.Printf("[v2][GET /2/students] rows error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal error"})
		return
	}

	log.Printf("[v2][GET /2/students] list count=%d", len(students))
	c.JSON(http.StatusOK, students)
}

func (ctl *StudentController) GetStudentByID(c *gin.Context) {
	id, err := parseIDFromParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	q := ctl.sb.Select("id", "name", "age", "grade").From("students").Where(sq.Eq{"id": id}).Limit(1)
	sqlStr, args, err := q.ToSql()
	if err != nil {
		log.Printf("[v2][GET /2/students/%d] build sql failed: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal error"})
		return
	}

	var st models.Student
	if err := ctl.db.QueryRow(sqlStr, args...).Scan(&st.ID, &st.Name, &st.Age, &st.Grade); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
			return
		}
		log.Printf("[v2][GET /2/students/%d] query failed: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal error"})
		return
	}

	log.Printf("[v2][GET /2/students/%d] found: %+v", id, st)
	c.JSON(http.StatusOK, st)
}

func (ctl *StudentController) UpdateStudent(c *gin.Context) {
	id, err := parseIDFromParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	var updated models.Student
	if err := c.ShouldBindJSON(&updated); err != nil {
		log.Printf("[v2][PUT /2/students/%d] bind json failed: %v", id, err)
		c.JSON(http.StatusBadRequest, gin.H{"message": "invalid student json"})
		return
	}
	updated.ID = id

	q := ctl.sb.Update("students").
		Set("name", updated.Name).
		Set("age", updated.Age).
		Set("grade", updated.Grade).
		Where(sq.Eq{"id": id})

	sqlStr, args, err := q.ToSql()
	if err != nil {
		log.Printf("[v2][PUT /2/students/%d] build sql failed: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal error"})
		return
	}

	res, err := ctl.db.Exec(sqlStr, args...)
	if err != nil {
		log.Printf("[v2][PUT /2/students/%d] exec failed: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "update failed"})
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
		return
	}

	log.Printf("[v2][PUT /2/students/%d] updated: %+v", id, updated)
	c.JSON(http.StatusOK, gin.H{"message": "学生更新成功", "student": updated})
}

func (ctl *StudentController) DeleteStudent(c *gin.Context) {
	id, err := parseIDFromParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	q := ctl.sb.Delete("students").Where(sq.Eq{"id": id})
	sqlStr, args, err := q.ToSql()
	if err != nil {
		log.Printf("[v2][DELETE /2/students/%d] build sql failed: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "internal error"})
		return
	}

	res, err := ctl.db.Exec(sqlStr, args...)
	if err != nil {
		log.Printf("[v2][DELETE /2/students/%d] exec failed: %v", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "delete failed"})
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "学生不存在"})
		return
	}

	log.Printf("[v2][DELETE /2/students/%d] deleted", id)
	c.JSON(http.StatusOK, gin.H{"message": "学生删除成功"})
}

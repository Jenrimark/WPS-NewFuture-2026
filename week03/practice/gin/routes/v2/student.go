package v2

import (
	"github.com/gin-gonic/gin"
	"studentsystem/controllers/v2"
)

// RegisterStudentRoutes registers v2 student routes under /2.
func RegisterStudentRoutes(r *gin.Engine, ctl *v2.StudentController) {
	group := r.Group("/2")
	students := group.Group("/students")
	{
		students.POST("", ctl.CreateStudent) // POST /2/students
		students.GET("", ctl.ListStudents)   // GET /2/students
	}

	group.GET("/students/:id", ctl.GetStudentByID)   // GET /2/students/:id
	group.PUT("/students/:id", ctl.UpdateStudent)    // PUT /2/students/:id
	group.DELETE("/students/:id", ctl.DeleteStudent) // DELETE /2/students/:id
}

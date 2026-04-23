package v3

import (
	"github.com/gin-gonic/gin"
	"studentsystem/controllers/v3"
)

// RegisterStudentRoutes registers v3 student routes under /3.
func RegisterStudentRoutes(r *gin.Engine, ctl *v3.StudentController) {
	group := r.Group("/3")
	students := group.Group("/students")
	{
		students.POST("", ctl.CreateStudent) // POST /3/students
		students.GET("", ctl.ListStudents)   // GET /3/students
	}

	group.GET("/students/:id", ctl.GetStudentByID)   // GET /3/students/:id
	group.PUT("/students/:id", ctl.UpdateStudent)    // PUT /3/students/:id
	group.DELETE("/students/:id", ctl.DeleteStudent) // DELETE /3/students/:id
}

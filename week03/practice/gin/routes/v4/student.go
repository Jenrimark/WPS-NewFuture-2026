package v4

import (
	"github.com/gin-gonic/gin"
	"studentsystem/controllers/v4"
)

// RegisterStudentRoutes registers v4 student routes under /4.
func RegisterStudentRoutes(r *gin.Engine, ctl *v4.StudentController) {
	group := r.Group("/4")
	students := group.Group("/students")
	{
		students.POST("", ctl.CreateStudent) // POST /4/students
		students.GET("", ctl.ListStudents)   // GET /4/students
	}

	group.GET("/students/:id", ctl.GetStudentByID)   // GET /4/students/:id
	group.PUT("/students/:id", ctl.UpdateStudent)    // PUT /4/students/:id
	group.DELETE("/students/:id", ctl.DeleteStudent) // DELETE /4/students/:id
}

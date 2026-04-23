package routes

import (
	"github.com/gin-gonic/gin"
	"studentsystem/controllers"
)

// RegisterStudentRoutes registers all student-related routes.
func RegisterStudentRoutes(r *gin.Engine, ctl *controllers.StudentController) {
	// Collection routes.
	students := r.Group("/students")
	{
		students.POST("", ctl.CreateStudent) // POST /students
		students.GET("", ctl.ListStudents)   // GET /students
	}

	// Single resource routes.
	r.GET("/students/:id", ctl.GetStudentByID)   // GET /students/:id
	r.PUT("/students/:id", ctl.UpdateStudent)    // PUT /students/:id
	r.DELETE("/students/:id", ctl.DeleteStudent) // DELETE /students/:id
}

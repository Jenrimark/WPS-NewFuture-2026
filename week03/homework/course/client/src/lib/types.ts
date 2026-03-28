export interface ApiResp<T> {
  code: number;
  msg: string;
  data: T;
}

export interface UserInfo {
  id: number;
  username: string;
  name: string;
  role: string;
}

export interface Course {
  id: number;
  name: string;
  description: string;
  instructor: string;
  category: string;
  status: 'published' | 'draft';
  student_count: number;
  lesson_count: number;
}

export interface Student {
  id: number;
  name: string;
  student_no: string;
  class_name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  course_ids: number[];
}

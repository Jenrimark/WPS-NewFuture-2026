import db from './db.js';
import bcrypt from 'bcryptjs';

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      avatar TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      instructor TEXT DEFAULT '',
      cover TEXT DEFAULT '',
      category TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      student_count INTEGER DEFAULT 0,
      lesson_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      student_no TEXT UNIQUE NOT NULL,
      class_name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      course_ids TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS learning_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      course_id INTEGER,
      date TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);

  seedData();
}

function syncCourseStudentCounts() {
  const courses = db.prepare('SELECT id FROM courses').all();
  const students = db.prepare('SELECT course_ids FROM students').all();
  const upd = db.prepare('UPDATE courses SET student_count = ? WHERE id = ?');
  for (const course of courses) {
    const count = students.filter((s) => {
      const ids = JSON.parse(s.course_ids || '[]');
      return ids.includes(course.id);
    }).length;
    upd.run(count, course.id);
  }
}

function buildCourses() {
  const instructors = ['张老师', '李老师', '王老师', '赵老师', '孙老师', '周老师', '吴老师', '郑老师', '钱老师', '冯老师'];
  const categories = ['前端开发', '后端开发', '数据库', '运维', '数据科学', '工具', '移动开发', '人工智能'];
  const base = [
    { name: 'React 基础入门', description: '从零开始学习 React 框架，掌握组件化开发思想', instructor: '张老师', category: '前端开发', status: 'published', lesson_count: 12 },
    { name: 'Node.js 服务端开发', description: '学习 Node.js 构建高性能服务端应用', instructor: '李老师', category: '后端开发', status: 'published', lesson_count: 10 },
    { name: 'Vue 3 实战项目', description: '通过实际项目掌握 Vue 3 Composition API', instructor: '王老师', category: '前端开发', status: 'published', lesson_count: 15 },
    { name: 'TypeScript 高级编程', description: '深入理解 TypeScript 类型系统与高级特性', instructor: '赵老师', category: '前端开发', status: 'published', lesson_count: 8 },
    { name: 'MySQL 数据库设计', description: '数据库设计规范与 SQL 优化实践', instructor: '孙老师', category: '数据库', status: 'published', lesson_count: 9 },
    { name: 'Docker 容器化部署', description: '学习 Docker 容器技术与微服务部署', instructor: '周老师', category: '运维', status: 'draft', lesson_count: 6 },
    { name: 'Python 数据分析', description: '使用 Python 进行数据清洗、分析与可视化', instructor: '吴老师', category: '数据科学', status: 'published', lesson_count: 11 },
    { name: 'Git 版本控制', description: '掌握 Git 工作流与团队协作开发', instructor: '郑老师', category: '工具', status: 'published', lesson_count: 7 },
    { name: 'Webpack 工程化实践', description: '深入学习 Webpack 配置与前端工程化体系', instructor: '张老师', category: '前端开发', status: 'published', lesson_count: 9 },
    { name: 'Redis 缓存技术', description: '掌握 Redis 数据结构、持久化与分布式缓存方案', instructor: '李老师', category: '数据库', status: 'published', lesson_count: 8 },
    { name: 'Linux 运维基础', description: '学习 Linux 常用命令、Shell 脚本与服务器管理', instructor: '周老师', category: '运维', status: 'draft', lesson_count: 10 },
    { name: 'Jest 单元测试', description: '前端自动化测试框架 Jest 与 React Testing Library 实战', instructor: '赵老师', category: '前端开发', status: 'published', lesson_count: 6 },
    { name: 'MongoDB 入门到实战', description: '学习 NoSQL 数据库 MongoDB 的 CRUD 与聚合操作', instructor: '孙老师', category: '数据库', status: 'published', lesson_count: 10 },
  ];

  const extraTitles = [
    'Spring Boot 与 RESTful API', 'GraphQL 接口设计', 'Kubernetes 集群管理', '微服务与 API 网关',
    'Flutter 跨平台开发', 'SwiftUI 界面开发', 'Kotlin 与 Android 进阶', '微信小程序开发',
    'Elasticsearch 检索实战', 'Kafka 消息队列', 'RabbitMQ 异步通信', 'Nginx 与负载均衡',
    'Prometheus 与 Grafana 监控', 'CI/CD 与 Jenkins', 'Terraform 基础设施即代码', '计算机网络与安全基础',
    '算法与数据结构精讲', '操作系统原理导读', '软件工程与需求分析', 'UML 与系统设计',
    '机器学习入门', '深度学习与 PyTorch', '计算机视觉基础', '自然语言处理概览',
    'Go 语言高并发服务', 'Rust 系统编程导论', 'C# 与 .NET Core', 'PHP 与现代 Laravel',
    'HTML5 与语义化布局', 'CSS 进阶与动画', 'Sass 与工程化样式', 'Vite 与现代化构建',
    'Next.js 全栈应用', 'Nuxt 3 服务端渲染', 'Electron 桌面应用', 'WebAssembly 入门',
    '接口测试与 Postman', '敏捷开发与 Scrum', '技术写作与文档规范', '开源协议与合规',
  ];

  const extra = extraTitles.map((name, i) => ({
    name,
    description: `课程围绕「${name}」展开，包含概念讲解、示例演练与常见场景排错。`,
    instructor: instructors[i % instructors.length],
    category: categories[i % categories.length],
    status: i % 11 === 0 ? 'draft' : 'published',
    lesson_count: 6 + (i % 12),
  }));

  return [...base, ...extra].map((c) => ({
    ...c,
    student_count: 0,
  }));
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return;

  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)
  `).run('admin', hashedPassword, '管理员', 'admin');

  const courses = buildCourses();
  const insertCourse = db.prepare(`
    INSERT INTO courses (name, description, instructor, category, status, student_count, lesson_count)
    VALUES (@name, @description, @instructor, @category, @status, @student_count, @lesson_count)
  `);
  for (const course of courses) {
    insertCourse.run(course);
  }

  const courseRows = db.prepare('SELECT id FROM courses ORDER BY id').all();
  const courseIds = courseRows.map((r) => r.id);
  const courseCount = courseIds.length;

  const classNames = [
    '前端2401班', '前端2402班', '后端2401班', '全栈2401班',
    '移动2401班', '数据2401班', '人工智能2401班', '软件工程2401班',
  ];

  const surnames = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董潘袁蔡蒋余于杜叶程魏苏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤'.split('');
  const given = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '霞', '平', '刚', '辉', '鹏', '玲', '浩', '宇', '欣', '婷', '凯', '雪', '博'];

  const STUDENT_TARGET = 120;
  const insertStudent = db.prepare(`
    INSERT INTO students (name, student_no, class_name, phone, email, status, course_ids)
    VALUES (@name, @student_no, @class_name, @phone, @email, @status, @course_ids)
  `);

  for (let i = 0; i < STUDENT_TARGET; i++) {
    const name = surnames[i % surnames.length] + given[(i * 3) % given.length] + given[(i * 5) % given.length];
    const pickCount = Math.min(courseCount, Math.floor(Math.random() * 4) + 1);
    const chosen = [];
    const pool = [...courseIds];
    for (let k = 0; k < pickCount && pool.length; k++) {
      const idx = Math.floor(Math.random() * pool.length);
      chosen.push(pool.splice(idx, 1)[0]);
    }
    chosen.sort((a, b) => a - b);

    insertStudent.run({
      name,
      student_no: `2024${String(i + 1).padStart(5, '0')}`,
      class_name: classNames[i % classNames.length],
      phone: `138${String(10000000 + ((i * 7919) % 90000000)).padStart(8, '0')}`,
      email: `stu${String(i + 1).padStart(4, '0')}@campus.example.edu`,
      status: i % 9 === 0 ? 'inactive' : 'active',
      course_ids: JSON.stringify(chosen),
    });
  }

  syncCourseStudentCounts();

  const studentRows = db.prepare('SELECT id FROM students ORDER BY id').all();
  const studentIds = studentRows.map((r) => r.id);
  const studentTotal = studentIds.length;

  const insertRecord = db.prepare(`
    INSERT INTO learning_records (student_id, course_id, date, duration)
    VALUES (@student_id, @course_id, @date, @duration)
  `);

  const today = new Date();
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    const recordCount = Math.floor(Math.random() * 18) + 22;
    for (let j = 0; j < recordCount; j++) {
      insertRecord.run({
        student_id: studentIds[Math.floor(Math.random() * studentTotal)],
        course_id: courseIds[Math.floor(Math.random() * courseCount)],
        date: dateStr,
        duration: Math.floor(Math.random() * 90) + 10,
      });
    }
  }

  console.log(
    `Mock 数据初始化完成：课程 ${courseCount} 门，学生 ${studentTotal} 人，学习记录约 ${7 * 22}～${7 * 40} 条`
  );
}

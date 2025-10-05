const { db } = require('../src/lib/db');
const bcrypt = require('bcryptjs');

function seed() {
  db.exec('DELETE FROM users; DELETE FROM creator_applications; DELETE FROM courses; DELETE FROM lessons; DELETE FROM enrollments; DELETE FROM lesson_progress; DELETE FROM certificates;');

  const adminPass = bcrypt.hashSync('admin123', 10);
  const creatorPass = bcrypt.hashSync('creator123', 10);
  const learnerPass = bcrypt.hashSync('learner123', 10);

  const adminId = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run('admin@example.com', adminPass, 'Admin').lastInsertRowid;
  const creatorId = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run('creator@example.com', creatorPass, 'Creator').lastInsertRowid;
  const learnerId = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run('learner@example.com', learnerPass, 'Learner').lastInsertRowid;

  const courseId = db.prepare('INSERT INTO courses (creator_id, title, description, status) VALUES (?, ?, ?, ?)').run(creatorId, 'Intro to MicroCourses', 'Learn the basics', 'published').lastInsertRowid;

  db.prepare('INSERT INTO lessons (course_id, title, content, transcript, order_index) VALUES (?, ?, ?, ?, ?)')
    .run(courseId, 'Welcome', 'This is the welcome lesson.', 'Summary: This is the welcome lesson.\nKeywords: welcome, lesson', 1);
  db.prepare('INSERT INTO lessons (course_id, title, content, transcript, order_index) VALUES (?, ?, ?, ?, ?)')
    .run(courseId, 'Deep Dive', 'We dive deeper into concepts.', 'Summary: We dive deeper into concepts.\nKeywords: dive, concepts', 2);

  console.log('Seeded. Users: admin@example.com/admin123, creator@example.com/creator123, learner@example.com/learner123');
}

seed();

CREATE DATABASE studentdb;
\connect studentdb;

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(10) UNIQUE NOT NULL,
  fullname VARCHAR(100) NOT NULL,
  dob DATE,
  major VARCHAR(50)
);

INSERT INTO students(student_id, fullname, dob, major) VALUES
  ('SV001', 'Nguyen Van A', '2002-03-15', 'Computer Science'),
  ('SV002', 'Tran Thi B', '2002-06-20', 'Software Engineering'),
  ('SV003', 'Le Van C', '2002-09-10', 'Information Systems');
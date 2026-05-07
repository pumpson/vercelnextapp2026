
import mysql from 'mysql2/promise';

export async function getConnection() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'password',
    database: 'todo_app',
    port: 3306,
    charset: 'utf8mb4',
  });
  return connection;
}

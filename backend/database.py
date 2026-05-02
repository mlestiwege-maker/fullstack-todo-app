from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "todo_app.db"


def get_connection() -> sqlite3.Connection:
	connection = sqlite3.connect(DB_PATH)
	connection.row_factory = sqlite3.Row
	connection.execute("PRAGMA foreign_keys = ON")
	return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                title TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
            )
            """
        )


def user_exists(username: str) -> bool:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT 1 FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        return row is not None


def create_user(username: str, password_hash: str) -> None:
    with get_connection() as connection:
        connection.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, password_hash),
        )


def get_password_hash(username: str) -> str | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT password_hash FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        return None if row is None else str(row["password_hash"])


def list_todos(username: str) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, title, completed FROM todos WHERE username = ? ORDER BY id DESC",
            (username,),
        ).fetchall()
        return [
            {"id": row["id"], "title": row["title"], "completed": bool(row["completed"])}
            for row in rows
        ]


def create_todo(username: str, title: str) -> dict:
    with get_connection() as connection:
        cursor = connection.execute(
            "INSERT INTO todos (username, title, completed) VALUES (?, ?, 0)",
            (username, title),
        )
        todo_id = cursor.lastrowid
        row = connection.execute(
            "SELECT id, title, completed FROM todos WHERE id = ?",
            (todo_id,),
        ).fetchone()
        assert row is not None
        return {"id": row["id"], "title": row["title"], "completed": bool(row["completed"])}


def update_todo(username: str, todo_id: int, *, title: str | None = None, completed: bool | None = None) -> dict | None:
    updates: list[str] = []
    values: list[object] = []

    if title is not None:
        updates.append("title = ?")
        values.append(title)
    if completed is not None:
        updates.append("completed = ?")
        values.append(1 if completed else 0)

    if not updates:
        return get_todo(username, todo_id)

    values.extend([username, todo_id])
    with get_connection() as connection:
        connection.execute(
            f"UPDATE todos SET {', '.join(updates)} WHERE username = ? AND id = ?",
            tuple(values),
        )
    return get_todo(username, todo_id)


def get_todo(username: str, todo_id: int) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, title, completed FROM todos WHERE username = ? AND id = ?",
            (username, todo_id),
        ).fetchone()
        if row is None:
            return None
        return {"id": row["id"], "title": row["title"], "completed": bool(row["completed"])}


def delete_todo(username: str, todo_id: int) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM todos WHERE username = ? AND id = ?",
            (username, todo_id),
        )
        return cursor.rowcount > 0
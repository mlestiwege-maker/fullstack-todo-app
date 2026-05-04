"""
Unit tests for todo database operations.
"""
import pytest
import os
import tempfile
from pathlib import Path
import database


@pytest.fixture(autouse=True)
def temp_db():
    """Use a temporary database for each test."""
    # Create temp directory and set DB_PATH to temp location
    with tempfile.TemporaryDirectory() as tmpdir:
        original_db_path = database.DB_PATH
        database.DB_PATH = Path(tmpdir) / "test.db"
        
        # Initialize the test database
        database.init_db()
        
        yield
        
        # Restore original path
        database.DB_PATH = original_db_path


def test_create_and_list_todos():
    """Test creating and listing todos."""
    username = "test_user"
    
    # Create a user first
    database.create_user(username, "hashed_password")
    
    # Initially there should be no todos
    todos = database.list_todos(username)
    assert len(todos) == 0
    
    # Create a todo
    todo = database.create_todo(username, "Test task")
    assert todo["title"] == "Test task"
    assert todo["completed"] is False
    assert todo["id"] == 1
    
    # List todos and verify
    todos = database.list_todos(username)
    assert len(todos) == 1
    assert todos[0]["title"] == "Test task"


def test_update_todo_title():
    """Test updating a todo title."""
    username = "test_user"
    database.create_user(username, "hashed_password")
    
    todo = database.create_todo(username, "Original title")
    todo_id = todo["id"]
    
    # Update the title
    updated = database.update_todo(username, todo_id, title="Updated title")
    assert updated["title"] == "Updated title"
    assert updated["completed"] is False
    
    # Verify the change persisted
    retrieved = database.get_todo(username, todo_id)
    assert retrieved["title"] == "Updated title"


def test_update_todo_completed():
    """Test marking a todo as completed."""
    username = "test_user"
    database.create_user(username, "hashed_password")
    
    todo = database.create_todo(username, "Task to complete")
    todo_id = todo["id"]
    
    # Mark as completed
    updated = database.update_todo(username, todo_id, completed=True)
    assert updated["completed"] is True
    assert updated["title"] == "Task to complete"
    
    # Verify it's still there but completed
    todos = database.list_todos(username)
    assert len(todos) == 1
    assert todos[0]["completed"] is True


def test_delete_todo():
    """Test deleting a todo."""
    username = "test_user"
    database.create_user(username, "hashed_password")
    
    todo = database.create_todo(username, "Task to delete")
    todo_id = todo["id"]
    
    # Verify it exists
    assert database.get_todo(username, todo_id) is not None
    
    # Delete it
    result = database.delete_todo(username, todo_id)
    assert result is True
    
    # Verify it's gone
    assert database.get_todo(username, todo_id) is None
    assert len(database.list_todos(username)) == 0


def test_get_nonexistent_todo():
    """Test getting a todo that doesn't exist."""
    username = "test_user"
    database.create_user(username, "hashed_password")
    
    result = database.get_todo(username, 999)
    assert result is None


def test_delete_nonexistent_todo():
    """Test deleting a todo that doesn't exist."""
    username = "test_user"
    database.create_user(username, "hashed_password")
    
    result = database.delete_todo(username, 999)
    assert result is False


def test_todos_isolated_by_username():
    """Test that todos are isolated per user."""
    user1 = "user1"
    user2 = "user2"
    
    database.create_user(user1, "pass1")
    database.create_user(user2, "pass2")
    
    # Create todos for each user
    database.create_todo(user1, "User1 task")
    database.create_todo(user2, "User2 task")
    
    # Verify they don't see each other's todos
    user1_todos = database.list_todos(user1)
    user2_todos = database.list_todos(user2)
    
    assert len(user1_todos) == 1
    assert len(user2_todos) == 1
    assert user1_todos[0]["title"] == "User1 task"
    assert user2_todos[0]["title"] == "User2 task"

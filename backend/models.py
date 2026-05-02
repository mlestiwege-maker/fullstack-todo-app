from pydantic import BaseModel, Field

class User(BaseModel):
    username: str
    password: str


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class TodoUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    completed: bool | None = None


class TodoItem(BaseModel):
    id: int
    title: str
    completed: bool = False
from typing import Any, Generic, TypeVar
from sqlalchemy.orm import Session
from app.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    def __init__(self, model: type[ModelT], db: Session) -> None:
        self.model = model
        self.db = db

    def get_by_id(self, id: int) -> ModelT | None:
        return self.db.get(self.model, id)

    def list_all(self, skip: int = 0, limit: int = 100) -> list[ModelT]:
        from sqlalchemy import select
        return list(self.db.execute(select(self.model).offset(skip).limit(limit)).scalars().all())

    def create(self, obj: ModelT) -> ModelT:
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def update(self, obj: ModelT, data: dict[str, Any]) -> ModelT:
        for key, value in data.items():
            setattr(obj, key, value)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def delete(self, obj: ModelT) -> None:
        self.db.delete(obj)
        self.db.commit()

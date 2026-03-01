"""
Lumina Backend — Database Configuration

Sets up an asynchronous SQLAlchemy engine for SQLite.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# SQLite connection string for aiosqlite
DATABASE_URL = "sqlite+aiosqlite:///./lumina_jobs.db"

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}, # Needed for SQLite
)

# Create session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

async def get_db_session() -> AsyncSession: # type: ignore
    """Dependency for dependency injection in endpoints if needed."""
    async with async_session() as session:
        yield session # type: ignore

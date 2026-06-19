import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# ── Import all models so Alembic's autogenerate can detect them ───────────
from app.models import *  # noqa: F401, F403
from app.core.database import Base
from app.core.config import settings

# Alembic Config object (gives access to .ini values)
config = context.config

# Override the sqlalchemy.url from settings (respects .env file)
config.set_main_option("sqlalchemy.url", settings.SYNC_DATABASE_URL)

# Logging configuration from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata that autogenerate will inspect
target_metadata = Base.metadata


# ────────────────────────────────────────────────────────────────────────────
#  Offline mode (generate SQL without connecting)
# ────────────────────────────────────────────────────────────────────────────


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine.
    By skipping the Engine creation we don't even need a DBAPI to be available.
    Calls to context.execute() emit the given string to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ────────────────────────────────────────────────────────────────────────────
#  Online mode (connect and migrate)
# ────────────────────────────────────────────────────────────────────────────


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.

    In this scenario we need to create an Engine and associate a connection
    with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

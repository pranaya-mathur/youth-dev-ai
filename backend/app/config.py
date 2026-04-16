from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    """Optional; default uses OpenAI server default for /v1/moderations."""
    openai_moderation_model: str | None = None

    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    """Explicit `groq` or `openai`; if unset, Groq is preferred when `groq_api_key` is set."""
    llm_provider: str | None = None

    allowed_origins: str = "http://localhost:3000"

    """postgresql+asyncpg://user:pass@host:5432/dbname — enables server persistence."""
    database_url: str | None = None

    """When false (default), profile/coach require a real LLM key—no mock JSON or canned coach lines."""
    allow_llm_demo: bool = False

    """If both are set (and valid), POST /api/internal/maintenance/purge-inactive-users removes users
    inactive longer than this many days (based on last_seen_at, else created_at)."""
    data_retention_days: int | None = Field(default=None, ge=1, le=3650)
    maintenance_secret: str | None = None

    crisis_webhook_url: str | None = None

    @field_validator("openai_api_key", "groq_api_key", mode="before")
    @classmethod
    def strip_api_keys(cls, v: object) -> object:
        """Treat blank / whitespace-only env values as unset so OpenAI is not skipped for a stray GROQ line."""
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s or None
        return v

    @field_validator("allow_llm_demo", mode="before")
    @classmethod
    def parse_allow_llm_demo(cls, v: object) -> bool:
        if v is None or v == "":
            return False
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.strip().lower() in ("1", "true", "yes", "on")
        return bool(v)

    @field_validator("data_retention_days", mode="before")
    @classmethod
    def empty_retention_days(cls, v: object) -> object:
        if v == "" or v is None:
            return None
        return v

    @field_validator("maintenance_secret", mode="before")
    @classmethod
    def strip_secret(cls, v: object) -> object:
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s or None
        return v

    @model_validator(mode="after")
    def retention_and_secret_together(self):
        has_days = self.data_retention_days is not None
        has_secret = bool(self.maintenance_secret)
        if has_days != has_secret:
            raise ValueError(
                "Set both DATA_RETENTION_DAYS and MAINTENANCE_SECRET together, or omit both."
            )
        if has_secret and len(self.maintenance_secret or "") < 12:
            raise ValueError("MAINTENANCE_SECRET must be at least 12 characters when set.")
        return self

    def effective_llm_provider(self) -> str | None:
        """Resolve LLM for profile/coach. Explicit LLM_PROVIDER wins; else Groq if key set, else OpenAI."""
        p = (self.llm_provider or "").strip().lower()
        if p == "groq":
            return "groq" if self.groq_api_key else None
        if p == "openai":
            return "openai" if self.openai_api_key else None
        if self.groq_api_key:
            return "groq"
        if self.openai_api_key:
            return "openai"
        return None


settings = Settings()

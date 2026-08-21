from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    environment: str = "development"
    secret_key: str = "dev_secret_key_change_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 480

    database_url: str = (
        "postgresql+asyncpg://zisamale:change_me_in_production@localhost:5433/zisamale"
    )
    redis_url: str = "redis://localhost:6380/0"
    rabbitmq_url: str = "amqp://zisamale:change_me_in_production@localhost:5672/"

    dhis2_base_url: str = ""
    dhis2_username: str = ""
    dhis2_password: str = ""
    dhis2_malaria_data_element: str = "malaria_confirmed"
    dhis2_diarrhea_data_element: str = "diarrhea_cases"
    dhis2_pneumonia_data_element: str = "pneumonia_cases"
    dhis2_alert_case_threshold: int = 250
    dhis2_event_program: str = ""
    dhis2_cache_ttl_hours: int = 6

    ichiss_base_url: str = ""
    ichss_token: str = ""

    lmis_base_url: str = ""
    lmis_api_key: str = ""
    lmis_csv_path: str = ""

    africas_talking_api_key: str = ""
    africas_talking_username: str = ""
    africas_talking_sender_id: str = ""

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_addr: str = "alerts@zisamale.health.mw"
    smtp_use_tls: bool = True

    cors_origins: str = (
        "http://localhost:3000,http://localhost:5173,"
        "https://dashboard.zisamale.health.mw"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

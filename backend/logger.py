import logging
from pathlib import Path

LOG_FILE = Path(__file__).resolve().parent / "app.log"

logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger("todo_app")
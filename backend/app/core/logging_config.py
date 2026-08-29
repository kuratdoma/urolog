import logging
import sys
from contextvars import ContextVar
from pythonjsonlogger import jsonlogger
from app.core.config import settings

# Context variable to hold the correlation ID per-request
request_id_ctx_var: ContextVar[str] = ContextVar("request_id", default=None)


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        
        # Add basic fields
        if not log_record.get('timestamp'):
            log_record['timestamp'] = self.formatTime(record, self.datefmt)
        if log_record.get('level'):
            log_record['level'] = log_record['level'].upper()
        else:
            log_record['level'] = record.levelname
            
        # Add correlation ID
        req_id = request_id_ctx_var.get()
        if req_id:
            log_record['request_id'] = req_id

        # Add environment
        log_record['environment'] = settings.ENVIRONMENT


def setup_logging():
    """
    Configures the root logger to use JSON formatting.
    This replaces the basicConfig format in main.py.
    """
    logger = logging.getLogger()
    
    # Remove all existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
        
    log_handler = logging.StreamHandler(sys.stdout)
    
    # Use JSON formatter in production, or standard formatter in local if preferred
    # But for OBS-CRIT-01 we enforce JSON structured logging
    formatter = CustomJsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s'
    )
    log_handler.setFormatter(formatter)
    logger.addHandler(log_handler)
    logger.setLevel(logging.INFO)
    
    # Specific loggers can be silenced or adjusted here
    logging.getLogger("uvicorn.access").handlers = [log_handler]
    logging.getLogger("uvicorn.error").handlers = [log_handler]

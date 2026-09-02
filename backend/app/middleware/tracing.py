import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.core.logging_config import request_id_ctx_var


class TracingMiddleware(BaseHTTPMiddleware):
    """
    OBS-CRIT-01: Structured Observability Tracing Middleware

    Assigns a unique X-Request-ID to each incoming request.
    This ID is stored in a ContextVar so the JSON structured logger can automatically
    attach it to all logs generated during the request lifecycle.

    The ID is also returned in the response headers so the frontend can display it
    on error screens for easy debugging.
    """
    async def dispatch(self, request: Request, call_next):
        # 1. Use client provided request ID if it exists (for distributed tracing)
        #    Otherwise, generate a fresh UUID.
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

        # 2. Set the context variable
        token = request_id_ctx_var.set(req_id)

        try:
            # 3. Process the request
            response = await call_next(request)

            # 4. Attach request ID to the response headers
            response.headers["X-Request-ID"] = req_id
            return response
        finally:
            # 5. Clean up context variable
            request_id_ctx_var.reset(token)

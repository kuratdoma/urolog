import functools
import logging
from typing import Any, Callable, TypeVar, cast, Optional
from uuid import UUID
from app.services.audit_service import AuditService
from app.core.user_context import UserContext

F = TypeVar("F", bound=Callable[..., Any])


def audited(action: str, resource_type: str, id_arg_name: Optional[str] = None):
    """
    Decorator for repository methods to automatically audit access.
    Expects 'self' to have a 'context: UserContext' and 'session: AsyncSession' (or 'db').

    Args:
        action: The audit action name (e.g. PATIENT_VIEW)
        resource_type: The type of resource (e.g. patient)
        id_arg_name: Optional name of the argument that contains the resource ID.
                    If not provided, it tries to infer from args/kwargs or result.
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def wrapper(self, *args, **kwargs):
            # 1. Execute the method first
            result = await func(self, *args, **kwargs)

            # 2. Extract resource ID
            resource_id = None

            # 2a. Try explicit argument name if provided
            if id_arg_name:
                if id_arg_name in kwargs:
                    resource_id = kwargs[id_arg_name]
                else:
                    # Map arg name to position if possible
                    import inspect

                    sig = inspect.signature(func)
                    params = list(sig.parameters.keys())
                    if id_arg_name in params:
                        idx = params.index(id_arg_name)
                        # Offset by 1 because of 'self' in the wrapper call,
                        # but sig.parameters includes 'self' if it's a bound method
                        # or we just look at args.
                        # Actually 'self' is the first arg in wrapper.
                        if idx < len(args) + 1:
                            if idx == 0:
                                pass  # self
                            else:
                                resource_id = args[idx - 1]

            # 2b. Fallback to heuristic scan if still no ID
            if not resource_id:
                # Try to find UUID in args/kwargs
                for arg in args:
                    if isinstance(arg, (UUID, str)) and (
                        isinstance(arg, UUID) or (len(str(arg)) == 36)
                    ):
                        try:
                            if isinstance(arg, UUID):
                                resource_id = str(arg)
                            else:
                                UUID(str(arg))
                                resource_id = str(arg)
                            break
                        except ValueError:
                            pass

                if not resource_id:
                    for val in kwargs.values():
                        if isinstance(val, (UUID, str)) and (
                            isinstance(val, UUID) or (len(str(val)) == 36)
                        ):
                            try:
                                if isinstance(val, UUID):
                                    resource_id = str(val)
                                else:
                                    UUID(str(val))
                                    resource_id = str(val)
                                break
                            except ValueError:
                                pass

            # 2c. Final fallback: check the result object
            if not resource_id and result:
                if hasattr(result, "id"):
                    resource_id = str(result.id)
                elif isinstance(result, dict) and "id" in result:
                    resource_id = str(result["id"])
                elif hasattr(result, "hasta_id"):  # common in clinical/finance
                    resource_id = str(result.hasta_id)

            # 3. Perform Auditing (Resilient/Soft-failure)
            try:
                db = getattr(self, "session", getattr(self, "db", None))
                context: Optional[UserContext] = getattr(self, "context", None)

                if db and context and context.user_id:
                    await AuditService.log(
                        db=db,
                        action=action,
                        user_id=context.user_id,
                        resource_type=resource_type,
                        resource_id=str(resource_id) if resource_id else None,
                        details={"method": func.__name__},
                        ip_address=context.ip_address,
                    )
            except Exception as e:
                logging.error(
                    f"[AUDIT-DECORATOR] Failed to create audit log for {action}: {e}"
                )

            return result

        return cast(F, wrapper)

    return decorator

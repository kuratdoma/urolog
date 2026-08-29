from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserContext(BaseModel):
    """
    Context object to carry user info for auditing across shards.
    """

    model_config = ConfigDict(frozen=True)

    user_id: Optional[int] = None
    username: Optional[str] = None
    ip_address: Optional[str] = None
    request_id: Optional[str] = None

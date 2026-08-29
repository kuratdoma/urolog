import string
import secrets


def generate_unique_code(length: int = 6) -> str:
    """
    Generates a cryptographically secure random string of a given length
    using English alphabet (uppercase & lowercase) and digits.

    Example: 'aB3d9Z'
    """
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

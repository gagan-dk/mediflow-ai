"""Structured application logging.

Development logs are emitted as single-line key=value records with a stable
field order so they are easy to grep in a terminal and trivial to parse into a
structured pipeline later. `debug` mode uses a human-readable format.

Data-safety contract: this module never adds password, token, API-key, or
personal-data fields. Route modules log only identifiers (ids, hospital ids,
role names, counts) and generic outcomes; if a secret ever appears in a message
it must be redacted by the caller before logging.
"""

import json
import logging
import sys
from datetime import datetime, timezone


class RedactingFilter(logging.Filter):
    """Defense-in-depth: mask values for known secret field names.

    If any component accidentally embeds a password, token, or key into a log
    record, this filter scrubs it before the record is formatted. Field values
    are matched case-insensitively.
    """

    _SECRET_KEYS = (
        "password",
        "token",
        "access_token",
        "api_key",
        "apikey",
        "secret",
        "authorization",
        "authorization_header",
    )

    def filter(self, record: logging.LogRecord) -> bool:
        formatted = record.getMessage()
        if self._contains_secret(formatted):
            record.msg = self._redact(formatted, record.args)
            record.args = ()
        return True

    @classmethod
    def _contains_secret(cls, message: str) -> bool:
        lowered = message.lower()
        return any(key in lowered for key in cls._SECRET_KEYS)

    @classmethod
    def _redact(cls, message: str, args) -> str:
        import re

        # Mask Bearer tokens first: the generic key=value pass below would
        # otherwise consume the word "Bearer" and leave the token visible.
        message = re.sub(
            r"(?i)(bearer\s+)[A-Za-z0-9\-._~+/]+=*", r"\1[REDACTED]", message
        )
        lowered = message.lower()
        for key in cls._SECRET_KEYS:
            if key in lowered:
                message = cls._mask_key_value(message, key)
        if args:
            message = f"{message} args={json.dumps(args, default=str)}"
        return message

    @staticmethod
    def _mask_key_value(message: str, key: str) -> str:
        """Replace `key=value`-style occurrences for `key` with `[REDACTED]`."""
        import re

        escaped = re.escape(key)
        pattern = r"(?i)(" + escaped + r")(\s*[=:]\s*)([^\s,;}\"']+)"
        return re.sub(pattern, r"\1\2[REDACTED]", message)


class KeyValueFormatter(logging.Formatter):
    """Render records as `ts=... level=... logger=... message...` one-liners.

    Extra key/value pairs supplied via `extra` are appended as `key=value`
    fields. Only scalars are included; structured values are JSON-encoded.
    """

    def format(self, record: logging.LogRecord) -> str:
        parts = [
            f"ts={datetime.now(timezone.utc).isoformat(timespec='milliseconds')}",
            f"level={record.levelname.lower()}",
            f"logger={record.name}",
        ]
        message = record.getMessage()
        if record.exc_info and record.exc_info[0] is not None:
            message = f"{message}\n{self.formatException(record.exc_info)}"
        parts.append(f"msg={_quote(message)}")
        for key, value in sorted(getattr(record, "_structured", {}).items()):
            parts.append(f"{key}={_quote_value(value)}")
        return " ".join(parts)


def _quote(value: str) -> str:
    """Wrap a message in double quotes when it contains whitespace or quotes."""
    if any(ch.isspace() for ch in value) or '"' in value:
        return json.dumps(value, ensure_ascii=True)
    return value


def _quote_value(value) -> str:
    if isinstance(value, str):
        return _quote(value)
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, bool):
        return "true" if value else "false"
    return json.dumps(value, default=str)


class StructuredLogger(logging.Logger):
    """Logger that appends `extra` key/values as structured log fields."""

    def _log(
        self,
        level,
        msg,
        args,
        exc_info=None,
        extra=None,
        stack_info=False,
        stacklevel=1,
        **kwargs,
    ):
        structured = {} if extra is None else dict(extra)
        super()._log(
            level,
            msg,
            args,
            exc_info=exc_info,
            extra={**structured, "_structured": structured},
            stack_info=stack_info,
            stacklevel=stacklevel,
        )


def setup_logging(debug: bool = False) -> None:
    """Install the application-wide logging configuration once.

    - `debug=True`: readable per-record formatting (dev convenience).
    - `debug=False`: compact key=value single-line records.
    - A `RedactingFilter` guards all application loggers.
    - Third-party loggers (uvicorn, sqlalchemy) stay at WARNING unless debug.
    """
    root = logging.getLogger("mediflow")
    if root.handlers:
        return

    root.setLevel(logging.DEBUG if debug else logging.INFO)
    formatter = KeyValueFormatter() if not debug else logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s - %(message)s"
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    root.addHandler(handler)
    root.addFilter(RedactingFilter())
    root.propagate = False

    logging.setLoggerClass(StructuredLogger)

    for name in ("uvicorn", "uvicorn.access", "sqlalchemy.engine"):
        noisy = logging.getLogger(name)
        noisy.setLevel(logging.DEBUG if debug else logging.WARNING)
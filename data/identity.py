"""Canonical identifiers shared by registration, login, and database migrations."""

import phonenumbers


def normalize_phone(value: str) -> str:
    value = value.strip()
    if not value.startswith("+"):
        raise ValueError("Include your country code, for example +91 98765 43210.")
    try:
        number = phonenumbers.parse(value, None)
        if not phonenumbers.is_possible_number(number) or number.extension:
            raise ValueError("Enter a valid phone number with a country code.")
        return phonenumbers.format_number(number, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        raise ValueError("Enter a valid phone number with a country code.") from None

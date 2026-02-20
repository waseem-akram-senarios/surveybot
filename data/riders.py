"""
Rider data management.
Contains dummy data for testing and functions to retrieve rider information.
In production, this would connect to a database.
"""

from config.settings import DEFAULT_RIDER


# ===========================================
# RIDER DUMMY DATA
# ===========================================
# Fictional riders for testing purposes
# These riders and phone numbers are completely fictional
# User data is subject to change when/if we get real data from a pilot user

RIDER_DATA = {
    "1234567890": {
        "first_name": "Jason",
        "last_name": "Smith",
        "phone": "123-456-7890",
        "mobility_needs": "None",
        "user_since": "2024"
    },
    "3216540987": {
        "first_name": "Erika",
        "last_name": "Sampson",
        "phone": "321-654-0987",
        "mobility_needs": "Wheelchair user",
        "user_since": "2021"
    },
    "7894561230": {
        "first_name": "Samantha",
        "last_name": "Ferguson",
        "phone": "789-456-1230",
        "mobility_needs": "Blind",
        "user_since": "2025"
    }
}


def get_rider_info(phone_number: str) -> dict:
    """
    Get rider information from the data store.
    
    Args:
        phone_number: The phone number to look up (any format)
        
    Returns:
        dict: Rider information dictionary
    """
    # Clean phone number - remove formatting characters and get last 10 digits
    clean_phone = phone_number.replace("+", "").replace("-", "").replace(" ", "")[-10:]
    
    if clean_phone in RIDER_DATA:
        return RIDER_DATA[clean_phone]
    
    # Return default rider if not found
    return {
        **DEFAULT_RIDER,
        "phone": phone_number,
    }


def add_rider(phone_number: str, rider_info: dict) -> None:
    """
    Add a new rider to the data store.
    
    Args:
        phone_number: The phone number (cleaned, 10 digits)
        rider_info: Dictionary containing rider information
    """
    RIDER_DATA[phone_number] = rider_info


def update_rider(phone_number: str, updates: dict) -> bool:
    """
    Update an existing rider's information.
    
    Args:
        phone_number: The phone number to update
        updates: Dictionary of fields to update
        
    Returns:
        bool: True if rider was found and updated, False otherwise
    """
    clean_phone = phone_number.replace("+", "").replace("-", "").replace(" ", "")[-10:]
    
    if clean_phone in RIDER_DATA:
        RIDER_DATA[clean_phone].update(updates)
        return True
    return False


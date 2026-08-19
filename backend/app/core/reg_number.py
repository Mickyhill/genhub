"""
Registration number format: YY/FACULTYCODE/DEPTCODE/NUMBER
Example: 24/SCIT/SEN/045  -> year=24, faculty_code=SCIT, dept_code=SEN, number=45
"""
import re

REG_NUMBER_PATTERN = re.compile(r"^(\d{2})/([A-Z]+)/([A-Z]+)/(\d{1,5})$")


def parse_reg_number(reg_number: str):
    """
    Returns (year:str, faculty_code:str, dept_code:str, number:int).
    Raises ValueError with a human-readable message if the format is wrong.
    """
    cleaned = reg_number.strip().upper()
    match = REG_NUMBER_PATTERN.match(cleaned)
    if not match:
        raise ValueError(
            "Registration number must be in the format YY/FACULTYCODE/DEPTCODE/NUMBER, "
            "e.g. 24/SCIT/SEN/045"
        )
    year, faculty_code, dept_code, number_str = match.groups()
    return year, faculty_code, dept_code, int(number_str)

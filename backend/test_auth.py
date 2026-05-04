"""
Unit tests for auth logic (hash_password, verify_password, create_token, verify_token).
"""
import pytest
from auth import hash_password, verify_password, create_token, verify_token


def test_hash_and_verify_password():
    """Test password hashing and verification."""
    password = "test_password_123"
    hashed = hash_password(password)
    
    assert hashed != password  # should not be plain text
    assert verify_password(password, hashed)  # correct password should verify
    assert not verify_password("wrong_password", hashed)  # wrong password should not verify


def test_create_and_verify_token():
    """Test JWT token creation and verification."""
    username = "test_user"
    token = create_token(username)
    
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Verify the token and extract the username
    payload = verify_token(token)
    assert payload is not None
    assert payload.get("sub") == username


def test_verify_invalid_token():
    """Test that invalid tokens raise an exception."""
    invalid_token = "invalid.token.here"
    
    with pytest.raises(Exception):
        verify_token(invalid_token)


def test_verify_token_with_wrong_encoding():
    """Test that tokens with invalid format are rejected."""
    bad_token = "not_a_valid_jwt_format"
    
    with pytest.raises(Exception):
        verify_token(bad_token)

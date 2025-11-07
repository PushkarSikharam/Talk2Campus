from flask import Blueprint, request, jsonify
from db import users_collection
from utils import hash_password, verify_password, create_access_token, decode_token
from bson import ObjectId

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not all([name, email, password]):
        return jsonify({"error": "All fields are required"}), 400

    if users_collection.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400

    hashed_pw = hash_password(password)
    user = {"name": name, "email": email, "password": hashed_pw}
    result = users_collection.insert_one(user)
    return jsonify({"id": str(result.inserted_id), "name": name, "email": email}), 201


@auth_bp.route('/signin', methods=['POST'])
def signin():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = users_collection.find_one({"email": email})
    if not user or not verify_password(password, user['password']):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token({"sub": email})
    return jsonify({"access_token": token}), 200


@auth_bp.route('/validate', methods=['POST'])
def validate():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({"error": "Token required"}), 400

    decoded = decode_token(token.split(" ")[1])
    if not decoded:
        return jsonify({"valid": False}), 401

    return jsonify({"valid": True, "user": decoded['sub']}), 200

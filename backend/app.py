from flask import Flask, jsonify
from flask_cors import CORS
from auth_routes import auth_bp

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/')
def home():
    return jsonify({"message": "Talk2Campus Flask API running!"})

app.register_blueprint(auth_bp, url_prefix='/auth')

if __name__ == '__main__':
    app.run(debug=True, port=8000)

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

DATABASE = 'runs.db'

def init_db():
    """Initialize the database with users and runs tables."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        distance REAL,
        duration REAL,
        date TEXT,
        notes TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    ''')

    conn.commit()
    conn.close()


@app.route('/register', methods=['POST'])
def register_user():
    """Register a new user with hashed password."""
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400

    hashed_pw = generate_password_hash(password)

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, hashed_pw))
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 409

    cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()

    return jsonify({'user_id': user[0]})


@app.route('/login', methods=['POST'])
def login():
    """Authenticate user and return user_id if successful."""
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT id, password FROM users WHERE username = ?', (username,))
    result = cursor.fetchone()
    conn.close()

    if result and check_password_hash(result[1], password):
        return jsonify({'user_id': result[0]})
    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/runs', methods=['POST'])
def add_run():
    """Add a run for a given user."""
    data = request.json
    user_id = data.get('user_id')
    distance = data.get('distance')
    duration = data.get('duration')
    date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
    notes = data.get('notes', '')

    if not all([user_id, distance, duration, date]):
        return jsonify({'error': 'Missing required run data'}), 400

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO runs (user_id, distance, duration, date, notes) VALUES (?, ?, ?, ?, ?)',
        (user_id, distance, duration, date, notes)
    )
    conn.commit()
    conn.close()

    return jsonify({'message': 'Run added'})


@app.route('/runs', methods=['GET'])
def get_runs():
    """Return all runs (admin-style global access)."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT id, user_id, distance, duration, date, notes FROM runs')
    runs = cursor.fetchall()
    conn.close()

    return jsonify([
        {'id': r[0], 'user_id': r[1], 'distance': r[2], 'duration': r[3], 'date': r[4], 'notes': r[5]}
        for r in runs
    ])


@app.route('/runs/<int:user_id>', methods=['GET'])
def get_user_runs(user_id):
    """Return all runs for a specific user."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT id, distance, duration, date, notes FROM runs WHERE user_id = ? ORDER BY date', (user_id,))
    runs = cursor.fetchall()
    conn.close()

    return jsonify([
        {'id': r[0], 'distance': r[1], 'duration': r[2], 'date': r[3], 'notes': r[4]}
        for r in runs
    ])


@app.route('/runs/<int:run_id>', methods=['DELETE'])
def delete_run(run_id):
    """Delete a run by ID."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM runs WHERE id = ?', (run_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Run deleted'})


if __name__ == '__main__':
    init_db()
    app.run(debug=True)

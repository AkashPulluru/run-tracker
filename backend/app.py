from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime

app = Flask(__name__)
CORS(app)

DATABASE = 'runs.db'

def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            distance REAL,
            duration REAL,
            date TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    conn.commit()
    conn.close()


@app.route('/runs', methods=['POST'])
def add_run():
    data = request.json
    user_id = data['user_id']
    distance = data['distance']
    duration = data['duration']
    date = data.get('date', datetime.now().strftime('%Y-%m-%d'))

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO runs (user_id, distance, duration, date) VALUES (?, ?, ?, ?)',
        (user_id, distance, duration, date)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Run added'})


@app.route('/runs', methods=['GET'])
def get_runs():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT id, user_id, distance, duration, date FROM runs')
    runs = cursor.fetchall()
    conn.close()

    return jsonify([
        {'id': r[0], 'user_id': r[1], 'distance': r[2], 'duration': r[3], 'date': r[4]}
        for r in runs
    ])

@app.route('/register', methods=['POST'])
def register_user():
    data = request.json
    username = data['username']

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('INSERT OR IGNORE INTO users (username) VALUES (?)', (username,))
    conn.commit()

    cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
    user_id = cursor.fetchone()[0]

    conn.close()
    return jsonify({'user_id': user_id})



@app.route('/runs/<int:user_id>', methods=['GET'])
def get_user_runs(user_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT id, distance, duration, date FROM runs WHERE user_id = ? ORDER BY date', (user_id,))
    runs = cursor.fetchall()
    conn.close()

    return jsonify([
        {'id': r[0], 'distance': r[1], 'duration': r[2], 'date': r[3]}
        for r in runs
    ])

@app.route('/runs/<int:run_id>', methods=['DELETE'])
def delete_run(run_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM runs WHERE id = ?', (run_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Run deleted'})


if __name__ == '__main__':
    init_db()
    app.run(debug=True)


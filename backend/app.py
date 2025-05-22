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
        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            distance REAL,
            duration REAL,
            date TEXT
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/runs', methods=['POST'])
def add_run():
    data = request.json
    distance = data['distance']
    duration = data['duration']
    date = data.get('date', datetime.now().strftime('%Y-%m-%d'))

    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO runs (distance, duration, date) VALUES (?, ?, ?)',
                   (distance, duration, date))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Run logged successfully'}), 201

@app.route('/runs', methods=['GET'])
def get_runs():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('SELECT id, distance, duration, date FROM runs')
    runs = cursor.fetchall()
    conn.close()

    runs_list = [{'id': run[0], 'distance': run[1], 'duration': run[2], 'date': run[3]} for run in runs]
    return jsonify(runs_list)

if __name__ == '__main__':
    init_db()
    app.run(debug=True)

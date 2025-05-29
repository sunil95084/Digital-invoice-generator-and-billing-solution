from flask import Flask, request, jsonify, session, send_file
import json
import os
from datetime import datetime
import uuid
from flask_cors import CORS
import subprocess
import tempfile
import shutil

app = Flask(__name__)
app.secret_key = 'super-secret-key'
CORS(app)

DATA_FILE = "invoices.json"
USERS_FILE = "users.json"

def load_invoices():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return []

def save_invoices(invoices):
    with open(DATA_FILE, 'w') as f:
        json.dump(invoices, f, indent=4)

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=4)

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    users = load_users()  # ✅ Now this will call the correct function

    if any(user['username'] == username or user['email'] == email for user in users):
        return jsonify({'error': 'Username or email already exists'}), 400

    users.append({'username': username, 'email': email, 'password': password})
    save_users(users)
    
    return jsonify({'message': 'Registration successful'}), 201



@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    users = load_users()
    for user in users:
        if user['username'] == username and user['password'] == password:
            session['user'] = username
            return jsonify({'message': 'Login successful', 'username': username}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({'message': 'Logged out'}), 200

@app.route('/api/check-session', methods=['GET'])
def check_session():
    if 'user' in session:
        return jsonify({'logged_in': True, 'username': session['user']}), 200
    return jsonify({'logged_in': False}), 200

@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    invoices = load_invoices()
    total_invoices = len(invoices)
    total_revenue = sum(invoice['total'] for invoice in invoices)
    invoices_this_month = len([i for i in invoices if i['date'].startswith('2025-05')])
    customer_totals = {}
    date_totals = {}
    for invoice in invoices:
        customer = invoice['customer_name']
        date = invoice['date']
        customer_totals[customer] = customer_totals.get(customer, 0) + invoice['total']
        date_totals[date] = date_totals.get(date, 0) + invoice['total']
    return jsonify({
        'total_invoices': total_invoices,
        'total_revenue': total_revenue,
        'invoices_this_month': invoices_this_month,
        'customer_totals': customer_totals,
        'date_totals': date_totals
    })

@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    invoices = load_invoices()
    return jsonify(invoices)

@app.route('/api/invoices', methods=['POST'])
def create_invoice():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    invoice = {
        'invoice_id': str(uuid.uuid4())[:8],
        'customer_name': data['customer_name'],
        'customer_email': data['customer_email'],
        'date': datetime.now().strftime("%Y-%m-%d"),
        'items': [],
        'total': 0.0
    }
    invoices = load_invoices()
    invoices.append(invoice)
    save_invoices(invoices)
    return jsonify(invoice), 201

@app.route('/api/invoices/<invoice_id>/items', methods=['POST'])
def add_item(invoice_id):
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    invoices = load_invoices()
    for invoice in invoices:
        if invoice['invoice_id'] == invoice_id:
            item = {
                'description': data['description'],
                'quantity': data['quantity'],
                'unit_price': data['unit_price'],
                'subtotal': data['quantity'] * data['unit_price']
            }
            invoice['items'].append(item)
            invoice['total'] += item['subtotal']
            save_invoices(invoices)
            return jsonify(invoice), 200
    return jsonify({'error': 'Invoice not found'}), 404

@app.route('/api/invoices/<invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    invoices = load_invoices()
    for invoice in invoices:
        if invoice['invoice_id'] == invoice_id:
            return jsonify(invoice)
    return jsonify({'error': 'Invoice not found'}), 404

@app.route('/api/invoices/<invoice_id>/pdf', methods=['GET'])
def generate_pdf(invoice_id):
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    invoices = load_invoices()
    for invoice in invoices:
        if invoice['invoice_id'] == invoice_id:
           
            latex_template = r"""
\documentclass[a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage{booktabs}
\usepackage[margin=1in]{geometry}
\usepackage{times}

\begin{document}

\begin{center}
    \textbf{\Large Invoice} \\
    \vspace{0.5cm}
    Invoice ID: """ + invoice['invoice_id'] + r""" \\
    Date: """ + invoice['date'] + r""" \\
    Customer: """ + invoice['customer_name'] + r""" (""" + invoice['customer_email'] + r""") \\
\end{center}

\vspace{0.5cm}

\begin{tabular}{llrr}
    \toprule
    \textbf{Description} & \textbf{Quantity} & \textbf{Unit Price (₹)} & \textbf{Subtotal (₹)} \\
    \midrule
    """ + "\n    ".join([r"\textbf{" + item['description'] + "} & " + str(item['quantity']) + " & " + f"{item['unit_price']:.2f}" + " & " + f"{item['subtotal']:.2f}" + r" \\" for item in invoice['items']]) + r"""
    \bottomrule
\end{tabular}

\vspace{0.5cm}

\begin{flushright}
    \textbf{Total: ₹""" + f"{invoice['total']:.2f}" + r"""}
\end{flushright}

\end{document}
"""
            
            with tempfile.TemporaryDirectory() as temp_dir:
                tex_file = os.path.join(temp_dir, f"invoice_{invoice_id}.tex")
                pdf_file = os.path.join(temp_dir, f"invoice_{invoice_id}.pdf")
                
              
                with open(tex_file, 'w') as f:
                    f.write(latex_template)
                
                
                try:
                    subprocess.run(['pdflatex', '-output-directory', temp_dir, tex_file], check=True, capture_output=True)
                    return send_file(pdf_file, as_attachment=True, download_name=f"invoice_{invoice_id}.pdf")
                except subprocess.CalledProcessError:
                    return jsonify({'error': 'Failed to generate PDF'}), 500
    return jsonify({'error': 'Invoice not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
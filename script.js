const API_URL = 'http://localhost:5000/api';


function setActiveLink() {
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => link.classList.remove('active'));
    const currentSection = window.location.hash || '#home';
    const activeLink = document.querySelector(`.nav-link[href="${currentSection}"]`);
    if (activeLink) activeLink.classList.add('active');
}


function animateCards() {
    const cards = document.querySelectorAll('.animate-card');
    cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.8) {
            card.style.animationDelay = `${index * 0.2}s`;
            card.classList.add('visible');
        }
    });
}


document.addEventListener('DOMContentLoaded', async () => {
    setActiveLink();
    animateCards();
    window.addEventListener('scroll', animateCards);

    try {
        const response = await fetch(`${API_URL}/check-session`);
        const data = await response.json();
        if (data.logged_in) {
            showProtectedSections();
            document.getElementById('login-link').style.display = 'none';
            document.getElementById('register-link').style.display = 'none';
            document.getElementById('logout-link').style.display = 'block';
            loadDashboard();
        } else {
            showLoginSection();
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }

   
  const response = await fetch(`${API_URL}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_name: customerName, customer_email: customerEmail })
});


    function updateProgressBar() {
        let filled = 0;
        if (customerNameInput.value.trim()) filled++;
        if (customerEmailInput.value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmailInput.value)) filled++;
        progressBar.style.width = `${(filled / 2) * 100}%`;
    }

    customerNameInput.addEventListener('input', () => {
        const error = document.getElementById('customer-name-error');
        if (customerNameInput.value.trim().length < 2) {
            customerNameInput.classList.add('error');
            error.textContent = 'Name must be at least 2 characters';
            error.style.display = 'block';
        } else {
            customerNameInput.classList.remove('error');
            error.style.display = 'none';
        }
        updateProgressBar();
    });

    customerEmailInput.addEventListener('input', () => {
        const error = document.getElementById('customer-email-error');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmailInput.value)) {
            customerEmailInput.classList.add('error');
            error.textContent = 'Enter a valid email';
            error.style.display = 'block';
        } else {
            customerEmailInput.classList.remove('error');
            error.style.display = 'none';
        }
        updateProgressBar();
    });
});


window.addEventListener('hashchange', setActiveLink);

document.getElementById('navbar-toggle').addEventListener('click', () => {
    document.getElementById('navbar-menu').classList.toggle('active');
});


document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert(`Welcome, ${data.username}!`);
            showProtectedSections();
            document.getElementById('login-link').style.display = 'none';
            document.getElementById('register-link').style.display = 'none';
            document.getElementById('logout-link').style.display = 'block';
            document.getElementById('login-form').reset();
            window.location.hash = '#dashboard';
            loadDashboard();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Error logging in');
    }
});


document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Registration successful! Please log in.');
            document.getElementById('register-form').reset();
            window.location.hash = '#login';
            showLoginSection();
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Error registering');
    }
});


document.getElementById('logout-link').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/logout`, {
            method: 'POST'
        });
        if (response.ok) {
            alert('Logged out');
            showLoginSection();
            document.getElementById('login-link').style.display = 'block';
            document.getElementById('register-link').style.display = 'block';
            document.getElementById('logout-link').style.display = 'none';
            window.location.hash = '#home';
        }
    } catch (error) {
        alert('Error logging out');
    }
});


document.getElementById('create-invoice-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = document.getElementById('customer-name').value;
    const customerEmail = document.getElementById('customer-email').value;

    if (customerName.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        alert('Please correct the form errors');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_name: customerName, customer_email: customerEmail })
        });
        const data = await response.json();
        if (response.ok) {
            const modal = document.getElementById('confirmation-modal');
            document.getElementById('modal-invoice-id').textContent = `Invoice ID: ${data.invoice_id}`;
            modal.style.display = 'flex';
            document.getElementById('modal-close').addEventListener('click', () => {
                modal.style.display = 'none';
                e.target.reset();
                document.getElementById('progress-bar').style.width = '0%';
            }, { once: true });
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Error creating invoice');
    }
});

document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const invoiceId = document.getElementById('invoice-id').value;
    const description = document.getElementById('item-description').value;
    const quantity = parseFloat(document.getElementById('quantity').value);
    const unitPrice = parseFloat(document.getElementById('unit-price').value);

    try {
        const response = await fetch(`${API_URL}/invoices/${invoiceId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, quantity, unit_price: unitPrice })
        });
        if (response.ok) {
            alert('Item added successfully');
            e.target.reset();
        } else {
            const error = await response.json();
            alert(error.error);
        }
    } catch (error) {
        alert('Error adding item');
    }
});


document.getElementById('list-invoices').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/invoices`);
        const invoices = await response.json();
        if (response.ok) {
            const listDiv = document.getElementById('invoices-list');
            listDiv.innerHTML = `
                <table>
                    <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Total</th>
                    </tr>
                    ${invoices.map(invoice => `
                        <tr>
                            <td>${invoice.invoice_id}</td>
                            <td>${invoice.date}</td>
                            <td>${invoice.customer_name}</td>
                            <td>₹${invoice.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </table>
            `;
        } else {
            alert(invoices.error);
        }
    } catch (error) {
        alert('Error fetching invoices');
    }
});


document.getElementById('view-invoice').addEventListener('click', async () => {
    const invoiceId = document.getElementById('view-invoice-id').value;
    try {
        const response = await fetch(`${API_URL}/invoices/${invoiceId}`);
        if (response.ok) {
            const invoice = await response.json();
            const detailsDiv = document.getElementById('invoice-details');
            detailsDiv.innerHTML = `
                <h3>Invoice ID: ${invoice.invoice_id}</h3>
                <p>Date: ${invoice.date}</p>
                <p>Customer: ${invoice.customer_name} (${invoice.customer_email})</p>
                <table>
                    <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Subtotal</th>
                    </tr>
                    ${invoice.items.map(item => `
                        <tr>
                            <td>${item.description}</td>
                            <td>${item.quantity}</td>
                            <td>₹${item.unit_price.toFixed(2)}</td>
                            <td>₹${item.subtotal.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </table>
                <p><strong>Total: ₹${invoice.total.toFixed(2)}</strong></p>
            `;
            document.getElementById('download-png').style.display = 'inline-block';
            document.getElementById('download-pdf').style.display = 'inline-block';
        } else {
            const error = await response.json();
            alert(error.error);
            document.getElementById('download-png').style.display = 'none';
            document.getElementById('download-pdf').style.display = 'none';
        }
    } catch (error) {
        alert('Error fetching invoice');
        document.getElementById('download-png').style.display = 'none';
        document.getElementById('download-pdf').style.display = 'none';
    }
});


document.getElementById('download-png').addEventListener('click', () => {
    const invoiceDetails = document.getElementById('invoice-details');
    html2canvas(invoiceDetails).then(canvas => {
        const link = document.createElement('a');
        link.download = `invoice_${document.getElementById('view-invoice-id').value}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(error => {
        alert('Error generating PNG');
    });
});

document.getElementById('download-pdf').addEventListener('click', () => {
    const invoiceId = document.getElementById('view-invoice-id').value;
    window.location.href = `${API_URL}/invoices/${invoiceId}/pdf`;
});


async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/dashboard`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('total-invoices').textContent = data.total_invoices;
            document.getElementById('total-revenue').textContent = data.total_revenue.toFixed(2);
            document.getElementById('invoices-this-month').textContent = data.invoices_this_month;

            const customerCtx = document.getElementById('customer-chart').getContext('2d');
            new Chart(customerCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(data.customer_totals),
                    datasets: [{
                        label: 'Total by Customer (₹)',
                        data: Object.values(data.customer_totals),
                        backgroundColor: ['#28a745', '#007bff', '#dc3545'],
                        borderColor: ['#218838', '#0056b3', '#c82333'],
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            const dateCtx = document.getElementById('date-chart').getContext('2d');
            new Chart(dateCtx, {
                type: 'line',
                data: {
                    labels: Object.keys(data.date_totals),
                    datasets: [{
                        label: 'Total by Date (₹)',
                        data: Object.values(data.date_totals),
                        backgroundColor: 'rgba(40, 167, 69, 0.2)',
                        borderColor: '#28a745',
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Error loading dashboard');
    }
}


function showProtectedSections() {
    document.getElementById('login').style.display = 'none';
    document.getElementById('register').style.display = 'none';
    document.getElementById('create-invoice').style.display = 'block';
    document.getElementById('add-item').style.display = 'block';
    document.getElementById('invoices-list').style.display = 'block';
    document.getElementById('view-invoice').style.display = 'block';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('home').style.display = 'block';
}


function showLoginSection() {
    document.getElementById('login').style.display = 'block';
    document.getElementById('register').style.display = 'block';
    document.getElementById('create-invoice').style.display = 'none';
    document.getElementById('add-item').style.display = 'none';
    document.getElementById('invoices-list').style.display = 'none';
    document.getElementById('view-invoice').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('home').style.display = 'block';
}
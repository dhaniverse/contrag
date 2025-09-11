-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create sample e-commerce database
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'shipping', 'billing'
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'US'
);

-- Insert sample data
INSERT INTO users (name, email) VALUES
    ('John Doe', 'john@example.com'),
    ('Jane Smith', 'jane@example.com'),
    ('Bob Wilson', 'bob@example.com'),
    ('Alice Brown', 'alice@example.com');

INSERT INTO products (name, price, category, description) VALUES
    ('Wireless Headphones', 99.99, 'Electronics', 'High-quality wireless headphones with noise cancellation'),
    ('Running Shoes', 129.99, 'Sports', 'Comfortable running shoes for daily training'),
    ('Coffee Maker', 79.99, 'Kitchen', 'Automatic drip coffee maker with programmable timer'),
    ('Laptop Stand', 39.99, 'Office', 'Adjustable laptop stand for ergonomic workspace'),
    ('Water Bottle', 24.99, 'Sports', 'Insulated stainless steel water bottle');

INSERT INTO orders (user_id, total, status) VALUES
    (1, 99.99, 'completed'),
    (1, 169.98, 'shipped'),
    (2, 79.99, 'completed'),
    (3, 39.99, 'pending'),
    (1, 24.99, 'completed');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
    (1, 1, 1, 99.99),
    (2, 2, 1, 129.99),
    (2, 4, 1, 39.99),
    (3, 3, 1, 79.99),
    (4, 4, 1, 39.99),
    (5, 5, 1, 24.99);

INSERT INTO reviews (user_id, product_id, rating, comment) VALUES
    (1, 1, 5, 'Excellent sound quality! Very comfortable to wear.'),
    (2, 3, 4, 'Makes great coffee, easy to program.'),
    (1, 2, 5, 'Perfect for my daily runs. Very comfortable.'),
    (3, 4, 4, 'Great for working from home. Adjustable height is perfect.');

INSERT INTO addresses (user_id, type, street, city, state, zip_code) VALUES
    (1, 'shipping', '123 Main St', 'New York', 'NY', '10001'),
    (1, 'billing', '123 Main St', 'New York', 'NY', '10001'),
    (2, 'shipping', '456 Oak Ave', 'Los Angeles', 'CA', '90210'),
    (3, 'shipping', '789 Pine Rd', 'Chicago', 'IL', '60601');

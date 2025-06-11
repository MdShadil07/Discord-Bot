CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(50) UNIQUE NOT NULL,
    cid VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    role VARCHAR(20) NOT NULL,
    initial_amount NUMERIC(10,2),
    weekly_fund NUMERIC(10,2),
    profile_pic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE funds (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    amount_paid NUMERIC(10,2),
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE media_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(10) NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES media_posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Drop existing if needed
DROP TABLE IF EXISTS weeklyPayments;
DROP TABLE IF EXISTS loggedUser;

-- User table
CREATE TABLE loggedUser (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    cid VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    discordId VARCHAR(100),
    avatarUrl TEXT,
    initialAmount DECIMAL(10, 2),
    weeklyFund DECIMAL(10, 2)
);

-- Weekly payments table
CREATE TABLE weeklyPayments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    weekNumber INT,
    paidAmount DECIMAL(10, 2),
    FOREIGN KEY (userId) REFERENCES loggedUser(id)
);

-- View for real-time calculated dues and total deposits
CREATE OR REPLACE VIEW user_fund_summary AS
SELECT 
    u.id AS userId,
    u.name,
    u.cid,
    u.phone,
    u.discordId,
    u.avatarUrl,
    u.initialAmount,
    u.weeklyFund,
    COUNT(w.id) AS totalWeeks,
    COALESCE(SUM(w.paidAmount), 0) AS totalDeposits,
    (COUNT(w.id) * u.weeklyFund - COALESCE(SUM(w.paidAmount), 0)) AS totalDue
FROM loggedUser u
LEFT JOIN weeklyPayments w ON u.id = w.userId
GROUP BY u.id;

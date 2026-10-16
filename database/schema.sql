-- WorkTrack Database Schema (PostgreSQL)
-- Rework-Aware Task Tracking & Payroll Deduction System

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    emp_id VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('employee', 'tester', 'manager', 'admin')),
    department VARCHAR(128) NOT NULL,
    designation VARCHAR(128) NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 300.00,
    avatar_url TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modules (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(32) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    module_id VARCHAR(64),
    module_name VARCHAR(128) NOT NULL,
    assigned_to_user_id VARCHAR(64) REFERENCES users(id),
    original_delivery_user_id VARCHAR(64) REFERENCES users(id),
    created_by_user_id VARCHAR(64) REFERENCES users(id),
    deadline DATE NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    status VARCHAR(32) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'reopened', 'overdue')),
    submission_file VARCHAR(255),
    submission_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_status_history (
    id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(64) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    previous_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    changed_by_user_id VARCHAR(64) REFERENCES users(id),
    comment TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bug_reports (
    id VARCHAR(64) PRIMARY KEY,
    bug_id VARCHAR(32) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    steps_to_reproduce TEXT,
    expected_result TEXT,
    actual_result TEXT,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('High', 'Medium', 'Low')),
    evidence_url TEXT,
    evidence_name VARCHAR(255),
    task_id VARCHAR(64) REFERENCES tasks(id),
    module_id VARCHAR(64),
    module_name VARCHAR(128) NOT NULL,
    reported_by_user_id VARCHAR(64) REFERENCES users(id),
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL CHECK (status IN ('reported', 'assigned', 'in_progress', 'ready_for_review', 'approved', 'changes_requested', 'rejected')),
    assigned_to_user_id VARCHAR(64) REFERENCES users(id),
    original_deliverer_user_id VARCHAR(64) REFERENCES users(id),
    correction_deadline DATE,
    manager_notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE,
    assigned_by_user_id VARCHAR(64) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS work_sessions (
    id VARCHAR(64) PRIMARY KEY,
    bug_id VARCHAR(32) NOT NULL,
    employee_id VARCHAR(64) NOT NULL REFERENCES users(id),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accumulated_seconds INTEGER NOT NULL DEFAULT 0,
    is_running BOOLEAN NOT NULL DEFAULT FALSE,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fix_submissions (
    id VARCHAR(64) PRIMARY KEY,
    bug_id VARCHAR(32) NOT NULL,
    task_id VARCHAR(64),
    employee_id VARCHAR(64) NOT NULL REFERENCES users(id),
    fix_description TEXT NOT NULL,
    progress_percentage INTEGER NOT NULL DEFAULT 100,
    status VARCHAR(32) NOT NULL CHECK (status IN ('submitted', 'approved', 'changes_requested')),
    fix_file VARCHAR(255),
    notes TEXT,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_user_id VARCHAR(64) REFERENCES users(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS corrective_time_entries (
    id VARCHAR(64) PRIMARY KEY,
    bug_id VARCHAR(32) NOT NULL,
    task_id VARCHAR(64),
    module_name VARCHAR(128) NOT NULL,
    employee_id VARCHAR(64) NOT NULL REFERENCES users(id),
    hours_spent NUMERIC(8, 2) NOT NULL,
    hours_display VARCHAR(32) NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL,
    calculated_cost NUMERIC(10, 2) NOT NULL,
    proposed_deduction NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'exempted')),
    exemption_reason TEXT,
    entry_date VARCHAR(64) NOT NULL,
    approved_by_user_id VARCHAR(64) REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id),
    user_name VARCHAR(128) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_bugs_assignee ON bug_reports(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_bugs_task ON bug_reports(task_id);
CREATE INDEX IF NOT EXISTS idx_rework_employee ON corrective_time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

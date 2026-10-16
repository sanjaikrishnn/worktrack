-- WorkTrack PostgreSQL database
-- Supplied WorkTrack dataset
-- Target: PostgreSQL 14+

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id                  VARCHAR(50) PRIMARY KEY,
    employee_code       VARCHAR(30) UNIQUE NOT NULL,
    full_name           VARCHAR(150) NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    password_hash       TEXT,
    password_salt       TEXT,
    role                VARCHAR(30) NOT NULL CHECK (role IN ('employee','tester','manager','admin')),
    department          VARCHAR(100),
    job_title           VARCHAR(120),
    hourly_rate         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
    avatar_url          TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id          VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modules (
    id          VARCHAR(50) PRIMARY KEY,
    project_id  VARCHAR(50) NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    name        VARCHAR(150) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
    id                       VARCHAR(50) PRIMARY KEY,
    task_id                  VARCHAR(50) UNIQUE NOT NULL,
    title                    VARCHAR(200) NOT NULL,
    description              TEXT,
    module_id                VARCHAR(50) REFERENCES modules(id) ON DELETE SET NULL,
    module_name              VARCHAR(150),
    assigned_to_user_id      VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    original_delivery_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id       VARCHAR(50) REFERENCES users(id) ON DELETE RESTRICT,
    deadline                 DATE,
    progress                 INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    status                   VARCHAR(30) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','in_progress','completed','reopened','overdue','cancelled')),
    submission_file          TEXT,
    submission_notes         TEXT,
    submitted_at             TIMESTAMPTZ,
    qa_status                VARCHAR(20) DEFAULT 'Pending' CHECK (qa_status IN ('Pass', 'Fail', 'Pending')),
    qa_verified_at           TIMESTAMPTZ,
    qa_verified_by_user_id   VARCHAR(50) REFERENCES users(id),
    qa_defect_reason         TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_status_history (
    id                  VARCHAR(50) PRIMARY KEY,
    task_id             VARCHAR(50) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    previous_status     VARCHAR(30),
    new_status          VARCHAR(30) NOT NULL,
    changed_by_user_id  VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    comment             TEXT,
    "timestamp"         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bug_reports (
    id                       VARCHAR(50) PRIMARY KEY,
    bug_id                   VARCHAR(50) UNIQUE NOT NULL,
    title                    VARCHAR(200) NOT NULL,
    description              TEXT NOT NULL,
    steps_to_reproduce       TEXT,
    expected_result          TEXT,
    actual_result            TEXT,
    severity                 VARCHAR(20) NOT NULL CHECK (severity IN ('Low','Medium','High','Critical')),
    evidence_url             TEXT,
    evidence_name            TEXT,
    task_id                  VARCHAR(50) REFERENCES tasks(id) ON DELETE SET NULL,
    module_id                VARCHAR(50) REFERENCES modules(id) ON DELETE SET NULL,
    module_name              VARCHAR(150),
    reported_by_user_id      VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    reported_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status                   VARCHAR(30) NOT NULL DEFAULT 'reported'
                             CHECK (status IN ('reported','assigned','in_progress','ready_for_review','approved','rejected','closed')),
    assigned_to_user_id      VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    original_deliverer_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    correction_deadline      DATE,
    manager_notes            TEXT,
    assigned_at              TIMESTAMPTZ,
    assigned_by_user_id      VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS work_sessions (
    id                  VARCHAR(50) PRIMARY KEY,
    bug_id              VARCHAR(50) NOT NULL REFERENCES bug_reports(bug_id) ON DELETE CASCADE,
    employee_id         VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    started_at          TIMESTAMPTZ NOT NULL,
    accumulated_seconds  INTEGER NOT NULL DEFAULT 0 CHECK (accumulated_seconds >= 0),
    is_running          BOOLEAN NOT NULL DEFAULT FALSE,
    last_heartbeat_at   TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stopped_at          TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fix_submissions (
    id                    VARCHAR(50) PRIMARY KEY,
    bug_id                VARCHAR(50) NOT NULL REFERENCES bug_reports(bug_id) ON DELETE CASCADE,
    task_id               VARCHAR(50) REFERENCES tasks(id) ON DELETE SET NULL,
    employee_id           VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    fix_description       TEXT NOT NULL,
    progress_percentage   INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    status                VARCHAR(30) NOT NULL DEFAULT 'submitted'
                          CHECK (status IN ('submitted','changes_requested','approved','rejected')),
    fix_file              TEXT,
    notes                 TEXT,
    time_spent_seconds    INTEGER NOT NULL DEFAULT 0 CHECK (time_spent_seconds >= 0),
    submitted_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_user_id   VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    review_notes          TEXT,
    reviewed_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS corrective_time_entries (
    id                  VARCHAR(50) PRIMARY KEY,
    bug_id              VARCHAR(50) NOT NULL REFERENCES bug_reports(bug_id) ON DELETE RESTRICT,
    task_id             VARCHAR(50),
    module_name         VARCHAR(150),
    employee_id         VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    hours_spent         NUMERIC(10,2) NOT NULL CHECK (hours_spent >= 0),
    hours_display       VARCHAR(30),
    hourly_rate         NUMERIC(12,2) NOT NULL CHECK (hourly_rate >= 0),
    calculated_cost     NUMERIC(12,2) NOT NULL CHECK (calculated_cost >= 0),
    proposed_deduction  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (proposed_deduction >= 0),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected','exempted')),
    exemption_reason    TEXT,
    entry_date          DATE NOT NULL,
    approved_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    approved_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
    id          VARCHAR(50) PRIMARY KEY,
    user_id     VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    type        VARCHAR(50) NOT NULL,
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    link        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id           VARCHAR(50) PRIMARY KEY,
    user_id      VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    user_name    VARCHAR(150),
    action       VARCHAR(80) NOT NULL,
    entity_type  VARCHAR(80) NOT NULL,
    entity_id    VARCHAR(100),
    details      TEXT,
    "timestamp"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_assigned_to ON bug_reports(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_work_sessions_employee ON work_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_corrective_entries_employee ON corrective_time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs("timestamp");

-- Seed users from the supplied WorkTrack example.
INSERT INTO users
(id, employee_code, full_name, email, password_hash, password_salt, role, department, job_title, hourly_rate, avatar_url, is_active, created_at)
VALUES
('usr_emp_001','EMP001','John Doe','john.doe@worktrack.com',NULL,NULL,'employee','Engineering','Software Engineer',300.00,'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',TRUE,'2026-01-01 09:00:00+05:30'),
('usr_emp_002','EMP002','Alex Morgan','alex.morgan@worktrack.com',NULL,NULL,'employee','Engineering','Software Engineer',300.00,'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',TRUE,'2026-01-01 09:00:00+05:30'),
('usr_emp_003','EMP003','Rahul Verma','rahul.verma@worktrack.com',NULL,NULL,'employee','Engineering','Backend Developer',300.00,'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',TRUE,'2026-01-01 09:00:00+05:30'),
('usr_emp_004','EMP004','Priya Sharma','priya.sharma@worktrack.com',NULL,NULL,'employee','Engineering','Software Engineer',300.00,'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',TRUE,'2026-01-01 09:00:00+05:30'),
('usr_emp_005','EMP005','Rahul Patel','rahul.patel@worktrack.com',NULL,NULL,'employee','Engineering','API Developer',300.00,'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',TRUE,'2026-01-01 09:00:00+05:30'),
('usr_emp_006','EMP006','Neha Singh','neha.singh@worktrack.com',NULL,NULL,'employee','Engineering','Software Engineer',300.00,'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&q=80&w=200',TRUE,'2026-01-01 09:00:00+05:30'),
('usr_tst_001','TST001','Sarah Tester','tester@worktrack.com',NULL,NULL,'tester','Quality Assurance','QA Tester',300.00,'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=200',TRUE,'2026-01-01 09:00:00+05:30'),
('usr_mgr_001','MGR001','Michael Scott','manager@worktrack.com',NULL,NULL,'manager','Management','Engineering Manager',500.00,'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',TRUE,'2026-01-01 09:00:00+05:30'),
('usr_adm_001','ADM001','Admin Director','admin@worktrack.com',NULL,NULL,'admin','Executive Administration','System Administrator',600.00,'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200',TRUE,'2026-01-01 09:00:00+05:30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, name, description) VALUES
('prj_worktrack','WorkTrack Platform','Task tracking, QA defects, rework timers and payroll review.'),
('prj_billing','Billing Portal','Payment processing and reporting.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO modules (id, project_id, name, description) VALUES
('mod_login','prj_worktrack','Login Module','Authentication and validation.'),
('mod_payment','prj_billing','Payment Gateway','Payment API, webhooks and refunds.'),
('mod_ui','prj_worktrack','UI Enhancement','Responsive layout and navigation.'),
('mod_reporting','prj_worktrack','Reporting','CSV export and charts.'),
('mod_dash','prj_worktrack','Dashboard','Weekly summary widgets.'),
('mod_profile','prj_worktrack','Employee Profile','Profile and settings.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tasks
(id, task_id, title, description, module_id, module_name, assigned_to_user_id, original_delivery_user_id, created_by_user_id,
 deadline, progress, status, submission_file, submission_notes, submitted_at, qa_status, qa_verified_at, qa_verified_by_user_id, created_at, updated_at)
VALUES
('tsk_001','T-001','Login Authentication & Validation','Secure login, session checks and error handling.','mod_login','Login Module','usr_emp_001','usr_emp_001','usr_mgr_001','2026-10-12',100,'completed','login_v1.0.zip','JWT validation delivered.','2026-10-10 14:30:00+05:30','Pass','2026-10-10 15:00:00+05:30','usr_tst_001','2026-10-01 09:00:00+05:30','2026-10-10 14:30:00+05:30'),
('tsk_002','T-002','Payment Gateway Integration','Gateway API, webhook verification and refund callback.','mod_payment','Payment Gateway','usr_emp_001','usr_emp_002','usr_mgr_001','2026-10-22',60,'reopened',NULL,'Webhook checks in progress.',NULL,'Fail','2026-10-11 16:00:00+05:30','usr_tst_001','2026-10-02 10:00:00+05:30','2026-10-11 16:00:00+05:30'),
('tsk_003','T-003','UI Enhancement & Responsive Layout','Mobile layout and navigation drawer.','mod_ui','UI Enhancement','usr_emp_001','usr_emp_001','usr_mgr_001','2026-10-24',100,'completed','ui_responsive_v2.zip','Tailwind breakpoints tested.','2026-10-12 09:00:00+05:30','Pass','2026-10-12 11:20:00+05:30','usr_tst_001','2026-10-05 11:00:00+05:30','2026-10-12 09:00:00+05:30'),
('tsk_004','T-004','Reporting Dashboard Engine','CSV exports and aggregation charts.','mod_reporting','Reporting','usr_emp_003','usr_emp_003','usr_mgr_001','2026-10-25',100,'completed','reporting_engine_v1.zip','CSV streaming verified.','2026-10-12 16:00:00+05:30','Pass','2026-10-12 17:30:00+05:30','usr_tst_001','2026-10-08 09:00:00+05:30','2026-10-08 09:00:00+05:30'),
('tsk_005','TASK-012','Special Character Password Validation','Login fails when the password contains symbols.','mod_login','Login Module','usr_emp_001','usr_emp_001','usr_mgr_001','2026-10-18',60,'reopened',NULL,'Reopened after QA defect BUG-004.',NULL,'Fail','2026-10-16 08:30:00+05:30','usr_tst_001','2026-10-01 09:00:00+05:30','2026-10-16 11:24:00+05:30'),
('tsk_006','TASK-008','Analytics Dashboard Widgets','Monthly summary charts.','mod_dash','Dashboard','usr_emp_004','usr_emp_004','usr_mgr_001','2026-10-14',100,'completed','dash_widgets_v2.zip','Widgets verified.','2026-10-13 17:00:00+05:30','Pass','2026-10-13 18:00:00+05:30','usr_tst_001','2026-10-02 09:00:00+05:30','2026-10-13 17:00:00+05:30'),
('tsk_007','T-006','Employee Profile API','Profile get/update endpoints.','mod_profile','Employee Profile','usr_emp_005','usr_emp_005','usr_mgr_001','2026-10-10',40,'overdue',NULL,'Deadline missed pending defect fix.',NULL,'Pending',NULL,NULL,'2026-09-28 09:00:00+05:30','2026-10-16 09:00:00+05:30'),
('tsk_008','T-007','Login Rate Limit','Throttle repeated failed logins.','mod_login','Login Module','usr_emp_006','usr_emp_006','usr_mgr_001','2026-10-20',100,'completed','rate_limit_fix.zip','Fix delivered.','2026-10-11 16:00:00+05:30','Pass','2026-10-11 16:30:00+05:30','usr_tst_001','2026-10-03 09:00:00+05:30','2026-10-11 16:00:00+05:30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO task_status_history (id, task_id, previous_status, new_status, changed_by_user_id, comment, "timestamp") VALUES
('hist_001','tsk_001','in_progress','completed','usr_emp_001','Deliverable login_v1.0.zip submitted.','2026-10-10 14:30:00+05:30'),
('hist_002','tsk_005','completed','reopened','usr_tst_001','Reopened due to BUG-004.','2026-10-16 09:15:00+05:30'),
('hist_003','tsk_007','in_progress','overdue','usr_mgr_001','Deadline passed.','2026-10-11 00:00:00+05:30'),
('hist_004','tsk_006','in_progress','completed','usr_emp_004','Dashboard widgets submitted.','2026-10-13 17:00:00+05:30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bug_reports
(id, bug_id, title, description, steps_to_reproduce, expected_result, actual_result, severity,
 evidence_url, evidence_name, task_id, module_id, module_name, reported_by_user_id, reported_at, status,
 assigned_to_user_id, original_deliverer_user_id, correction_deadline, manager_notes, assigned_at, assigned_by_user_id)
VALUES
('bug_001','BUG-001','Login validation error on invalid credentials','Failed login does not show a clear error.','1. Open login  2. Enter invalid password  3. Submit','Show invalid-credentials message.','Silent failure or unclear error.','High','/uploads/error-screenshot.png','error-screenshot.png','tsk_002','mod_payment','Payment Gateway','usr_tst_001','2026-10-11 10:15:00+05:30','in_progress','usr_emp_001','usr_emp_002','2026-10-20','Fix validation messaging.','2026-10-11 14:00:00+05:30','usr_mgr_001'),
('bug_002','BUG-002','Weekly summary total mismatch','Weekly totals disagree with detail rows.','1. Open dashboard  2. Open weekly summary  3. Compare totals','Summary matches rows.','Inactive rows omitted from total.','Medium',NULL,NULL,'tsk_004','mod_dash','Dashboard','usr_tst_001','2026-10-12 11:00:00+05:30','in_progress','usr_emp_003','usr_emp_003','2026-10-22','Check cache and empty-state query.','2026-10-12 15:00:00+05:30','usr_mgr_001'),
('bug_003','BUG-003','CSV export timeout','Export fails for more than 5000 rows.','1. Reports  2. 90-day range  3. Export CSV','File downloads.','HTTP 504 timeout.','High','/uploads/export-timeout.log','export-timeout.log','tsk_004','mod_reporting','Reporting','usr_tst_001','2026-10-13 09:30:00+05:30','ready_for_review','usr_emp_004','usr_emp_004','2026-10-20','Stream the file instead of buffering.','2026-10-13 10:00:00+05:30','usr_mgr_001'),
('bug_004','BUG-004','Special character password rejected','Valid passwords with symbols are rejected.','1. Valid user  2. Password with @#$  3. Login','Login succeeds.','Validation error.','High','/uploads/error-screenshot.png','error-screenshot.png','tsk_005','mod_login','Login Module','usr_tst_001','2026-10-16 09:00:00+05:30','assigned','usr_emp_001','usr_emp_001','2026-10-18','Keep validation strict but allow symbols.','2026-10-16 09:30:00+05:30','usr_mgr_001'),
('bug_005','BUG-005','Profile save fails on empty optional field','Saving profile fails if phone is blank.','1. Open profile  2. Clear phone  3. Save','Optional field can be empty.','500 error.','Medium',NULL,NULL,'tsk_007','mod_profile','Employee Profile','usr_tst_001','2026-10-14 10:00:00+05:30','reported',NULL,'usr_emp_005','2026-10-21',NULL,NULL,NULL),
('bug_006','BUG-006','Rate limiter blocks valid retry','After one failed login, a correct password is blocked.','1. Wrong password  2. Correct password immediately','Second attempt allowed.','Request blocked.','Low',NULL,NULL,'tsk_008','mod_login','Login Module','usr_tst_001','2026-10-11 17:00:00+05:30','approved','usr_emp_006','usr_emp_006','2026-10-15','Fix verified.','2026-10-11 17:30:00+05:30','usr_mgr_001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO work_sessions
(id, bug_id, employee_id, started_at, accumulated_seconds, is_running, last_heartbeat_at, updated_at)
VALUES
('ws_001','BUG-004','usr_emp_001','2026-10-16 11:24:00+05:30',9360,FALSE,'2026-10-16 14:00:00+05:30','2026-10-16 14:00:00+05:30'),
('ws_002','BUG-001','usr_emp_001','2026-10-15 10:00:00+05:30',10800,FALSE,'2026-10-15 13:00:00+05:30','2026-10-15 13:00:00+05:30'),
('ws_003','BUG-003','usr_emp_004','2026-10-15 09:00:00+05:30',17400,FALSE,'2026-10-15 13:50:00+05:30','2026-10-15 13:50:00+05:30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fix_submissions
(id, bug_id, task_id, employee_id, fix_description, progress_percentage, status, fix_file, notes,
 time_spent_seconds, submitted_at, reviewed_by_user_id, review_notes, reviewed_at)
VALUES
('fix_001','BUG-001','tsk_002','usr_emp_001','Added credential error-state reset and validation messages.',60,'submitted','fix_v1.1.zip','Awaiting manager review.',10800,'2026-10-15 16:30:00+05:30',NULL,NULL,NULL),
('fix_003','BUG-003','tsk_004','usr_emp_004','Streamed CSV in batches to avoid timeout.',100,'submitted','csv_stream_fix.zip','Ready for verification.',17400,'2026-10-15 17:15:00+05:30',NULL,NULL,NULL),
('fix_004','BUG-004','tsk_005','usr_emp_001','Allow symbols in password; added regression tests.',60,'changes_requested',NULL,'Need more unicode coverage.',9360,'2026-10-16 14:00:00+05:30','usr_mgr_001','Add unicode and emoji test cases.','2026-10-16 15:10:00+05:30'),
('fix_006','BUG-006','tsk_008','usr_emp_006','Reset limiter after a successful login.',100,'approved','rate_limit_fix.zip','QA passed.',7200,'2026-10-12 11:00:00+05:30','usr_mgr_001','Approved.','2026-10-12 16:00:00+05:30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO corrective_time_entries
(id, bug_id, task_id, module_name, employee_id, hours_spent, hours_display, hourly_rate,
 calculated_cost, proposed_deduction, status, exemption_reason, entry_date, approved_by_user_id, approved_at)
VALUES
('cte_001','BUG-004','TASK-012','Login Module','usr_emp_001',2.60,'2h 36m',300.00,780.00,780.00,'approved',NULL,'2026-10-16','usr_mgr_001','2026-10-16 15:00:00+05:30'),
('cte_002','BUG-001','T-002','Payment Gateway','usr_emp_001',3.00,'3h 00m',300.00,900.00,900.00,'approved',NULL,'2026-10-15','usr_mgr_001','2026-10-15 18:00:00+05:30'),
('cte_003','BUG-002','T-004','Dashboard','usr_emp_003',8.25,'8h 15m',300.00,2475.00,2475.00,'pending',NULL,'2026-10-14',NULL,NULL),
('cte_004','BUG-003','T-004','Reporting','usr_emp_004',12.33,'12h 20m',300.00,3700.00,3700.00,'approved',NULL,'2026-10-15','usr_mgr_001','2026-10-15 18:30:00+05:30'),
('cte_005','BUG-005','T-006','Employee Profile','usr_emp_005',6.75,'6h 45m',300.00,2025.00,0.00,'exempted','Root cause is API contract, not engineer error.','2026-10-12','usr_mgr_001','2026-10-16 12:30:00+05:30'),
('cte_006','BUG-006','T-007','Login Module','usr_emp_006',2.00,'2h 00m',300.00,600.00,0.00,'rejected','Duplicate of an already approved login rework.','2026-10-11','usr_mgr_001','2026-10-12 10:00:00+05:30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, user_id, title, message, type, read, link, created_at) VALUES
('ntf_001','usr_emp_001','Bug assigned','BUG-004 assigned to you. Deadline 18 Oct 2026.','assignment',FALSE,'/bug-fixing/BUG-004','2026-10-16 09:30:00+05:30'),
('ntf_002','usr_emp_001','Correction deadline updated','BUG-001 deadline changed to 20 Oct 2026.','deadline',TRUE,'/bug-fixing/BUG-001','2026-10-14 11:00:00+05:30'),
('ntf_003','usr_mgr_001','Fix submitted for review','Priya Sharma submitted a fix for BUG-003.','fix_submitted',FALSE,'/manager/progress','2026-10-15 17:15:00+05:30'),
('ntf_004','usr_emp_001','Changes requested','Manager requested more tests on BUG-004.','changes_requested',FALSE,'/bug-fixing/BUG-004','2026-10-16 15:10:00+05:30'),
('ntf_005','usr_emp_006','Fix approved','Your fix for BUG-006 was approved.','fix_approved',TRUE,'/salary-rework','2026-10-12 16:00:00+05:30'),
('ntf_006','usr_emp_005','Rework exempted','BUG-005 hours were exempted from payroll deduction.','payroll_update',FALSE,'/salary-rework','2026-10-16 12:30:00+05:30'),
('ntf_007','usr_mgr_001','New bug reported','Sarah Tester reported BUG-005 on Employee Profile.','bug_reported',FALSE,'/manager/bug-review/BUG-005','2026-10-14 10:00:00+05:30')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details, "timestamp") VALUES
('aud_001','usr_mgr_001','Michael Scott','CREATE_TASK','task','T-002','Created T-002 and assigned it to John Doe.','2026-10-02 10:00:00+05:30'),
('aud_002','usr_tst_001','Sarah Tester','REPORT_BUG','bug','BUG-004','Reported special-character login defect on TASK-012.','2026-10-16 09:00:00+05:30'),
('aud_003','usr_mgr_001','Michael Scott','ASSIGN_BUG','bug','BUG-004','Assigned BUG-004 to John Doe. Deadline 18 Oct 2026.','2026-10-16 09:30:00+05:30'),
('aud_004','usr_emp_001','John Doe','START_TIMER','work_session','BUG-004','Started corrective timer after rework authentication.','2026-10-16 11:24:00+05:30'),
('aud_005','usr_emp_004','Priya Sharma','SUBMIT_FIX','fix_submission','BUG-003','Submitted CSV stream fix. Time 12h 20m, cost INR 3700.','2026-10-15 17:15:00+05:30'),
('aud_006','usr_mgr_001','Michael Scott','REQUEST_CHANGES','bug','BUG-004','Requested extra unicode tests.','2026-10-16 15:10:00+05:30'),
('aud_007','usr_mgr_001','Michael Scott','APPROVE_FIX','bug','BUG-006','Approved Neha Singh fix.','2026-10-12 16:00:00+05:30'),
('aud_008','usr_mgr_001','Michael Scott','PAYROLL_EXEMPT','corrective_time','cte_005','Exempted Rahul Verma hours for BUG-005.','2026-10-16 12:30:00+05:30')
ON CONFLICT (id) DO NOTHING;

COMMIT;

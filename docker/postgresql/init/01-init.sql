-- テスト用データベースの初期化スクリプト（PostgreSQL版）
-- ENUM型の定義
CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled'
);

CREATE TYPE movement_reason AS ENUM ('transfer', 'return', 'adjustment', 'sale');

CREATE TYPE project_status AS ENUM (
    'planning',
    'active',
    'suspended',
    'completed',
    'cancelled'
);

CREATE TYPE project_role AS ENUM ('member', 'lead', 'analyst', 'designer', 'tester');

CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected', 'paid');

CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- 顧客テーブル
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE customers IS '顧客マスタ';

COMMENT ON COLUMN customers.id IS '顧客ID';

COMMENT ON COLUMN customers.name IS '顧客名';

COMMENT ON COLUMN customers.email IS 'メールアドレス';

COMMENT ON COLUMN customers.phone IS '電話番号';

COMMENT ON COLUMN customers.created_at IS '作成日時';

COMMENT ON COLUMN customers.updated_at IS '更新日時';

-- 商品カテゴリテーブル（SET NULLテスト用）
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

COMMENT ON TABLE categories IS '商品カテゴリマスタ';

COMMENT ON COLUMN categories.id IS 'カテゴリID';

COMMENT ON COLUMN categories.name IS 'カテゴリ名';

COMMENT ON COLUMN categories.description IS '説明';

-- 商品テーブル（DECIMAL型、RESTRICT制約、SET NULL制約のテスト用）
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories (id) ON DELETE SET NULL ON UPDATE CASCADE,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    weight DECIMAL(8, 3),
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE products IS '商品マスタ';

COMMENT ON COLUMN products.id IS '商品ID';

COMMENT ON COLUMN products.category_id IS 'カテゴリID';

COMMENT ON COLUMN products.name IS '商品名';

COMMENT ON COLUMN products.price IS '価格';

COMMENT ON COLUMN products.weight IS '重量(kg)';

COMMENT ON COLUMN products.stock_quantity IS '在庫数';

COMMENT ON COLUMN products.is_active IS '有効フラグ';

COMMENT ON COLUMN products.created_at IS '作成日時';

-- 注文テーブル（RESTRICT制約のテスト用）
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    order_date TIMESTAMP,
    total_amount DECIMAL(12, 2) NOT NULL,
    status order_status
);

COMMENT ON TABLE orders IS '注文テーブル';

COMMENT ON COLUMN orders.id IS '注文ID';

COMMENT ON COLUMN orders.customer_id IS '顧客ID';

COMMENT ON COLUMN orders.order_date IS '注文日時';

COMMENT ON COLUMN orders.total_amount IS '合計金額';

COMMENT ON COLUMN orders.status IS '注文状態';

-- 注文明細テーブル（複合外部キー、NO ACTION制約のテスト用）
CREATE TABLE order_items (
    order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);

COMMENT ON TABLE order_items IS '注文明細テーブル';

COMMENT ON COLUMN order_items.order_id IS '注文ID';

COMMENT ON COLUMN order_items.product_id IS '商品ID';

COMMENT ON COLUMN order_items.quantity IS '数量';

COMMENT ON COLUMN order_items.unit_price IS '単価';

-- タグテーブル（SET DEFAULT制約テスト用の準備）
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    is_default BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE tags IS 'タグマスタ';

COMMENT ON COLUMN tags.id IS 'タグID';

COMMENT ON COLUMN tags.name IS 'タグ名';

COMMENT ON COLUMN tags.is_default IS 'デフォルトタグフラグ';

-- 商品タグ関連テーブル（多対多関係、CASCADE制約とSET DEFAULT制約のテスト用）
CREATE TABLE product_tags (
    product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE,
    tag_id INTEGER DEFAULT 1 REFERENCES tags (id) ON DELETE SET DEFAULT ON UPDATE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, tag_id)
);

COMMENT ON TABLE product_tags IS '商品タグ関連テーブル';

COMMENT ON COLUMN product_tags.product_id IS '商品ID';

COMMENT ON COLUMN product_tags.tag_id IS 'タグID';

COMMENT ON COLUMN product_tags.created_at IS '作成日時';

-- 店舗部門テーブル（複合キー参照用）
CREATE TABLE store_departments (
    store_code VARCHAR(10) NOT NULL,
    department_code VARCHAR(10) NOT NULL,
    store_name VARCHAR(100) NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    manager_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (store_code, department_code),
    UNIQUE (store_name, department_name)
);

COMMENT ON TABLE store_departments IS '店舗部門マスタ';

COMMENT ON COLUMN store_departments.store_code IS '店舗コード';

COMMENT ON COLUMN store_departments.department_code IS '部門コード';

COMMENT ON COLUMN store_departments.store_name IS '店舗名';

COMMENT ON COLUMN store_departments.department_name IS '部門名';

COMMENT ON COLUMN store_departments.manager_name IS '部門責任者名';

COMMENT ON COLUMN store_departments.created_at IS '作成日時';

-- 在庫テーブル（複合外部キーのテスト用）
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE,
    store_code VARCHAR(10) NOT NULL,
    department_code VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, store_code, department_code),
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (store_code, department_code) REFERENCES store_departments (store_code, department_code) ON DELETE RESTRICT ON UPDATE CASCADE
);

COMMENT ON TABLE inventory IS '在庫テーブル';

COMMENT ON COLUMN inventory.id IS '在庫ID';

COMMENT ON COLUMN inventory.product_id IS '商品ID';

COMMENT ON COLUMN inventory.store_code IS '店舗コード';

COMMENT ON COLUMN inventory.department_code IS '部門コード';

COMMENT ON COLUMN inventory.quantity IS '在庫数量';

COMMENT ON COLUMN inventory.reserved_quantity IS '予約済み数量';

COMMENT ON COLUMN inventory.last_updated IS '最終更新日時';

-- 商品移動履歴テーブル（複数の複合外部キーのテスト用）
CREATE TABLE product_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE,
    from_store_code VARCHAR(10),
    from_department_code VARCHAR(10),
    to_store_code VARCHAR(10) NOT NULL,
    to_department_code VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL,
    movement_date TIMESTAMP NOT NULL,
    reason movement_reason NOT NULL,
    FOREIGN KEY (from_store_code, from_department_code) REFERENCES store_departments (store_code, department_code) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (to_store_code, to_department_code) REFERENCES store_departments (store_code, department_code) ON DELETE RESTRICT ON UPDATE CASCADE
);

COMMENT ON TABLE product_movements IS '商品移動履歴テーブル';

COMMENT ON COLUMN product_movements.id IS '移動履歴ID';

COMMENT ON COLUMN product_movements.product_id IS '商品ID';

COMMENT ON COLUMN product_movements.from_store_code IS '移動元店舗コード';

COMMENT ON COLUMN product_movements.from_department_code IS '移動元部門コード';

COMMENT ON COLUMN product_movements.to_store_code IS '移動先店舗コード';

COMMENT ON COLUMN product_movements.to_department_code IS '移動先部門コード';

COMMENT ON COLUMN product_movements.quantity IS '移動数量';

COMMENT ON COLUMN product_movements.movement_date IS '移動日時';

COMMENT ON COLUMN product_movements.reason IS '移動理由';

-- 従業員テーブル（自己参照外部キーのテスト用）
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    manager_id INTEGER REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE,
    department_id INTEGER,
    salary DECIMAL(10, 2),
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE employees IS '従業員マスタ （自己参照外部キーテスト用）';

COMMENT ON COLUMN employees.id IS '従業員ID';

COMMENT ON COLUMN employees.name IS '従業員名';

COMMENT ON COLUMN employees.email IS 'メールアドレス';

COMMENT ON COLUMN employees.manager_id IS '上司ID';

COMMENT ON COLUMN employees.department_id IS '部門ID';

COMMENT ON COLUMN employees.salary IS '給与';

COMMENT ON COLUMN employees.hire_date IS '入社日';

COMMENT ON COLUMN employees.is_active IS '在籍フラグ';

COMMENT ON COLUMN employees.created_at IS '作成日時';

-- 部門テーブル（SET DEFAULT ON UPDATEテスト用）
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_department_id INTEGER DEFAULT 1 REFERENCES departments (id) ON DELETE SET DEFAULT ON UPDATE SET DEFAULT,
    manager_employee_id INTEGER REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE,
    budget DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE departments IS '部門マスタ （SET DEFAULT ON UPDATEテスト用）';

COMMENT ON COLUMN departments.id IS '部門ID';

COMMENT ON COLUMN departments.name IS '部門名';

COMMENT ON COLUMN departments.parent_department_id IS '親部門ID';

COMMENT ON COLUMN departments.manager_employee_id IS '部門長従業員ID';

COMMENT ON COLUMN departments.budget IS '部門予算';

COMMENT ON COLUMN departments.created_at IS '作成日時';

-- 従業員テーブルの部門外部キー制約を追加
ALTER TABLE employees ADD FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL ON UPDATE RESTRICT;

-- プロジェクトテーブル（複雑な参照整合性連鎖テスト用）
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    manager_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    budget DECIMAL(15, 2),
    start_date DATE,
    end_date DATE,
    status project_status DEFAULT 'planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE projects IS 'プロジェクトマスタ （複雑な参照整合性連鎖テスト用）';

COMMENT ON COLUMN projects.id IS 'プロジェクトID';

COMMENT ON COLUMN projects.name IS 'プロジェクト名';

COMMENT ON COLUMN projects.department_id IS '担当部門ID';

COMMENT ON COLUMN projects.manager_id IS 'プロジェクトマネージャーID';

COMMENT ON COLUMN projects.budget IS 'プロジェクト予算';

COMMENT ON COLUMN projects.start_date IS '開始日';

COMMENT ON COLUMN projects.end_date IS '終了日';

COMMENT ON COLUMN projects.status IS 'プロジェクト状態';

COMMENT ON COLUMN projects.created_at IS '作成日時';

-- プロジェクトメンバーテーブル（多対多関係、複雑な制約テスト用）
CREATE TABLE project_members (
    project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE ON UPDATE CASCADE,
    role project_role NOT NULL,
    assignment_date DATE NOT NULL,
    workload_percentage INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (project_id, employee_id)
);

COMMENT ON TABLE project_members IS 'プロジェクトメンバーテーブル （多対多関係、複雑な制約テスト用）';

COMMENT ON COLUMN project_members.project_id IS 'プロジェクトID';

COMMENT ON COLUMN project_members.employee_id IS '従業員ID';

COMMENT ON COLUMN project_members.role IS '役割';

COMMENT ON COLUMN project_members.assignment_date IS 'アサイン日';

COMMENT ON COLUMN project_members.workload_percentage IS '稼働率(%)';

COMMENT ON COLUMN project_members.is_active IS 'アクティブフラグ';

-- 経費テーブル（SET DEFAULT ON UPDATEとNO ACTION制約の組み合わせテスト用）
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    project_id INTEGER DEFAULT 1 REFERENCES projects (id) ON DELETE SET DEFAULT ON UPDATE SET DEFAULT,
    employee_id INTEGER NOT NULL REFERENCES employees (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    description VARCHAR(500),
    status expense_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE expenses IS '経費テーブル （SET DEFAULT ON UPDATEとNO ACTION制約の組み合わせテスト用）';

COMMENT ON COLUMN expenses.id IS '経費ID';

COMMENT ON COLUMN expenses.project_id IS 'プロジェクトID';

COMMENT ON COLUMN expenses.employee_id IS '申請者従業員ID';

COMMENT ON COLUMN expenses.amount IS '金額';

COMMENT ON COLUMN expenses.expense_date IS '経費発生日';

COMMENT ON COLUMN expenses.description IS '経費説明';

COMMENT ON COLUMN expenses.status IS '承認状態';

COMMENT ON COLUMN expenses.created_at IS '作成日時';

-- 監査ログテーブル（参照整合性制約なしの履歴テーブル）
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action audit_action NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_logs IS '監査ログテーブル （参照整合性制約なしの履歴テーブル）';

COMMENT ON COLUMN audit_logs.id IS '監査ログID';

COMMENT ON COLUMN audit_logs.table_name IS '対象テーブル名';

COMMENT ON COLUMN audit_logs.record_id IS '対象レコードID';

COMMENT ON COLUMN audit_logs.action IS 'アクション';

COMMENT ON COLUMN audit_logs.old_values IS '変更前の値';

COMMENT ON COLUMN audit_logs.new_values IS '変更後の値';

COMMENT ON COLUMN audit_logs.user_id IS '実行ユーザーID';

COMMENT ON COLUMN audit_logs.timestamp IS '実行日時';

-- テストデータの挿入
-- カテゴリデータ
INSERT INTO
    categories (name, description)
VALUES
    ('電子機器', 'パソコン、スマートフォンなどの電子機器'),
    ('書籍', '本、雑誌、電子書籍'),
    ('衣料品', '洋服、靴、アクセサリー');

-- 商品データ
INSERT INTO
    products (category_id, name, price, weight, stock_quantity)
VALUES
    (1, 'ノートパソコン', 89999.99, 2.150, 5),
    (1, 'スマートフォン', 79800.00, 0.180, 10),
    (2, 'プログラミング入門書', 2980.00, 0.450, 20),
    (NULL, 'カテゴリ未設定商品', 1000.00, 0.100, 1);

-- 顧客データ
INSERT INTO
    customers (name, email, phone)
VALUES
    ('田中 太郎', 'tanaka@example.com', '090-1234-5678'),
    ('佐藤 花子', 'sato@example.com', '080-9876-5432'),
    ('鈴木 次郎', 'suzuki@example.com', '070-1111-2222');

-- 注文データ
INSERT INTO
    orders (customer_id, order_date, total_amount, status)
VALUES
    (1, '2024-01-15 10:30:00', 89999.99, 'confirmed'),
    (2, '2024-01-16 14:20:00', 82780.00, 'shipped'),
    (3, '2024-01-17 09:45:00', 2980.00, 'delivered');

-- 注文明細データ
INSERT INTO
    order_items (order_id, product_id, quantity, unit_price)
VALUES
    (1, 1, 1, 89999.99),
    (2, 1, 1, 89999.99),
    (2, 2, 1, 79800.00),
    (3, 3, 1, 2980.00);

-- タグデータ
INSERT INTO
    tags (name, is_default)
VALUES
    ('デフォルト', TRUE),
    ('技術', FALSE),
    ('日記', FALSE),
    ('レビュー', FALSE);

-- 商品タグデータ
INSERT INTO
    product_tags (product_id, tag_id)
VALUES
    (1, 2),
    (1, 4),
    (2, 2),
    (3, 1);

-- 店舗部門データ
INSERT INTO
    store_departments (
        store_code,
        department_code,
        store_name,
        department_name,
        manager_name
    )
VALUES
    ('ST001', 'ELEC', '渋谷店', '電子機器部門', '田中部長'),
    ('ST001', 'BOOK', '渋谷店', '書籍部門', '佐藤部長'),
    ('ST002', 'ELEC', '新宿店', '電子機器部門', '鈴木部長'),
    ('ST002', 'BOOK', '新宿店', '書籍部門', '高橋部長'),
    ('ST003', 'BOOK', '池袋店', '書籍部門', '山田部長');

-- 在庫データ
INSERT INTO
    inventory (
        product_id,
        store_code,
        department_code,
        quantity,
        reserved_quantity
    )
VALUES
    (1, 'ST001', 'ELEC', 3, 1),
    (2, 'ST001', 'ELEC', 8, 2),
    (3, 'ST001', 'BOOK', 15, 0),
    (1, 'ST002', 'ELEC', 2, 0),
    (2, 'ST002', 'ELEC', 5, 1),
    (3, 'ST002', 'BOOK', 10, 0),
    (3, 'ST003', 'BOOK', 25, 3);

-- 従業員データ（階層構造テスト用）
INSERT INTO
    employees (name, email, manager_id, salary, hire_date)
VALUES
    (
        'CEO 田中',
        'ceo.tanaka@company.com',
        NULL,
        1000000.00,
        '2020-01-01'
    ),
    (
        '部長 佐藤',
        'bucho.sato@company.com',
        1,
        800000.00,
        '2020-02-01'
    ),
    (
        '課長 鈴木',
        'kacho.suzuki@company.com',
        2,
        600000.00,
        '2020-03-01'
    ),
    (
        '主任 山田',
        'shunin.yamada@company.com',
        3,
        500000.00,
        '2020-04-01'
    ),
    (
        '担当 高橋',
        'tanto.takahashi@company.com',
        4,
        400000.00,
        '2020-05-01'
    ),
    (
        '担当 中村',
        'tanto.nakamura@company.com',
        4,
        400000.00,
        '2020-06-01'
    );

-- 部門データ（SET DEFAULT ON UPDATEテスト用）
INSERT INTO
    departments (
        name,
        parent_department_id,
        manager_employee_id,
        budget
    )
VALUES
    ('全社', NULL, 1, 10000000.00),
    ('技術部', 1, 2, 5000000.00),
    ('営業部', 1, 3, 3000000.00),
    ('管理部', 1, 4, 2000000.00),
    ('開発課', 2, 5, 2500000.00),
    ('品質保証課', 2, 6, 1500000.00);

-- 従業員の部門割り当て更新
UPDATE employees
SET
    department_id = 2
WHERE
    id IN (2, 5, 6);

UPDATE employees
SET
    department_id = 3
WHERE
    id = 3;

UPDATE employees
SET
    department_id = 4
WHERE
    id = 4;

UPDATE employees
SET
    department_id = 1
WHERE
    id = 1;

-- プロジェクトデータ
INSERT INTO
    projects (
        name,
        department_id,
        manager_id,
        budget,
        start_date,
        end_date,
        status
    )
VALUES
    (
        '新システム開発',
        2,
        2,
        5000000.00,
        '2024-01-01',
        '2024-12-31',
        'active'
    ),
    (
        '顧客管理システム改修',
        2,
        5,
        2000000.00,
        '2024-02-01',
        '2024-08-31',
        'active'
    ),
    (
        '新規営業戦略',
        3,
        3,
        1000000.00,
        '2024-01-15',
        '2024-06-30',
        'planning'
    ),
    (
        '内部監査システム',
        4,
        4,
        800000.00,
        '2024-03-01',
        '2024-09-30',
        'planning'
    );

-- プロジェクトメンバーデータ
INSERT INTO
    project_members (
        project_id,
        employee_id,
        role,
        assignment_date,
        workload_percentage
    )
VALUES
    (1, 2, 'lead', '2024-01-01', 50),
    (1, 5, 'member', '2024-01-01', 80),
    (1, 6, 'tester', '2024-01-01', 60),
    (2, 5, 'lead', '2024-02-01', 20),
    (2, 6, 'member', '2024-02-01', 40),
    (3, 3, 'lead', '2024-01-15', 100),
    (4, 4, 'lead', '2024-03-01', 100);

-- 経費データ
INSERT INTO
    expenses (
        project_id,
        employee_id,
        amount,
        expense_date,
        description,
        status
    )
VALUES
    (
        1,
        2,
        50000.00,
        '2024-01-15',
        '開発環境構築費用',
        'approved'
    ),
    (1, 5, 15000.00, '2024-01-20', '技術書籍購入', 'pending'),
    (
        2,
        5,
        8000.00,
        '2024-02-05',
        'ソフトウェアライセンス',
        'approved'
    ),
    (3, 3, 25000.00, '2024-01-25', '市場調査費用', 'pending'),
    (
        4,
        4,
        12000.00,
        '2024-03-10',
        '監査ツール購入',
        'pending'
    );

-- 商品移動履歴データ
INSERT INTO
    product_movements (
        product_id,
        from_store_code,
        from_department_code,
        to_store_code,
        to_department_code,
        quantity,
        movement_date,
        reason
    )
VALUES
    (
        1,
        'ST001',
        'ELEC',
        'ST002',
        'ELEC',
        2,
        '2024-01-10 10:00:00',
        'transfer'
    ),
    (
        2,
        'ST002',
        'ELEC',
        'ST001',
        'ELEC',
        3,
        '2024-01-12 14:30:00',
        'return'
    ),
    (
        3,
        'ST001',
        'BOOK',
        'ST003',
        'BOOK',
        5,
        '2024-01-15 09:15:00',
        'transfer'
    ),
    (
        1,
        NULL,
        NULL,
        'ST001',
        'ELEC',
        10,
        '2024-01-20 16:00:00',
        'adjustment'
    );

-- 監査ログデータ
INSERT INTO
    audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id
    )
VALUES
    (
        'products',
        1,
        'UPDATE',
        '{"price": 85000.00}',
        '{"price": 89999.99}',
        1
    ),
    (
        'customers',
        1,
        'INSERT',
        NULL,
        '{"name": "田中 太郎", "email": "tanaka@example.com"}',
        1
    ),
    (
        'orders',
        1,
        'UPDATE',
        '{"status": "pending"}',
        '{"status": "confirmed"}',
        2
    );

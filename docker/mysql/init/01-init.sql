-- テスト用データベースの初期化スクリプト
USE test_database;

-- 顧客テーブル
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '顧客ID',
    name VARCHAR(100) NOT NULL COMMENT '顧客名',
    email VARCHAR(255) UNIQUE NOT NULL COMMENT 'メールアドレス',
    phone VARCHAR(20) COMMENT '電話番号',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時'
) COMMENT = '顧客マスタ';

-- 商品カテゴリテーブル（SET NULLテスト用）
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'カテゴリID',
    name VARCHAR(100) NOT NULL COMMENT 'カテゴリ名',
    description TEXT COMMENT '説明'
) COMMENT = '商品カテゴリマスタ';

-- 商品テーブル（DECIMAL型、RESTRICT制約、SET NULL制約のテスト用）
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '商品ID',
    category_id INT COMMENT 'カテゴリID',
    name VARCHAR(200) NOT NULL COMMENT '商品名',
    price DECIMAL(10, 2) NOT NULL COMMENT '価格',
    weight DECIMAL(8, 3) COMMENT '重量(kg)',
    stock_quantity INT DEFAULT 0 COMMENT '在庫数',
    is_active BOOLEAN DEFAULT TRUE COMMENT '有効フラグ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL ON UPDATE CASCADE
) COMMENT = '商品マスタ';

-- 注文テーブル（RESTRICT制約のテスト用）
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '注文ID',
    customer_id INT NOT NULL COMMENT '顧客ID',
    order_date DATETIME COMMENT '注文日時',
    total_amount DECIMAL(12, 2) NOT NULL COMMENT '合計金額',
    status ENUM (
        'pending',
        'confirmed',
        'shipped',
        'delivered',
        'cancelled'
    ) COMMENT '注文状態',
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) COMMENT = '注文テーブル';

-- 注文明細テーブル（複合外部キー、NO ACTION制約のテスト用）
CREATE TABLE order_items (
    order_id INT NOT NULL COMMENT '注文ID',
    product_id INT NOT NULL COMMENT '商品ID',
    quantity INT NOT NULL COMMENT '数量',
    unit_price DECIMAL(10, 2) NOT NULL COMMENT '単価',
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE
) COMMENT = '注文明細テーブル';

-- タグテーブル（SET DEFAULT制約テスト用の準備）
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'タグID',
    name VARCHAR(50) NOT NULL UNIQUE COMMENT 'タグ名',
    is_default BOOLEAN DEFAULT FALSE COMMENT 'デフォルトタグフラグ'
) COMMENT = 'タグマスタ';

-- 商品タグ関連テーブル（多対多関係、CASCADE制約とSET DEFAULT制約のテスト用）
CREATE TABLE product_tags (
    product_id INT NOT NULL COMMENT '商品ID',
    tag_id INT DEFAULT 1 COMMENT 'タグID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    PRIMARY KEY (product_id, tag_id),
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE SET DEFAULT ON UPDATE CASCADE
) COMMENT = '商品タグ関連テーブル';

-- 店舗部門テーブル（複合キー参照用）
CREATE TABLE store_departments (
    store_code VARCHAR(10) NOT NULL COMMENT '店舗コード',
    department_code VARCHAR(10) NOT NULL COMMENT '部門コード',
    store_name VARCHAR(100) NOT NULL COMMENT '店舗名',
    department_name VARCHAR(100) NOT NULL COMMENT '部門名',
    manager_name VARCHAR(100) COMMENT '部門責任者名',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    PRIMARY KEY (store_code, department_code),
    UNIQUE KEY unique_store_dept_name (store_name, department_name)
) COMMENT = '店舗部門マスタ';

-- 在庫テーブル（複合外部キーのテスト用）
CREATE TABLE inventory (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '在庫ID',
    product_id INT NOT NULL COMMENT '商品ID',
    store_code VARCHAR(10) NOT NULL COMMENT '店舗コード',
    department_code VARCHAR(10) NOT NULL COMMENT '部門コード',
    quantity INT NOT NULL DEFAULT 0 COMMENT '在庫数量',
    reserved_quantity INT NOT NULL DEFAULT 0 COMMENT '予約済み数量',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最終更新日時',
    UNIQUE KEY unique_product_store_dept (product_id, store_code, department_code),
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (store_code, department_code) REFERENCES store_departments (store_code, department_code) ON DELETE RESTRICT ON UPDATE CASCADE
) COMMENT = '在庫テーブル';

-- 商品移動履歴テーブル（複数の複合外部キーのテスト用）
CREATE TABLE product_movements (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '移動履歴ID',
    product_id INT NOT NULL COMMENT '商品ID',
    from_store_code VARCHAR(10) COMMENT '移動元店舗コード',
    from_department_code VARCHAR(10) COMMENT '移動元部門コード',
    to_store_code VARCHAR(10) NOT NULL COMMENT '移動先店舗コード',
    to_department_code VARCHAR(10) NOT NULL COMMENT '移動先部門コード',
    quantity INT NOT NULL COMMENT '移動数量',
    movement_date DATETIME NOT NULL COMMENT '移動日時',
    reason ENUM ('transfer', 'return', 'adjustment', 'sale') NOT NULL COMMENT '移動理由',
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (from_store_code, from_department_code) REFERENCES store_departments (store_code, department_code) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (to_store_code, to_department_code) REFERENCES store_departments (store_code, department_code) ON DELETE RESTRICT ON UPDATE CASCADE
) COMMENT = '商品移動履歴テーブル';

-- テスト用データの追加挿入
INSERT INTO
    categories (name, description)
VALUES
    ('電子機器', 'パソコン、スマートフォンなどの電子機器'),
    ('書籍', '本、雑誌、電子書籍'),
    ('衣料品', '洋服、靴、アクセサリー');

INSERT INTO
    products (category_id, name, price, weight, stock_quantity)
VALUES
    (1, 'ノートパソコン', 89999.99, 2.150, 5),
    (1, 'スマートフォン', 79800.00, 0.180, 10),
    (2, 'プログラミング入門書', 2980.00, 0.450, 20),
    (NULL, 'カテゴリ未設定商品', 1000.00, 0.100, 1);

-- 顧客データの挿入
INSERT INTO
    customers (name, email, phone)
VALUES
    ('田中 太郎', 'tanaka@example.com', '090-1234-5678'),
    ('佐藤 花子', 'sato@example.com', '080-9876-5432'),
    ('鈴木 次郎', 'suzuki@example.com', '070-1111-2222');

INSERT INTO
    orders (customer_id, order_date, total_amount, status)
VALUES
    (1, '2024-01-15 10:30:00', 89999.99, 'confirmed'),
    (2, '2024-01-16 14:20:00', 82780.00, 'shipped'),
    (3, '2024-01-17 09:45:00', 2980.00, 'delivered');

INSERT INTO
    order_items (order_id, product_id, quantity, unit_price)
VALUES
    (1, 1, 1, 89999.99),
    (2, 1, 1, 89999.99),
    (2, 2, 1, 79800.00),
    (3, 3, 1, 2980.00);

INSERT INTO
    tags (name, is_default)
VALUES
    ('デフォルト', TRUE),
    ('技術', FALSE),
    ('日記', FALSE),
    ('レビュー', FALSE);

INSERT INTO
    product_tags (product_id, tag_id)
VALUES
    (1, 2),
    (1, 4),
    (2, 2),
    (3, 1);

-- 店舗部門データの挿入
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

-- 在庫データの挿入
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
    (2, 'ST001', 'ELEC', 5, 2),
    (1, 'ST002', 'ELEC', 2, 0),
    (3, 'ST001', 'BOOK', 15, 3),
    (3, 'ST002', 'BOOK', 0, 0),
    (3, 'ST003', 'BOOK', 8, 1);

-- 商品移動履歴の挿入
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
        'ST002',
        'ELEC',
        'ST001',
        'ELEC',
        1,
        '2024-01-10 10:00:00',
        'transfer'
    ),
    (
        3,
        NULL,
        NULL,
        'ST003',
        'BOOK',
        10,
        '2024-01-12 14:30:00',
        'adjustment'
    ),
    (
        2,
        'ST001',
        'ELEC',
        'ST002',
        'ELEC',
        2,
        '2024-01-14 09:15:00',
        'return'
    );

-- 以下、参照整合性制約の追加テストケース
-- 従業員テーブル（自己参照外部キーのテスト用）
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '従業員ID',
    name VARCHAR(100) NOT NULL COMMENT '従業員名',
    email VARCHAR(255) UNIQUE NOT NULL COMMENT 'メールアドレス',
    manager_id INT COMMENT '上司ID',
    department_id INT COMMENT '部門ID',
    salary DECIMAL(10, 2) COMMENT '給与',
    hire_date DATE COMMENT '入社日',
    is_active BOOLEAN DEFAULT TRUE COMMENT '在籍フラグ',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    FOREIGN KEY (manager_id) REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE
) COMMENT = '従業員マスタ （自己参照外部キーテスト用）';

-- 部門テーブル（SET DEFAULT ON UPDATEテスト用）
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '部門ID',
    name VARCHAR(100) NOT NULL COMMENT '部門名',
    parent_department_id INT DEFAULT 1 COMMENT '親部門ID',
    manager_employee_id INT COMMENT '部門長従業員ID',
    budget DECIMAL(15, 2) COMMENT '部門予算',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    FOREIGN KEY (parent_department_id) REFERENCES departments (id) ON DELETE SET DEFAULT ON UPDATE SET DEFAULT,
    FOREIGN KEY (manager_employee_id) REFERENCES employees (id) ON DELETE SET NULL ON UPDATE CASCADE
) COMMENT = '部門マスタ （SET DEFAULT ON UPDATEテスト用）';

-- 従業員テーブルの部門外部キー制約を追加
ALTER TABLE employees ADD FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL ON UPDATE RESTRICT;

-- プロジェクトテーブル（複雑な参照整合性連鎖テスト用）
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'プロジェクトID',
    name VARCHAR(200) NOT NULL COMMENT 'プロジェクト名',
    department_id INT NOT NULL COMMENT '担当部門ID',
    manager_id INT NOT NULL COMMENT 'プロジェクトマネージャーID',
    budget DECIMAL(15, 2) COMMENT 'プロジェクト予算',
    start_date DATE COMMENT '開始日',
    end_date DATE COMMENT '終了日',
    status ENUM (
        'planning',
        'active',
        'suspended',
        'completed',
        'cancelled'
    ) DEFAULT 'planning' COMMENT 'プロジェクト状態',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES employees (id) ON DELETE RESTRICT ON UPDATE CASCADE
) COMMENT = 'プロジェクトマスタ （複雑な参照整合性連鎖テスト用）';

-- プロジェクトメンバーテーブル（多対多関係、複雑な制約テスト用）
CREATE TABLE project_members (
    project_id INT NOT NULL COMMENT 'プロジェクトID',
    employee_id INT NOT NULL COMMENT '従業員ID',
    role ENUM ('member', 'lead', 'analyst', 'designer', 'tester') NOT NULL COMMENT '役割',
    assignment_date DATE NOT NULL COMMENT 'アサイン日',
    workload_percentage INT DEFAULT 100 COMMENT '稼働率(%)',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'アクティブフラグ',
    PRIMARY KEY (project_id, employee_id),
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE ON UPDATE CASCADE
) COMMENT = 'プロジェクトメンバーテーブル （多対多関係、複雑な制約テスト用）';

-- 経費テーブル（SET DEFAULT ON UPDATEとNO ACTION制約の組み合わせテスト用）
CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '経費ID',
    project_id INT DEFAULT 1 COMMENT 'プロジェクトID',
    employee_id INT NOT NULL COMMENT '申請者従業員ID',
    amount DECIMAL(10, 2) NOT NULL COMMENT '金額',
    expense_date DATE NOT NULL COMMENT '経費発生日',
    description VARCHAR(500) COMMENT '経費説明',
    status ENUM ('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending' COMMENT '承認状態',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET DEFAULT ON UPDATE SET DEFAULT,
    FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE NO ACTION ON UPDATE NO ACTION
) COMMENT = '経費テーブル （SET DEFAULT ON UPDATEとNO ACTION制約の組み合わせテスト用）';

-- 監査ログテーブル（参照整合性制約なしの履歴テーブル）
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '監査ログID',
    table_name VARCHAR(100) NOT NULL COMMENT '対象テーブル名',
    record_id INT NOT NULL COMMENT '対象レコードID',
    action ENUM ('INSERT', 'UPDATE', 'DELETE') NOT NULL COMMENT 'アクション',
    old_values JSON COMMENT '変更前の値',
    new_values JSON COMMENT '変更後の値',
    user_id INT COMMENT '実行ユーザーID',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '実行日時'
) COMMENT = '監査ログテーブル （参照整合性制約なしの履歴テーブル）';

-- テストデータの挿入
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

-- 経費データ（SET DEFAULT ON UPDATEテスト用）
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
        'システム設計書籍購入',
        'approved'
    ),
    (
        1,
        5,
        30000.00,
        '2024-01-20',
        '開発環境構築費用',
        'approved'
    ),
    (
        2,
        5,
        20000.00,
        '2024-02-10',
        'テスト環境維持費',
        'pending'
    ),
    (
        3,
        3,
        15000.00,
        '2024-01-25',
        '市場調査資料購入',
        'approved'
    ),
    (
        NULL,
        4,
        10000.00,
        '2024-02-01',
        '一般事務用品購入',
        'approved'
    );

-- 監査ログサンプルデータ
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
        'employees',
        1,
        'INSERT',
        NULL,
        '{"name": "CEO 田中", "email": "ceo.tanaka@company.com"}',
        1
    ),
    (
        'projects',
        1,
        'INSERT',
        NULL,
        '{"name": "新システム開発", "status": "planning"}',
        2
    ),
    (
        'projects',
        1,
        'UPDATE',
        '{"status": "planning"}',
        '{"status": "active"}',
        2
    );

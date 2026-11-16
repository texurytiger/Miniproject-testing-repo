-- Team 3 Store · schema (MySQL 8 / MariaDB 10.4+ via XAMPP)
-- E3 owns these tables. E1 (authorization) reads roles/permissions and writes audit_log.
-- Run with: npm run db:reset   (drops and recreates everything, then loads seed.sql)

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_log, products, categories, role_permissions, users, permissions, roles;
SET FOREIGN_KEY_CHECKS = 1;

-- Role tree: parent_role_id points UP. A child inherits every permission of its ancestors.
CREATE TABLE roles (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  name           VARCHAR(40)  NOT NULL UNIQUE,
  description    VARCHAR(160) NOT NULL DEFAULT '',
  parent_role_id INT NULL,
  staff_login    TINYINT(1)   NOT NULL DEFAULT 0,   -- 1 = can be picked on a staff sign-in page
  CONSTRAINT fk_role_parent FOREIGN KEY (parent_role_id) REFERENCES roles(id) ON DELETE SET NULL
);

-- "resource:action". An action ending in _own is limited to rows the user owns (FR-10).
CREATE TABLE permissions (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  resource    VARCHAR(40)  NOT NULL,
  action      VARCHAR(40)  NOT NULL,
  description VARCHAR(160) NOT NULL DEFAULT '',
  UNIQUE KEY uq_perm (resource, action)
);

CREATE TABLE role_permissions (
  role_id       INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  name           VARCHAR(80)  NOT NULL,
  email          VARCHAR(120) NOT NULL UNIQUE,
  password_hash  CHAR(60)     NOT NULL,              -- bcrypt, cost factor 10
  role_id        INT          NOT NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  token_version  INT          NOT NULL DEFAULT 0,    -- bumped on logout / password change / deactivate: old JWTs stop working
  failed_logins  INT          NOT NULL DEFAULT 0,
  locked_until   DATETIME     NULL,                  -- 5 wrong passwords = locked for 15 minutes
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Insert-only. Every ALLOW and DENY decision lands here (FR-11).
CREATE TABLE audit_log (
  id         BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id    INT NULL,
  email      VARCHAR(120) NULL,
  resource   VARCHAR(40) NOT NULL,
  action     VARCHAR(40) NOT NULL,
  owner_id   INT NULL,
  decision   ENUM('ALLOW','DENY') NOT NULL,
  reason     VARCHAR(40) NOT NULL,
  ip         VARCHAR(45) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_audit_user (user_id, id),
  KEY ix_audit_decision (decision, id)
);

-- Minimal catalog so the storefront has real rows to show. E2 will own the full catalog logic.
CREATE TABLE categories (
  id   INT PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(60) NOT NULL
);

CREATE TABLE products (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  seller_id   INT NOT NULL,                          -- owner, used by FR-10 ownership checks
  category_id INT NOT NULL,
  name        VARCHAR(120) NOT NULL,
  description VARCHAR(400) NOT NULL DEFAULT '',
  price       DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  mrp         DECIMAL(10,2) NOT NULL CHECK (mrp >= 0),
  rating      DECIMAL(2,1)  NOT NULL DEFAULT 4.0,
  reviews     INT           NOT NULL DEFAULT 0,
  stock       INT           NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image       VARCHAR(30)   NOT NULL,                -- key of a built-in illustration on the frontend
  status      ENUM('PENDING','APPROVED','SOLD_OUT') NOT NULL DEFAULT 'APPROVED',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prod_seller FOREIGN KEY (seller_id) REFERENCES users(id),
  CONSTRAINT fk_prod_cat FOREIGN KEY (category_id) REFERENCES categories(id),
  FULLTEXT KEY ft_products (name, description)
);

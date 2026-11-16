-- Team 3 Store · seed data. Every demo password is Password@123 (bcrypt cost 10).
-- IDs matter: the self-test page expects these exact ids.

INSERT INTO roles (id, name, description, parent_role_id, staff_login) VALUES
 (1, 'ADMIN',           'Runs the platform: users, roles, audit',            NULL, 0),
 (2, 'CUSTOMER',        'Shops, places orders, tracks deliveries',           NULL, 0),
 (3, 'EMPLOYEE',        'Base role for internal staff (abstract parent)',    NULL, 0),
 (4, 'FINANCE',         'Payments, refunds and financial reports',           3,    1),
 (5, 'WAREHOUSE_STAFF', 'Packs and ships orders, keeps stock accurate',      3,    1),
 (6, 'SELLER',          'Lists products and manages own inventory',          NULL, 0),
 (7, 'CEO',             'Future scope: oversight (no permissions yet)',      NULL, 1);

INSERT INTO permissions (resource, action, description) VALUES
 ('user','read','See every user account'),
 ('user','read_own','See your own profile'),
 ('user','update_own','Edit your own profile and password'),
 ('user','assign_role','Change another user''s role'),
 ('user','deactivate','Deactivate or reactivate accounts'),
 ('role','manage','Create roles, change parents, grant permissions'),
 ('audit','read','Read the authorization audit log'),
 ('product','read','Browse the catalog'),
 ('product','create','List a new product'),
 ('product','update','Edit any product'),
 ('product','update_own','Edit products you listed'),
 ('product','delete_own','Remove products you listed'),
 ('product','approve','Approve listings for the storefront'),
 ('stock','read','See stock levels'),
 ('stock','update','Correct stock levels'),
 ('order','create','Place an order'),
 ('order','read','See every order'),
 ('order','read_own','See your own orders'),
 ('order','cancel_own','Cancel your own order'),
 ('order','update_status','Move orders through packing and shipping'),
 ('payment','create','Pay for an order'),
 ('payment','read','See every payment'),
 ('payment','read_own','See your own payments'),
 ('refund','request_own','Request a refund for your own order'),
 ('refund','approve','Approve or reject refunds'),
 ('report','read','Read financial reports');

-- helper: grant by name
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON
 (r.name = 'ADMIN' AND p.resource IN ('user','role','audit','product','stock','order','payment','refund','report')
                   AND (p.action NOT LIKE '%\_own' OR p.resource = 'user'))
 OR (r.name = 'CUSTOMER' AND CONCAT(p.resource,':',p.action) IN
     ('product:read','order:create','order:read_own','order:cancel_own','payment:create','payment:read_own',
      'refund:request_own','user:read_own','user:update_own'))
 OR (r.name = 'EMPLOYEE' AND CONCAT(p.resource,':',p.action) IN ('product:read','user:read_own','user:update_own'))
 OR (r.name = 'FINANCE' AND CONCAT(p.resource,':',p.action) IN ('order:read','payment:read','refund:approve','report:read'))
 OR (r.name = 'WAREHOUSE_STAFF' AND CONCAT(p.resource,':',p.action) IN ('order:read','order:update_status','stock:read','stock:update'))
 OR (r.name = 'SELLER' AND CONCAT(p.resource,':',p.action) IN
     ('product:read','product:create','product:update_own','product:delete_own','stock:read','user:read_own','user:update_own'));
-- CEO gets nothing on purpose: every protected request is denied by default.

INSERT INTO users (id, name, email, password_hash, role_id, is_active) VALUES
 (1, 'Riya Admin',      'admin@team3.test',     '$2b$10$KIMPw0dfl5svl90Qyva9aesnZeCvQ6lUrRl14FDBu2JTvWRMJ24ly', 1, 1),
 (2, 'Arjun Mehta',     'customer@team3.test',  '$2b$10$KIMPw0dfl5svl90Qyva9aesnZeCvQ6lUrRl14FDBu2JTvWRMJ24ly', 2, 1),
 (3, 'Kavya Crafts',    'seller1@team3.test',   '$2b$10$KIMPw0dfl5svl90Qyva9aesnZeCvQ6lUrRl14FDBu2JTvWRMJ24ly', 6, 1),
 (4, 'Nilgiri Goods',   'seller2@team3.test',   '$2b$10$KIMPw0dfl5svl90Qyva9aesnZeCvQ6lUrRl14FDBu2JTvWRMJ24ly', 6, 1),
 (5, 'Priya Finance',   'finance@team3.test',   '$2b$10$KIMPw0dfl5svl90Qyva9aesnZeCvQ6lUrRl14FDBu2JTvWRMJ24ly', 4, 1),
 (6, 'Rahul Warehouse', 'warehouse@team3.test', '$2b$10$KIMPw0dfl5svl90Qyva9aesnZeCvQ6lUrRl14FDBu2JTvWRMJ24ly', 5, 1),
 (7, 'Vikram CEO',      'ceo@team3.test',       '$2b$10$KIMPw0dfl5svl90Qyva9aesnZeCvQ6lUrRl14FDBu2JTvWRMJ24ly', 7, 1),
 (8, 'Old Account',     'inactive@team3.test',  '$2b$10$KIMPw0dfl5svl90Qyva9aesnZeCvQ6lUrRl14FDBu2JTvWRMJ24ly', 2, 0);

INSERT INTO categories (id, slug, name) VALUES
 (1,'electronics','Electronics'), (2,'home','Home & Kitchen'), (3,'fashion','Fashion'),
 (4,'books','Books'), (5,'beauty','Beauty'), (6,'sports','Sports & Outdoors');

INSERT INTO products (seller_id, category_id, name, description, price, mrp, rating, reviews, stock, image, status) VALUES
 (3,1,'Aura Wireless Headphones','Over-ear, 40 h battery, active noise cancelling.',4999,7999,4.4,2311,24,'headphones','APPROVED'),
 (3,1,'Pulse Smartwatch S2','AMOLED display, heart-rate and SpO2, 7-day battery.',3499,5999,4.2,1840,40,'watch','APPROVED'),
 (4,1,'Lumen Desk Lamp','Warm-to-cool LED, USB-C, touch dimmer.',1299,1999,4.5,902,60,'lamp','APPROVED'),
 (4,1,'Echo Mini Speaker','Portable Bluetooth speaker, IPX7 waterproof.',1799,2999,4.3,3105,35,'speaker','APPROVED'),
 (3,1,'Frame 14 Laptop Sleeve','Padded felt sleeve for 13–14 inch laptops.',899,1499,4.1,412,80,'sleeve','APPROVED'),
 (4,1,'Snap Instant Camera','Instant prints, built-in flash, selfie mirror.',5499,6999,4.6,768,12,'camera','APPROVED'),
 (4,2,'Terra Ceramic Mug Set','Set of 4 stoneware mugs, 350 ml.',749,1199,4.6,1520,90,'mug','APPROVED'),
 (3,2,'Brew Pour-Over Kettle','Gooseneck kettle, 1 L, stainless steel.',1899,2499,4.4,644,25,'kettle','APPROVED'),
 (4,2,'Fern Planter Pot','Matte ceramic planter with drainage tray.',599,899,4.3,388,70,'plant','APPROVED'),
 (3,2,'Linen Cushion Cover','Stonewashed linen, 45 × 45 cm, pack of 2.',699,999,4.2,251,100,'cushion','APPROVED'),
 (4,3,'Stride Running Shoes','Lightweight mesh upper, cushioned sole.',2799,4499,4.3,2876,30,'shoe','APPROVED'),
 (3,3,'Canvas Everyday Backpack','Water-resistant, padded 15-inch laptop sleeve.',1599,2499,4.5,1932,45,'backpack','APPROVED'),
 (4,3,'Classic Aviator Sunglasses','Polarised lenses, metal frame.',999,1799,4.0,820,55,'sunglasses','APPROVED'),
 (3,4,'The Quiet Algorithm','A novel about the people behind the code.',399,499,4.7,5120,150,'book','APPROVED'),
 (4,4,'Designing Data Systems','A practical guide to databases and scale.',899,1099,4.8,3301,60,'book2','APPROVED'),
 (3,5,'Botanica Face Serum','Vitamin C serum, 30 ml, fragrance-free.',649,999,4.2,1407,85,'serum','APPROVED'),
 (4,6,'Grip Yoga Mat','6 mm, non-slip, with carry strap.',1199,1799,4.4,1688,50,'yoga','APPROVED'),
 (3,6,'Trail Steel Bottle','Insulated, 750 ml, keeps cold 24 h.',699,1099,4.5,2240,120,'bottle','APPROVED'),
 (4,1,'Orbit Wireless Mouse','Silent clicks, 18-month battery.',599,999,4.3,980,0,'mouse','SOLD_OUT'),
 (3,2,'Ember Scented Candle','Sandalwood and amber, 40 h burn.',499,799,4.1,312,40,'candle','PENDING');

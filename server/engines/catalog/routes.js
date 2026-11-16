/**
 * Catalog read API for the storefront, plus the first E1-guarded write routes for sellers, staff and admin.
 * Browsing is public (like any store). Every write goes through guard(), including the FR-10 ownership check.
 * E2 will take over catalog business logic in Sprint 2; the guards stay exactly as they are.
 */
const express = require('express');
const data = require('../e3-data');
const { guard, requireUser } = require('../e1-access/session');
const typo = require('../e1-search/typo');
const { HttpError, wrap, validator, toInt } = require('../../core/http');

const r = express.Router();

const ownerOfProduct = async (req) => {
  const p = await data.catalog.byId(toInt(req.params.id));
  if (!p) throw new HttpError(404, 'NOT_FOUND', 'Product not found.');
  req.product = p;
  return p.sellerId;
};

/* ---------- public storefront ---------- */
r.get('/catalog/categories', wrap(async (_req, res) => res.json({ categories: await data.catalog.categories() })));

r.get('/catalog/products', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  const category = /^[a-z-]{1,40}$/.test(req.query.category || '') ? req.query.category : null;
  const limit = Math.min(60, Math.max(1, toInt(req.query.limit) || 24));
  let products = await data.catalog.storefront({ q, category, limit });
  let correctedQuery = null;
  if (q && !products.length) {                       // nothing found: let E1 fix the typo and try once more
    correctedQuery = await typo.correct(q);
    if (correctedQuery) products = await data.catalog.storefront({ q: correctedQuery, category, limit });
  }
  res.json({ products, correctedQuery });
}));

r.get('/catalog/products/:id', wrap(async (req, res) => {
  const p = await data.catalog.byId(toInt(req.params.id));
  if (!p || p.status === 'PENDING') throw new HttpError(404, 'NOT_FOUND', 'Product not found.');
  res.json({ product: p });
}));

/* ---------- seller ---------- */
r.get('/seller/products', requireUser, guard('product', 'create'), wrap(async (req, res) => {
  res.json({ products: await data.catalog.bySeller(req.user.id) });
}));

/** FR-10: a seller holds product:update_own only, so this passes for their own rows and is 403 NOT_OWNER otherwise. */
r.patch('/catalog/products/:id', requireUser, guard('product', 'update', ownerOfProduct), wrap(async (req, res) => {
  const price = req.body.price === undefined ? null : Number(req.body.price);
  const stock = req.body.stock === undefined ? null : toInt(req.body.stock);
  validator()
    .check(price === null || (Number.isFinite(price) && price >= 0 && price <= 10000000), 'price', 'must be 0 or more')
    .check(stock === null || (Number.isInteger(stock) && stock >= 0 && stock <= 100000), 'stock', 'must be a whole number, 0 or more')
    .throwIfAny();
  await data.catalog.updatePriceStock(req.product.id, { price, stock });
  res.json({ product: await data.catalog.byId(req.product.id) });
}));

/* ---------- staff / admin ---------- */
r.get('/ops/stock', requireUser, guard('stock', 'read'), wrap(async (_req, res) => res.json({ products: await data.catalog.all() })));

/** Warehouse stock correction: needs stock:update (warehouse staff, admin). Sellers use the PATCH above instead. */
r.patch('/ops/stock/:id', requireUser, guard('stock', 'update'), wrap(async (req, res) => {
  const id = toInt(req.params.id);
  const stock = toInt(req.body.stock);
  validator().check(Number.isInteger(stock) && stock >= 0 && stock <= 100000, 'stock', 'must be a whole number, 0 or more').throwIfAny();
  if (!(await data.catalog.byId(id))) throw new HttpError(404, 'NOT_FOUND', 'Product not found.');
  await data.catalog.updatePriceStock(id, { price: null, stock });
  res.json({ product: await data.catalog.byId(id) });
}));

r.put('/catalog/products/:id/approve', requireUser, guard('product', 'approve'), wrap(async (req, res) => {
  await data.catalog.approve(toInt(req.params.id));
  res.json({ product: await data.catalog.byId(toInt(req.params.id)) });
}));

module.exports = r;

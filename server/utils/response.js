export const ok = (res, data = {}, message = 'Operation successful', status = 200) =>
  res.status(status).json({ success: true, message, data });

export const created = (res, data = {}, message = 'Created successfully') => ok(res, data, message, 201);

export const paginated = (res, { items, page, limit, total }, message = 'Operation successful') =>
  ok(res, { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } }, message);

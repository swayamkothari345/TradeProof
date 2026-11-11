export function success(res, data = {}, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function created(res, data = {}, message = 'Created') {
  return res.status(201).json({ success: true, message, data });
}

export function paginated(res, data, meta) {
  return res.status(200).json({ success: true, data, meta });
}

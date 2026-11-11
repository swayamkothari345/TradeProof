import * as journalService from '../services/journal.service.js';
import { success, created } from '../utils/response.js';

export async function getEntries(req, res, next) {
  try {
    const data = await journalService.getEntries(req.user.id, req.query);
    return success(res, data);
  } catch (err) { next(err); }
}

export async function getEntry(req, res, next) {
  try {
    const entry = await journalService.getEntry(req.user.id, req.params.id);
    return success(res, entry);
  } catch (err) { next(err); }
}

export async function createEntry(req, res, next) {
  try {
    const entry = await journalService.createEntry(req.user.id, req.body);
    return created(res, entry, 'Journal entry created.');
  } catch (err) { next(err); }
}

export async function updateEntry(req, res, next) {
  try {
    const entry = await journalService.updateEntry(req.user.id, req.params.id, req.body);
    return success(res, entry, 'Journal entry updated.');
  } catch (err) { next(err); }
}

export async function deleteEntry(req, res, next) {
  try {
    await journalService.deleteEntry(req.user.id, req.params.id);
    return success(res, {}, 'Journal entry deleted.');
  } catch (err) { next(err); }
}

export async function getStats(req, res, next) {
  try {
    const stats = await journalService.getJournalStats(req.user.id);
    return success(res, stats);
  } catch (err) { next(err); }
}

export async function exportCsv(req, res, next) {
  try {
    const csv = await journalService.exportCsv(req.user.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="trading-journal.csv"');
    return res.send(csv);
  } catch (err) { next(err); }
}

export async function getStrategies(req, res, next) {
  try {
    const strategies = await journalService.getStrategies(req.user.id);
    return success(res, strategies);
  } catch (err) { next(err); }
}

export async function createStrategy(req, res, next) {
  try {
    const strategy = await journalService.createStrategy(req.user.id, req.body);
    return created(res, strategy, 'Strategy created.');
  } catch (err) { next(err); }
}

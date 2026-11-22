import * as svc from '../services/aicoach.service.js';
import { success } from '../utils/response.js';

export async function generate(req, res, next) {
  try {
    const analysis = await svc.generateAnalysis(req.user.id);
    return success(res, analysis, 'Analysis generated.');
  } catch (err) { next(err); }
}

export async function getLatest(req, res, next) {
  try {
    const analysis = await svc.getLatestAnalysis(req.user.id);
    return success(res, analysis);
  } catch (err) { next(err); }
}

export async function ask(req, res, next) {
  try {
    const { question } = req.body;
    const result = await svc.askQuestion(req.user.id, question);
    return success(res, result);
  } catch (err) { next(err); }
}

// ─── Conversation handlers ────────────────────────────────────────────────────

export async function listConversations(req, res, next) {
  try {
    const convs = await svc.listConversations(req.user.id);
    return success(res, convs);
  } catch (err) { next(err); }
}

export async function createConversation(req, res, next) {
  try {
    const { title } = req.body;
    const conv = await svc.createConversation(req.user.id, title);
    return success(res, conv, 'Conversation created.', 201);
  } catch (err) { next(err); }
}

export async function getConversation(req, res, next) {
  try {
    const conv = await svc.getConversation(req.user.id, req.params.id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    return success(res, conv);
  } catch (err) { next(err); }
}

export async function updateConversation(req, res, next) {
  try {
    const { title } = req.body;
    const conv = await svc.updateConversationTitle(req.user.id, req.params.id, title);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    return success(res, conv, 'Title updated.');
  } catch (err) { next(err); }
}

export async function deleteConversation(req, res, next) {
  try {
    const ok = await svc.deleteConversation(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    return success(res, null, 'Conversation deleted.');
  } catch (err) { next(err); }
}

export async function sendMessage(req, res, next) {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Message content required.' });
    const msg = await svc.sendMessage(req.user.id, req.params.id, content.trim());
    if (!msg) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    return success(res, msg, 'Message sent.');
  } catch (err) { next(err); }
}

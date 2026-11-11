import * as rulesService from '../services/rules.service.js';
import { success, created } from '../utils/response.js';
import prisma from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';

export async function evaluateEntry(req, res, next) {
  try {
    const findings = await rulesService.evaluateEntryRules(req.user.id, req.params.entryId);
    return success(res, findings, `${findings.length} rule(s) evaluated.`);
  } catch (err) { next(err); }
}

export async function getFindings(req, res, next) {
  try {
    const findings = await rulesService.getFindings(req.user.id, req.query);
    return success(res, findings);
  } catch (err) { next(err); }
}

export async function getCoverage(req, res, next) {
  try {
    const coverage = await rulesService.getCoverage(req.user.id);
    return success(res, coverage);
  } catch (err) { next(err); }
}

export async function submitDispute(req, res, next) {
  try {
    const { reason, evidence } = req.body;
    if (!reason) return next(createError(400, 'Reason is required.'));

    const finding = await prisma.ruleFinding.findFirst({
      where: { id: req.params.findingId, userId: req.user.id },
    });
    if (!finding) return next(createError(404, 'Finding not found.'));

    const existing = await prisma.ruleDispute.findFirst({
      where: { findingId: finding.id, studentId: req.user.id, status: 'OPEN' },
    });
    if (existing) return next(createError(409, 'An open dispute already exists for this finding.'));

    const dispute = await prisma.ruleDispute.create({
      data: {
        findingId: finding.id,
        studentId: req.user.id,
        reason,
        evidence,
      },
    });
    return created(res, dispute, 'Dispute submitted.');
  } catch (err) { next(err); }
}

export async function getDisputes(req, res, next) {
  try {
    const disputes = await prisma.ruleDispute.findMany({
      where: { studentId: req.user.id },
      include: {
        finding: {
          include: { ruleVersion: { include: { rule: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, disputes);
  } catch (err) { next(err); }
}

export async function resolveDispute(req, res, next) {
  try {
    // Mentor resolving student's dispute
    const { status, resolution } = req.body;
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return next(createError(400, 'Status must be ACCEPTED or REJECTED.'));
    }

    const dispute = await prisma.ruleDispute.findUnique({ where: { id: req.params.disputeId } });
    if (!dispute) return next(createError(404, 'Dispute not found.'));
    if (dispute.status !== 'OPEN') return next(createError(409, 'Dispute is already resolved.'));

    const updated = await prisma.ruleDispute.update({
      where: { id: dispute.id },
      data: {
        status,
        resolution,
        mentorId: req.user.id,
        resolvedAt: new Date(),
      },
    });
    return success(res, updated, 'Dispute resolved.');
  } catch (err) { next(err); }
}

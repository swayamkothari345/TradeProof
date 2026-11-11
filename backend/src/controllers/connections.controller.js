import * as connectionsService from '../services/connections.service.js';
import { success, created } from '../utils/response.js';

export async function createInvitation(req, res, next) {
  try {
    const invitation = await connectionsService.createInvitation(req.user.id, req.body);
    return created(res, invitation, 'Invitation created.');
  } catch (err) { next(err); }
}

export async function getInvitations(req, res, next) {
  try {
    const invitations = await connectionsService.getInvitations(req.user.id);
    return success(res, invitations);
  } catch (err) { next(err); }
}

export async function acceptInvitation(req, res, next) {
  try {
    const connection = await connectionsService.acceptInvitation(req.user.id, req.body.code);
    return created(res, connection, 'Successfully joined mentor.');
  } catch (err) { next(err); }
}

export async function getConnections(req, res, next) {
  try {
    const connections = await connectionsService.getConnections(req.user.id, req.user.role);
    return success(res, connections);
  } catch (err) { next(err); }
}

export async function revokeConnection(req, res, next) {
  try {
    const result = await connectionsService.revokeConnection(
      req.user.id, req.user.role, req.params.id
    );
    return success(res, result, 'Connection revoked.');
  } catch (err) { next(err); }
}

export async function getStudentJournal(req, res, next) {
  try {
    const data = await connectionsService.getStudentJournal(
      req.user.id, req.params.studentId, req.query
    );
    return success(res, data);
  } catch (err) { next(err); }
}

export async function getStudentFindings(req, res, next) {
  try {
    const data = await connectionsService.getStudentFindings(req.user.id, req.params.studentId);
    return success(res, data);
  } catch (err) { next(err); }
}

import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { ORG_HEADER_KEY } from '@/org/org.constants';

export type RequestWithOrg = Request & { orgId?: string };

@Injectable()
export class OrgContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithOrg>();
    const headerValue =
      req.headers[ORG_HEADER_KEY] ?? req.headers[ORG_HEADER_KEY.toLowerCase()];
    const orgId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!orgId || typeof orgId !== 'string' || orgId.trim().length === 0) {
      throw new BadRequestException('orgId is required');
    }

    req.orgId = orgId.trim();
    return true;
  }
}

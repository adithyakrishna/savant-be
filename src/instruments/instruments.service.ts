import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthSession } from '@/auth/auth.service';
import { RbacService } from '@/rbac/rbac.service';
import type {
  CreateInstrumentInput,
  InstrumentFilterInput,
  Instrument,
  UpdateInstrumentInput,
} from '@/instruments/instruments.types';
import { InstrumentsRepository } from '@/instruments/instruments.repository';

@Injectable()
export class InstrumentsService {
  constructor(
    private readonly instrumentsRepository: InstrumentsRepository,
    private readonly rbacService: RbacService,
  ) {}

  private async requireAdmin(session: AuthSession) {
    await this.rbacService.requireRole(session, ['SUPER_ADMIN', 'ADMIN']);
  }

  async listAll(
    session: AuthSession,
    filter: InstrumentFilterInput,
    orgId: string,
  ) {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }
    return this.instrumentsRepository.findAll(filter, orgId);
  }

  async getOne(session: AuthSession, id: string, orgId: string) {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }
    const instrument = await this.instrumentsRepository.findById(id, orgId);
    if (!instrument || instrument.isDeleted) {
      throw new NotFoundException(`Instrument ${id} not found`);
    }
    return instrument;
  }

  async createOne(
    session: AuthSession,
    payload: CreateInstrumentInput,
    orgId: string,
  ) {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }
    return this.instrumentsRepository.create(payload, orgId);
  }

  async updateOne(
    session: AuthSession,
    id: string,
    payload: UpdateInstrumentInput,
    orgId: string,
  ) {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }
    const updated = await this.instrumentsRepository.update(id, orgId, payload);
    if (!updated) {
      throw new NotFoundException(`Instrument ${id} not found`);
    }
    return updated;
  }

  async deleteOne(
    session: AuthSession,
    id: string,
    hardDelete: boolean,
    orgId: string,
  ) {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }
    const removed = hardDelete
      ? await this.instrumentsRepository.hardDelete(id, orgId)
      : await this.instrumentsRepository.softDelete(id, orgId);

    if (!removed) {
      throw new NotFoundException(`Instrument ${id} not found`);
    }

    return { removed: true, hardDelete };
  }

  async restoreOne(session: AuthSession, id: string, orgId: string) {
    await this.requireAdmin(session);
    if (!orgId) {
      throw new BadRequestException('orgId is required');
    }
    const restored = await this.instrumentsRepository.restore(id, orgId);
    if (!restored) {
      throw new NotFoundException(`Instrument ${id} not found`);
    }
    return { restored: true };
  }
}

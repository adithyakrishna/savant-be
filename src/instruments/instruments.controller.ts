import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AuthSession } from '@/auth/auth.service';
import { ORG_HEADER_KEY } from '@/org/org.constants';
import { OrgContextGuard, RequestWithOrg } from '@/org/org.guard';
import { RequireRoles } from '@/rbac/rbac.decorators';
import { RolesGuard, VerifiedUserGuard } from '@/rbac/rbac.guard';
import {
  createInstrumentSchema,
  instrumentFilterSchema,
  updateInstrumentSchema,
} from '@/instruments/instruments.types';
import type {
  CreateInstrumentInput,
  InstrumentFilterInput,
  UpdateInstrumentInput,
} from '@/instruments/instruments.types';
import { InstrumentsService } from '@/instruments/instruments.service';

type RequestWithSession = Request & { authSession?: AuthSession };

type RequestWithOrgContext = RequestWithSession & RequestWithOrg;

@ApiTags('Instruments')
@ApiBearerAuth()
@ApiHeader({ name: ORG_HEADER_KEY, required: true, example: 'ORG-0' })
@Controller('instruments')
@UseGuards(VerifiedUserGuard, RolesGuard, OrgContextGuard)
@RequireRoles(['SUPER_ADMIN', 'ADMIN'])
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List instruments' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    description: 'Include soft-deleted instruments',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name',
  })
  listInstruments(
    @Req() req: Request,
    @Query(new ZodValidationPipe(instrumentFilterSchema))
    query: InstrumentFilterInput,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.instrumentsService.listAll(session, query, orgId);
  }

  @Get(':instrumentId')
  @ApiOperation({ summary: 'Get an instrument' })
  @ApiParam({ name: 'instrumentId', description: 'Instrument ID' })
  getInstrument(
    @Req() req: Request,
    @Param('instrumentId') instrumentId: string,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.instrumentsService.getOne(session, instrumentId, orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an instrument' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Piano' },
        description: { type: 'string', example: 'Grand piano' },
      },
    },
  })
  createInstrument(
    @Req() req: Request,
    @Body(new ZodValidationPipe(createInstrumentSchema))
    body: CreateInstrumentInput,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.instrumentsService.createOne(session, body, orgId);
  }

  @Patch(':instrumentId')
  @ApiOperation({ summary: 'Update an instrument' })
  @ApiParam({ name: 'instrumentId', description: 'Instrument ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Piano' },
        description: { type: 'string', example: 'Grand piano' },
      },
    },
  })
  updateInstrument(
    @Req() req: Request,
    @Param('instrumentId') instrumentId: string,
    @Body(new ZodValidationPipe(updateInstrumentSchema))
    body: UpdateInstrumentInput,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.instrumentsService.updateOne(
      session,
      instrumentId,
      body,
      orgId,
    );
  }

  @Delete(':instrumentId')
  @ApiOperation({ summary: 'Delete an instrument' })
  @ApiParam({ name: 'instrumentId', description: 'Instrument ID' })
  @ApiQuery({
    name: 'hard',
    required: false,
    description: 'Use hard delete instead of soft delete',
  })
  deleteInstrument(
    @Req() req: Request,
    @Param('instrumentId') instrumentId: string,
    @Query('hard') hard?: string,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.instrumentsService.deleteOne(
      session,
      instrumentId,
      hard === 'true',
      orgId,
    );
  }

  @Post(':instrumentId/restore')
  @ApiOperation({ summary: 'Restore an instrument' })
  @ApiParam({ name: 'instrumentId', description: 'Instrument ID' })
  restoreInstrument(
    @Req() req: Request,
    @Param('instrumentId') instrumentId: string,
  ) {
    const session = (req as RequestWithSession).authSession ?? null;
    const orgId = (req as RequestWithOrgContext).orgId ?? '';
    return this.instrumentsService.restoreOne(session, instrumentId, orgId);
  }
}

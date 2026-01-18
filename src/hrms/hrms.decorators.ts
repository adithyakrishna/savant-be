import { SetMetadata } from '@nestjs/common';

export const HRMS_ALLOW_SELF_KEY = 'hrms:allowSelf';

export const HrmsAllowSelf = () => SetMetadata(HRMS_ALLOW_SELF_KEY, true);

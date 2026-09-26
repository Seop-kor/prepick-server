import { BadRequestException } from '@nestjs/common';

const MAX_ID = 2147483647;

export function isValidId(id: number): boolean {
  return Number.isInteger(id) && id > 0 && id <= MAX_ID;
}

export function validateId(id: string): number {
  if (!/^[1-9]\d*$/.test(id) || !isValidId(Number(id))) {
    throw new BadRequestException('Invalid id');
  }
  return Number(id);
}

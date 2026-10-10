import { BadRequestException } from '@nestjs/common';

export function validateLocation(
  latitude?: number | null,
  longitude?: number | null,
  required = false,
): { latitude: number; longitude: number } | null {
  if (latitude == null && longitude == null && !required) return null;
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new BadRequestException('Invalid location');
  }
  return { latitude, longitude };
}

export function validateRadius(radiusKm = 5): number {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 50) {
    throw new BadRequestException(
      'radiusKm must be greater than 0 and at most 50',
    );
  }
  return radiusKm;
}

export function validateKeyword(keyword: string): string {
  const normalized = keyword.trim();
  if (normalized.length < 1 || normalized.length > 100) {
    throw new BadRequestException('Invalid keyword');
  }
  return normalized;
}

export function escapeLike(keyword: string): string {
  return keyword.replace(/([#%_])/g, '#$1');
}

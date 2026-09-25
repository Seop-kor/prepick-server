import { randomUUID } from 'node:crypto';

export class Sku {
  id = randomUUID();
  productId!: string;
  name!: string;
  price!: number;
  isActive = true;
}

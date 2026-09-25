import { randomUUID } from 'node:crypto';

export class Product {
  id = randomUUID();
  storeId!: string;
  name!: string;
  isActive = true;
}

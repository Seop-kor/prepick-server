export class Product {
  id!: number;
  storeId!: number;
  name!: string;
  description: string | null = null;
  imageUrl: string | null = null;
  isActive = true;
}
